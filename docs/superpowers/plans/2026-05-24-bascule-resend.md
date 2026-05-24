# Bascule SMTP → Resend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer toute la couche SMTP livrée le 2026-05-23 (chiffrement AES, 7 colonnes mail_settings, JavaMailSender) par une intégration HTTP Resend basée sur une seule env var `RESEND_API_KEY`. Démonter `SecretCipher`/`APP_SECRETS_KEY` (qui crashent actuellement Railway) et simplifier l'admin UI à 2 champs (`from`/`to`).

**Architecture :** Nouvelle classe `ResendMailService` qui encapsule le client `com.resend.Resend`, instanciée au boot depuis l'env var. `MailSettingsService` shrink à get/save/sendTest. `ContactRequestService` bascule sur `ResendMailService` pour l'envoi. Migration 017 drop 5 colonnes obsolètes. Admin Angular passe de 7 champs à 2.

**Tech Stack :** Spring Boot 4, Java 25, Liquibase, JPA, `com.resend:resend-java:4.0.0`, Angular 21 signals.

**Référence spec :** `docs/superpowers/specs/2026-05-24-bascule-resend-design.md` (commit `e55ae15`).

---

## File structure

**Backend — création**

| Fichier | Rôle |
|---|---|
| `backend/src/main/java/com/atelier/portfolio/service/ResendMailService.java` | Wrapper Spring autour du client Resend, mode dégradé sans clé |
| `backend/src/test/java/com/atelier/portfolio/service/ResendMailServiceTest.java` | 4 tests : degraded mode, isConfigured, send success, send exception |
| `backend/src/main/resources/db/changelog/changes/017-drop-smtp-columns-from-mail-settings.yaml` | Migration DROP 5 colonnes |
| `docs/adr/0014-bascule-vers-resend.md` | ADR Accepted, supersede 0013 |

**Backend — modification**

| Fichier | Changement |
|---|---|
| `backend/pom.xml` | retirer `spring-boot-starter-mail`, ajouter `com.resend:resend-java:4.0.0` |
| `backend/src/main/resources/application.properties` | retirer `app.secrets.key`, ajouter `app.resend.api-key=${RESEND_API_KEY:}` |
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | inclure `017-drop-smtp-columns-from-mail-settings.yaml` |
| `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java` | retirer 5 champs + getters/setters (host, port, username, passwordEncrypted, encryption) |
| `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java` | nouveau shape : fromAddress, toAddress, apiKeyConfigured, updatedAt |
| `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java` | nouveau shape : fromAddress, toAddress uniquement |
| `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java` | shrink majeur, accepter `ResendMailService` au constructeur, retirer buildSender/getConfigSnapshot, refondre sendTest |
| `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java` | accepter `ResendMailService` au constructeur, appeler `send(...)` au lieu de `buildSender()` |
| `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java` | rewrite : 6 tests sur le nouveau shape |
| `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java` | adapter aux nouveaux DTOs |
| `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java` | rewrite : mock `ResendMailService` |
| `backend/README.md` | retirer `APP_SECRETS_KEY`, ajouter `RESEND_API_KEY` |
| `docs/adr/0013-config-smtp-en-base-chiffree.md` | ajouter `Superseded by ADR-0014` |
| `docs/adr/README.md` | ajouter ligne 0014 + marquer 0013 superseded |
| `deploy/README.md` | section secrets : ajouter `RESEND_API_KEY` |
| `docker-compose.yml` (racine) | retirer `APP_SECRETS_KEY`, ajouter `RESEND_API_KEY: "${RESEND_API_KEY:-}"` |
| `deploy/base/docker-compose.yml` | ajouter `RESEND_API_KEY: ${RESEND_API_KEY}` au bloc env du service backend |
| `deploy/envs/local/.env` | retirer `APP_SECRETS_KEY` si présent, ajouter `RESEND_API_KEY=` |

**Backend — suppression**

| Fichier | Raison |
|---|---|
| `backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java` | Plus rien à chiffrer |
| `backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java` | Plus de cible |

**Frontend — modification**

| Fichier | Changement |
|---|---|
| `frontend/src/app/models/mail-settings.model.ts` | nouveaux types : MailEncryption supprimé, MailSettingsView/Input réduits |
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts` | shrink ~230 → ~110 lignes (2 champs + indicateur apiKeyConfigured) |
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts` | rewrite : 6 tests sur le nouveau shape |

---

## Task 1 : Setup — dépendance Resend + property Spring

**Files:**
- Modify: `backend/pom.xml` (ajouter dep Resend ; on retire `spring-boot-starter-mail` plus tard en Task 10)
- Modify: `backend/src/main/resources/application.properties`

### Step 1.1 : Ajouter `com.resend:resend-java` dans `pom.xml`

- [ ] Ouvrir `backend/pom.xml`. Repérer le bloc `<dependency>` pour `spring-boot-starter-mail` (lignes 67-69). Juste après ce bloc fermant, ajouter :

```xml
        <dependency>
            <groupId>com.resend</groupId>
            <artifactId>resend-java</artifactId>
            <version>4.0.0</version>
        </dependency>
```

NB : si Maven Central refuse `4.0.0`, l'implementer vérifie la dernière version stable de `com.resend:resend-java` (les 4.x sont compatibles avec le code ci-dessous tant que `Resend`, `CreateEmailOptions.builder()`, `client.emails().send(opts)` et `ResendException` existent dans le package `com.resend`). Bump la version au besoin et continue.

### Step 1.2 : Ajouter la property Spring pour la clé API

- [ ] Ouvrir `backend/src/main/resources/application.properties`. Repérer la dernière ligne `app.secrets.key=${APP_SECRETS_KEY:}` (ligne 50). Juste après cette ligne, ajouter :

```properties

# Resend transactional mail
app.resend.api-key=${RESEND_API_KEY:}
```

(On retire `app.secrets.key` en Task 9.)

### Step 1.3 : Vérifier que la compilation passe

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -DskipTests compile
```

Attendu : `BUILD SUCCESS`. La dépendance Resend est récupérée depuis Maven Central et compile sans casser le code existant (qui n'utilise pas encore Resend).

### Step 1.4 : Commit

- [ ] Git

```powershell
git add backend/pom.xml backend/src/main/resources/application.properties
git commit -m "chore(deps): ajouter com.resend:resend-java et property app.resend.api-key"
```

---

## Task 2 : `ResendMailService` (TDD)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/service/ResendMailService.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/ResendMailServiceTest.java`

TDD strict : on écrit le test avant l'implémentation. Le constructeur en mode dégradé est testable directement ; les chemins succès / erreur de `send()` sont testés en injectant un client `Resend` mocké via un constructeur package-private supplémentaire.

### Step 2.1 : Écrire le test d'échec

- [ ] Créer `backend/src/test/java/com/atelier/portfolio/service/ResendMailServiceTest.java`

```java
package com.atelier.portfolio.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResendMailServiceTest {

    @Mock private Resend resendClient;
    @Mock private Emails emails;

    @Test
    void blankApiKey_putsServiceInDegradedMode() {
        ResendMailService svc = new ResendMailService("");

        assertFalse(svc.isConfigured());
        assertFalse(svc.send("from@x", "to@x", "reply@x", "s", "b"),
                "degraded send() must return false without touching network");
    }

    @Test
    void nullApiKey_putsServiceInDegradedMode() {
        ResendMailService svc = new ResendMailService(null);

        assertFalse(svc.isConfigured());
        assertFalse(svc.send("from@x", "to@x", "reply@x", "s", "b"));
    }

    @Test
    void send_successfulCall_returnsTrue() throws Exception {
        when(resendClient.emails()).thenReturn(emails);
        when(emails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse("email_123"));
        ResendMailService svc = new ResendMailService(resendClient);

        boolean ok = svc.send("from@x", "to@x", "reply@x", "subject", "body");

        assertTrue(ok);
        assertTrue(svc.isConfigured());
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void send_resendException_returnsFalseAndDoesNotPropagate() throws Exception {
        when(resendClient.emails()).thenReturn(emails);
        when(emails.send(any(CreateEmailOptions.class)))
                .thenThrow(new ResendException("invalid from address"));
        ResendMailService svc = new ResendMailService(resendClient);

        boolean ok = svc.send("from@x", "to@x", "reply@x", "subject", "body");

        assertFalse(ok);
    }
}
```

### Step 2.2 : Vérifier que ça ne compile pas

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=ResendMailServiceTest test
```

Attendu : compile error — `ResendMailService` n'existe pas. Aussi les types Resend devraient maintenant être résolus (dépendance ajoutée en Task 1).

### Step 2.3 : Implémenter `ResendMailService`

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/service/ResendMailService.java`

```java
package com.atelier.portfolio.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResendMailService {

    private static final Logger log = LoggerFactory.getLogger(ResendMailService.class);

    private final Resend client;
    private final boolean degraded;

    /** Constructeur de production : reçoit la clé API depuis Spring. */
    public ResendMailService(@Value("${app.resend.api-key:}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("RESEND_API_KEY not set — Resend in degraded mode, no email will be sent");
            this.client = null;
            this.degraded = true;
            return;
        }
        this.client = new Resend(apiKey);
        this.degraded = false;
    }

    /** Constructeur visible-package pour les tests : injection directe du client mocké. */
    ResendMailService(Resend client) {
        this.client = client;
        this.degraded = false;
    }

    public boolean isConfigured() {
        return !degraded;
    }

    /**
     * Envoie un mail via Resend. Renvoie true si Resend a accepté le message,
     * false sinon (mode dégradé OU exception). Ne propage jamais.
     */
    public boolean send(String from, String to, String replyTo, String subject, String body) {
        if (degraded) return false;
        try {
            CreateEmailOptions opts = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .replyTo(replyTo)
                    .subject(subject)
                    .text(body)
                    .build();
            client.emails().send(opts);
            return true;
        } catch (ResendException ex) {
            log.warn("Resend send failed: {}", ex.getMessage());
            return false;
        }
    }
}
```

### Step 2.4 : Faire passer les 4 tests

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=ResendMailServiceTest test
```

Attendu : `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0` + une ligne WARN dans les logs des deux tests "degraded mode" (le log warn du constructeur s'exécute).

Si `ResendException` a un constructeur différent dans la version SDK installée (par ex. prend un `int statusCode` aussi), adapter l'appel dans le test (`new ResendException(400, "invalid from")` ou similaire).

### Step 2.5 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/service/ResendMailService.java backend/src/test/java/com/atelier/portfolio/service/ResendMailServiceTest.java
git commit -m "feat(mail): ResendMailService avec mode degrade et injection client mockable"
```

---

## Task 3 : Migration Liquibase `017-drop-smtp-columns`

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/017-drop-smtp-columns-from-mail-settings.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

### Step 3.1 : Créer la migration

- [ ] Créer `backend/src/main/resources/db/changelog/changes/017-drop-smtp-columns-from-mail-settings.yaml`

```yaml
databaseChangeLog:
  - changeSet:
      id: 017-drop-smtp-columns-from-mail-settings
      author: atelier-lumen
      comment: Bascule vers Resend (ADR-0014) — les colonnes SMTP ne sont plus utilisees.
      changes:
        - dropColumn:
            tableName: mail_settings
            columns:
              - column:
                  name: host
              - column:
                  name: port
              - column:
                  name: username
              - column:
                  name: password_encrypted
              - column:
                  name: encryption
```

### Step 3.2 : Référencer la migration dans le master

- [ ] Ouvrir `backend/src/main/resources/db/changelog/db.changelog-master.yaml`. À la fin du fichier (après l'include de `016-create-mail-settings.yaml`), ajouter :

```yaml
  - include:
      file: changes/017-drop-smtp-columns-from-mail-settings.yaml
      relativeToChangelogFile: true
```

Indentation : 2 espaces avant `- include:`, 6 espaces avant `file:` et `relativeToChangelogFile:`. Match le pattern des 16 includes au-dessus.

### Step 3.3 : Vérifier que les @SpringBootTest démarrent toujours

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=SecurityIntegrationTest test
```

Attendu : `Tests run: 12, Failures: 0, Errors: 0`. Cette suite boote le contexte Spring complet, donc Liquibase applique le changelog (y compris 017) sur H2. Si la migration est mal formée, le context-load échoue ici.

À ce stade, l'entité `MailSettingsEntity` a encore les 5 champs supprimés. Hibernate `ddl-auto=validate` ne plante PAS sur des colonnes en trop côté entité (il ne complète que dans le sens entity-mapped-but-not-in-db). Donc supprimer les colonnes DB avant l'entité est OK.

### Step 3.4 : Commit

- [ ] Git

```powershell
git add backend/src/main/resources/db/changelog/changes/017-drop-smtp-columns-from-mail-settings.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "feat(db): migration 017 — drop colonnes SMTP de mail_settings"
```

---

## Task 4 : Simplifier `MailSettingsEntity` (drop 5 champs)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java`

### Step 4.1 : Remplacer le contenu de l'entité

- [ ] Remplacer **entièrement** `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java` par :

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "mail_settings")
public class MailSettingsEntity {

    public static final String DEFAULT_ID = "default";

    @Id
    @Column(length = 20)
    private String id;

    @Column(name = "from_address", length = 300)
    private String fromAddress;

    @Column(name = "to_address", length = 300)
    private String toAddress;

    @Column(name = "updated_at", nullable = false, length = 50)
    private String updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
```

### Step 4.2 : Vérifier que la compilation casse les anciens appelants (TDD inverse)

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -DskipTests compile
```

Attendu : **compilation échoue** sur `MailSettingsService.java` et `ContactRequestService.java` qui appellent encore `setHost`, `setPort`, `getPasswordEncrypted`, etc. C'est le signal qu'on va refactorer ces deux fichiers ensuite. Pas de commit ici — on commit l'entité avec sa refonte de service en Task 6 pour que le repo soit toujours en état compilable entre commits.

### Step 4.3 : Note

Pas de commit séparé pour cette tâche : Task 6 commitera l'entité + le service ensemble. Garde simplement les modifs en working tree.

---

## Task 5 : Refondre les DTOs `MailSettingsView` et `MailSettingsInput`

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java`

### Step 5.1 : Remplacer `MailSettingsView`

- [ ] Remplacer **entièrement** `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java` par :

```java
package com.atelier.portfolio.model;

public record MailSettingsView(
        String fromAddress,
        String toAddress,
        boolean apiKeyConfigured,
        String updatedAt
) {
}
```

### Step 5.2 : Remplacer `MailSettingsInput`

- [ ] Remplacer **entièrement** `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java` par :

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record MailSettingsInput(
        @Email @Size(max = 300) String fromAddress,
        @Email @Size(max = 300) String toAddress
) {
}
```

Note : le password / encryption / host / port / username sont retirés. Seules les annotations `@Email` et `@Size` restent.

### Step 5.3 : Compilation toujours cassée

À ce stade, la compilation casse toujours sur `MailSettingsService`, `ContactRequestService`, leurs tests, et `AdminMailSettingsControllerTest`. C'est attendu — on les corrige en Task 6 puis Task 7 puis Task 8.

### Step 5.4 : Pas de commit séparé

Garder les modifs en working tree. Task 6 commitera DTOs + service ensemble.

---

## Task 6 : Refondre `MailSettingsService` + son test (TDD)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java`

### Step 6.1 : Réécrire le test du service

- [ ] Remplacer **entièrement** `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailSettingsServiceTest {

    @Mock private MailSettingsRepository repository;
    @Mock private ResendMailService resendMailService;

    private MailSettingsService service;

    @BeforeEach
    void setUp() {
        service = new MailSettingsService(repository, resendMailService);
    }

    private MailSettingsEntity existing() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId("default");
        e.setFromAddress("from@example.com");
        e.setToAddress("to@example.com");
        e.setUpdatedAt("2026-05-24T00:00:00Z");
        return e;
    }

    @Test
    void get_returnsViewWithApiKeyConfiguredTrueWhenServiceIsConfigured() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(resendMailService.isConfigured()).thenReturn(true);

        MailSettingsView v = service.get();

        assertEquals("from@example.com", v.fromAddress());
        assertEquals("to@example.com", v.toAddress());
        assertTrue(v.apiKeyConfigured());
        assertEquals("2026-05-24T00:00:00Z", v.updatedAt());
    }

    @Test
    void get_apiKeyConfiguredFalseWhenServiceIsDegraded() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(resendMailService.isConfigured()).thenReturn(false);

        assertFalse(service.get().apiKeyConfigured());
    }

    @Test
    void save_updatesFromAndToOnly() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(resendMailService.isConfigured()).thenReturn(true);
        MailSettingsInput input = new MailSettingsInput("new-from@example.com", "new-to@example.com");

        MailSettingsView v = service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        MailSettingsEntity saved = captor.getValue();
        assertEquals("new-from@example.com", saved.getFromAddress());
        assertEquals("new-to@example.com", saved.getToAddress());
        assertNotNull(saved.getUpdatedAt());
        assertEquals("new-from@example.com", v.fromAddress());
    }

    @Test
    void sendTest_callsResendWithStoredFromTo() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(resendMailService.isConfigured()).thenReturn(true);
        when(resendMailService.send(
                eq("from@example.com"), eq("to@example.com"), eq("from@example.com"),
                any(), any()
        )).thenReturn(true);

        MailTestResult result = service.sendTest();

        assertTrue(result.success());
        assertNull(result.error());
        verify(resendMailService).send(
                eq("from@example.com"), eq("to@example.com"), eq("from@example.com"),
                any(), any()
        );
    }

    @Test
    void sendTest_returnsIncompleteWhenFromOrToMissing() {
        MailSettingsEntity incomplete = new MailSettingsEntity();
        incomplete.setId("default");
        incomplete.setUpdatedAt("now");
        when(repository.findById("default")).thenReturn(Optional.of(incomplete));
        when(resendMailService.isConfigured()).thenReturn(true);

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertEquals("incomplete", result.error());
        verify(resendMailService, never()).send(any(), any(), any(), any(), any());
    }

    @Test
    void sendTest_returnsIncompleteWhenApiKeyMissing() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(resendMailService.isConfigured()).thenReturn(false);

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertEquals("incomplete", result.error());
        verify(resendMailService, never()).send(any(), any(), any(), any(), any());
    }

    @Test
    void sendTest_returnsFailureWhenResendRejects() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(resendMailService.isConfigured()).thenReturn(true);
        when(resendMailService.send(any(), any(), any(), any(), any())).thenReturn(false);

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertNotEquals("incomplete", result.error(),
                "real rejection must not be reported as 'incomplete' (HTTP 409 mapping)");
    }
}
```

### Step 6.2 : Réécrire le service

- [ ] Remplacer **entièrement** `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class MailSettingsService {

    private static final Logger log = LoggerFactory.getLogger(MailSettingsService.class);

    private final MailSettingsRepository repository;
    private final ResendMailService resendMailService;

    public MailSettingsService(MailSettingsRepository repository,
                               ResendMailService resendMailService) {
        this.repository = repository;
        this.resendMailService = resendMailService;
    }

    @Transactional(readOnly = true)
    public MailSettingsView get() {
        return toView(loadOrInit());
    }

    @Transactional
    public MailSettingsView save(MailSettingsInput input) {
        MailSettingsEntity entity = loadOrInit();
        entity.setFromAddress(blankToNull(input.fromAddress()));
        entity.setToAddress(blankToNull(input.toAddress()));
        entity.setUpdatedAt(Instant.now().toString());
        return toView(repository.save(entity));
    }

    /**
     * Envoie un mail de test via Resend depuis from/to enregistres.
     * Renvoie failure("incomplete") si from, to ou la cle API manquent
     * (le controller mappe ce cas en HTTP 409).
     */
    public MailTestResult sendTest() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null
                || entity.getFromAddress() == null || entity.getFromAddress().isBlank()
                || entity.getToAddress() == null || entity.getToAddress().isBlank()
                || !resendMailService.isConfigured()) {
            return MailTestResult.failure("incomplete");
        }
        String from = entity.getFromAddress();
        String to = entity.getToAddress();
        boolean ok = resendMailService.send(
                from, to, from,
                "Test de configuration mail — Atelier",
                "Mail de test envoyé le " + Instant.now() + "."
        );
        if (ok) {
            return MailTestResult.ok();
        }
        return MailTestResult.failure("Resend a refusé l'envoi (voir logs serveur)");
    }

    private MailSettingsEntity loadOrInit() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID).orElseGet(() -> {
            MailSettingsEntity e = new MailSettingsEntity();
            e.setId(MailSettingsEntity.DEFAULT_ID);
            e.setUpdatedAt(Instant.now().toString());
            return e;
        });
    }

    private MailSettingsView toView(MailSettingsEntity e) {
        return new MailSettingsView(
                e.getFromAddress(),
                e.getToAddress(),
                resendMailService.isConfigured(),
                e.getUpdatedAt()
        );
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
```

### Step 6.3 : Faire passer le test du service

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=MailSettingsServiceTest test
```

Attendu : `Tests run: 7, Failures: 0, Errors: 0` (note : 7 tests dans le test file, pas 6 — j'ai ajouté un cas "real rejection" en plus de "incomplete").

À ce stade, `ContactRequestService` et `ContactRequestServiceTest` ne compilent toujours pas — Task 8 corrige.

### Step 6.4 : Commit (entité + DTOs + service + son test ensemble)

- [ ] Git — on commit Tasks 4+5+6 d'un coup parce que le repo n'était jamais en état compilable entre les trois :

```powershell
git add backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java
git commit -m "refactor(mail): MailSettings shrink — entite/DTOs/service alignes sur Resend"
```

À ce stade le projet ne compile toujours pas (ContactRequestService cassé) — on passe directement à Task 7 puis 8.

---

## Task 7 : Adapter `AdminMailSettingsControllerTest`

**Files:**
- Modify: `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java`

Le contrôleur lui-même (`AdminMailSettingsController.java`) n'a aucun changement — il délègue à `MailSettingsService` dont la signature publique (`get()`, `save()`, `sendTest()`) est inchangée. Seul son test, qui construit des `MailSettingsView` et `MailSettingsInput` avec l'ancien shape, doit être adapté.

### Step 7.1 : Remplacer le test

- [ ] Remplacer **entièrement** `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java` par :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.service.MailSettingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminMailSettingsControllerTest {

    @Mock private MailSettingsService service;
    @InjectMocks private AdminMailSettingsController controller;

    @Test
    void get_returnsServiceView() {
        MailSettingsView view = new MailSettingsView(
                "from@x", "to@x", true, "2026-05-24T00:00:00Z");
        when(service.get()).thenReturn(view);

        MailSettingsView result = controller.get();

        assertSame(view, result);
    }

    @Test
    void put_delegatesToServiceSave() {
        MailSettingsInput input = new MailSettingsInput("f@x", "t@x");
        MailSettingsView view = new MailSettingsView("f@x", "t@x", true, "now");
        when(service.save(any(MailSettingsInput.class))).thenReturn(view);

        MailSettingsView result = controller.put(input);

        verify(service).save(input);
        assertSame(view, result);
    }

    @Test
    void test_success_returns200WithResult() {
        when(service.sendTest()).thenReturn(MailTestResult.ok());

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(200, resp.getStatusCode().value());
        assertTrue(resp.getBody().success());
    }

    @Test
    void test_incompleteConfig_returns409() {
        when(service.sendTest()).thenReturn(MailTestResult.failure("incomplete"));

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(409, resp.getStatusCode().value());
        assertFalse(resp.getBody().success());
    }

    @Test
    void test_resendFailure_returns200WithErrorBody() {
        when(service.sendTest()).thenReturn(MailTestResult.failure("Resend a refusé l'envoi"));

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(200, resp.getStatusCode().value());
        assertFalse(resp.getBody().success());
        assertTrue(resp.getBody().error().contains("Resend"));
    }
}
```

### Step 7.2 : Faire passer le test

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=AdminMailSettingsControllerTest test
```

Attendu : `Tests run: 5, Failures: 0`. Le contrôleur compile car ses dépendances DTO et service ont les nouveaux shapes (Tasks 4-6).

### Step 7.3 : Pas de commit séparé

Garder les modifs en working tree. Task 8 commitera ContactRequestService + son test + ce test contrôleur ensemble pour traverser le no-compile gap.

---

## Task 8 : Refondre `ContactRequestService` + son test (TDD)

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java`

### Step 8.1 : Réécrire le test

- [ ] Remplacer **entièrement** `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock private ContactRequestRepository repository;
    @Mock private MailSettingsService mailSettingsService;
    @Mock private ResendMailService resendMailService;

    private ContactRequestService service;

    @BeforeEach
    void setUp() {
        when(repository.save(any(ContactRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new ContactRequestService(repository, mailSettingsService, resendMailService);
    }

    private ContactRequestInput sampleInput() {
        return new ContactRequestInput(
                "Jean Test", "jean@example.com", "0600000000",
                "acquisition", "Bonjour, je suis intéressé.",
                "f-001", "onde", "Onde"
        );
    }

    private MailSettingsView configuredView() {
        return new MailSettingsView(
                "no-reply@studio.fr", "studio@example.com",
                true, "now"
        );
    }

    @Test
    void testSubmit_PersistsTrimmedFields() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(resendMailService.send(any(), any(), any(), any(), any())).thenReturn(true);
        ContactRequestInput input = new ContactRequestInput(
                "  Jean  ", "  jean@example.com ", "  ", "acquisition",
                "  Hello world  ", "", "", ""
        );

        service.submit(input);

        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        ContactRequestEntity saved = captor.getValue();
        assertEquals("Jean", saved.getName());
        assertEquals("jean@example.com", saved.getEmail());
        assertNull(saved.getPhone());
        assertEquals("Hello world", saved.getMessage());
        assertEquals("NEW", saved.getStatus());
        assertTrue(saved.getId().startsWith("c-"));
    }

    @Test
    void testSubmit_ApiKeyNotConfigured_SkipsDelivery() {
        MailSettingsView noKey = new MailSettingsView(
                "no-reply@studio.fr", "studio@example.com",
                false, "now"
        );
        when(mailSettingsService.get()).thenReturn(noKey);

        service.submit(sampleInput());

        verify(resendMailService, never()).send(any(), any(), any(), any(), any());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_NoFromOrTo_SkipsDelivery() {
        MailSettingsView noTo = new MailSettingsView(
                "no-reply@studio.fr", null,
                true, "now"
        );
        when(mailSettingsService.get()).thenReturn(noTo);

        service.submit(sampleInput());

        verify(resendMailService, never()).send(any(), any(), any(), any(), any());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailConfigured_SendsViaResendAndMarksMailSent() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(resendMailService.send(any(), any(), any(), any(), any())).thenReturn(true);

        service.submit(sampleInput());

        verify(resendMailService).send(
                eq("no-reply@studio.fr"),
                eq("studio@example.com"),
                eq("jean@example.com"),
                argThat(s -> s.contains("Acquisition") && s.contains("Onde")),
                argThat(b -> b.contains("Jean Test") && b.contains("/mobilier/onde"))
        );
        ArgumentCaptor<ContactRequestEntity> entityCaptor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isMailSent());
    }

    @Test
    void testSubmit_ResendReturnsFalse_KeepsRecordWithMailSentFalse() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(resendMailService.send(any(), any(), any(), any(), any())).thenReturn(false);

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_PressInterest_UsesPressLabelInSubject() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(resendMailService.send(any(), any(), any(), any(), any())).thenReturn(true);
        ContactRequestInput input = new ContactRequestInput(
                "Reporter", "r@p.fr", null, "press",
                "Demande presse.", null, null, null
        );

        service.submit(input);

        verify(resendMailService).send(
                any(), any(), any(),
                argThat(s -> s.contains("Presse")),
                any()
        );
    }
}
```

### Step 8.2 : Réécrire le service

- [ ] Remplacer **entièrement** `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ContactRequestService {

    private static final Logger log = LoggerFactory.getLogger(ContactRequestService.class);

    private final ContactRequestRepository repository;
    private final MailSettingsService mailSettingsService;
    private final ResendMailService resendMailService;

    public ContactRequestService(ContactRequestRepository repository,
                                 MailSettingsService mailSettingsService,
                                 ResendMailService resendMailService) {
        this.repository = repository;
        this.mailSettingsService = mailSettingsService;
        this.resendMailService = resendMailService;
    }

    @Transactional
    public ContactRequestAck submit(ContactRequestInput input) {
        ContactRequestEntity entity = new ContactRequestEntity();
        entity.setId("c-" + UUID.randomUUID().toString().substring(0, 12));
        entity.setCreatedAt(Instant.now().toString());
        entity.setName(input.name().trim());
        entity.setEmail(input.email().trim());
        entity.setPhone(blankToNull(input.phone()));
        entity.setInterest(input.interest());
        entity.setMessage(input.message().trim());
        entity.setFurnitureId(blankToNull(input.furnitureId()));
        entity.setFurnitureSlug(blankToNull(input.furnitureSlug()));
        entity.setFurnitureTitle(blankToNull(input.furnitureTitle()));
        entity.setStatus("NEW");
        entity.setMailSent(tryDeliver(entity));
        ContactRequestEntity saved = repository.save(entity);
        return new ContactRequestAck(saved.getId(), saved.getCreatedAt(), saved.getStatus());
    }

    private boolean tryDeliver(ContactRequestEntity req) {
        MailSettingsView cfg = mailSettingsService.get();
        if (!cfg.apiKeyConfigured()) {
            log.info("Mail delivery skipped (RESEND_API_KEY missing) — contact request {} stored only", req.getId());
            return false;
        }
        if (cfg.fromAddress() == null || cfg.fromAddress().isBlank()
                || cfg.toAddress() == null || cfg.toAddress().isBlank()) {
            log.info("Mail delivery skipped (from/to missing) — contact request {} stored only", req.getId());
            return false;
        }
        return resendMailService.send(
                cfg.fromAddress(),
                cfg.toAddress(),
                req.getEmail(),
                buildSubject(req),
                buildBody(req)
        );
    }

    private static String buildSubject(ContactRequestEntity req) {
        String label = interestLabel(req.getInterest());
        if (req.getFurnitureTitle() != null && !req.getFurnitureTitle().isBlank()) {
            return "[Contact · " + label + "] " + req.getFurnitureTitle();
        }
        return "[Contact · " + label + "] " + req.getName();
    }

    private static String buildBody(ContactRequestEntity req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Nouvelle demande depuis le site\n");
        sb.append("--------------------------------\n\n");
        sb.append("Nom        : ").append(req.getName()).append('\n');
        sb.append("Email      : ").append(req.getEmail()).append('\n');
        if (req.getPhone() != null) sb.append("Téléphone  : ").append(req.getPhone()).append('\n');
        sb.append("Intérêt    : ").append(interestLabel(req.getInterest())).append('\n');
        if (req.getFurnitureTitle() != null) {
            sb.append("Pièce      : ").append(req.getFurnitureTitle());
            if (req.getFurnitureSlug() != null) sb.append(" (/mobilier/").append(req.getFurnitureSlug()).append(')');
            sb.append('\n');
        }
        sb.append("\nMessage\n-------\n").append(req.getMessage()).append('\n');
        return sb.toString();
    }

    private static String interestLabel(String key) {
        return switch (key) {
            case "acquisition" -> "Acquisition";
            case "order" -> "Commande spéciale";
            case "press" -> "Presse";
            default -> "Autre";
        };
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
```

### Step 8.3 : Faire passer toute la suite backend

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : la suite complète passe. Le projet redevient compilable. Compter notamment :
- `MailSettingsServiceTest` : 7 OK
- `ContactRequestServiceTest` : 6 OK
- `AdminMailSettingsControllerTest` : 5 OK
- `ResendMailServiceTest` : 4 OK
- `SecurityIntegrationTest` : 12 OK (le contexte Spring boote avec ResendMailService en mode dégradé en test)
- Toutes les autres suites : inchangées.

Si une autre suite plante, suivre la trace : un test ailleurs pourrait avoir injecté `JavaMailSender` ou référencé `SecretCipher` indirectement.

### Step 8.4 : Commit (controller test + contact + son test)

- [ ] Git :

```powershell
git add backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java
git commit -m "refactor(contact): basculer ContactRequestService sur ResendMailService"
```

À ce stade, `SecretCipher` est mort (plus aucun appelant) mais encore présent dans le repo. Task 9 le supprime.

---

## Task 9 : Supprimer `SecretCipher` + property + `APP_SECRETS_KEY` docker

**Files:**
- Delete: `backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java`
- Delete: `backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java`
- Modify: `backend/src/main/resources/application.properties` (retirer `app.secrets.key`)
- Modify: `docker-compose.yml` (racine, retirer `APP_SECRETS_KEY`)

### Step 9.1 : Supprimer la classe et son test

- [ ] Run

```powershell
git rm backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java
```

### Step 9.2 : Retirer la property dans `application.properties`

- [ ] Ouvrir `backend/src/main/resources/application.properties`. Supprimer les 3 dernières lignes (qui contiennent le commentaire + `app.secrets.key=${APP_SECRETS_KEY:}` + la ligne vide qui la précède). Le fichier doit se terminer maintenant sur :

```properties
# Resend transactional mail
app.resend.api-key=${RESEND_API_KEY:}
```

### Step 9.3 : Retirer `APP_SECRETS_KEY` du docker-compose racine

- [ ] Ouvrir `docker-compose.yml`. Repérer le bloc backend > environment. Supprimer les 2 lignes :

```yaml
      # AES-256 base64 32 bytes — dev only, override in prod (voir ADR-0013).
      APP_SECRETS_KEY: "${APP_SECRETS_KEY:-AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=}"
```

(Task 12 ajoutera `RESEND_API_KEY` à la place. Pour l'instant, on commit juste la suppression.)

### Step 9.4 : Vérifier que tout compile et que tous les tests passent

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tout vert, aucun `SecretCipherTest` dans le résultat (la classe est partie). Aucune référence orpheline.

### Step 9.5 : Commit

- [ ] Git

```powershell
git add backend/src/main/resources/application.properties docker-compose.yml
git commit -m "chore(security): supprimer SecretCipher et APP_SECRETS_KEY (remplaces par Resend)"
```

---

## Task 10 : Retirer `spring-boot-starter-mail`

**Files:**
- Modify: `backend/pom.xml`

### Step 10.1 : Supprimer la dépendance

- [ ] Ouvrir `backend/pom.xml`. Repérer le bloc :

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
```

Le supprimer en entier (4 lignes, lignes 66-69 dans la version courante).

### Step 10.2 : Vérifier que rien ne casse

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : la suite complète passe. Plus aucun import `org.springframework.mail.*` ne doit subsister (le projet ne compilerait pas). Si une trace mentionne `JavaMailSender` ou `SimpleMailMessage`, c'est qu'un fichier oublié les utilise encore — chercher avec :

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test sh -c "grep -r 'org.springframework.mail' /workspace/src || echo 'aucune référence'"
```

### Step 10.3 : Commit

- [ ] Git

```powershell
git add backend/pom.xml
git commit -m "chore(deps): retirer spring-boot-starter-mail (remplace par Resend)"
```

---

## Task 11 : Frontend — modèle + composant + spec

**Files:**
- Modify: `frontend/src/app/models/mail-settings.model.ts`
- Modify: `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts`
- Modify: `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts`

### Step 11.1 : Remplacer le modèle TypeScript

- [ ] Remplacer **entièrement** `frontend/src/app/models/mail-settings.model.ts` par :

```typescript
export interface MailSettingsView {
  fromAddress: string | null;
  toAddress: string | null;
  apiKeyConfigured: boolean;
  updatedAt: string;
}

export interface MailSettingsInput {
  fromAddress: string | null;
  toAddress: string | null;
}

export interface MailTestResult {
  success: boolean;
  error: string | null;
}
```

(`MailEncryption` est supprimé. `MailSettingsView.hasPassword` et tous les champs SMTP partent.)

### Step 11.2 : Réécrire le composant Angular

- [ ] Remplacer **entièrement** `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts` par :

```typescript
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import {
  MailSettingsInput,
  MailSettingsView,
  MailTestResult,
} from '../../../models/mail-settings.model';

@Component({
  selector: 'app-mail-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="mail-settings">
      <header class="head">
        <h2>Configuration email</h2>
        <p class="hint">
          Les demandes du formulaire <code>/contact</code> sont relayées via <strong>Resend</strong>.
          L'adresse expéditrice doit être sur un domaine vérifié dans ton compte Resend.
        </p>
      </header>

      @if (apiKeyConfigured()) {
        <p class="status">✓ Clé API Resend configurée côté serveur.</p>
      } @else {
        <p class="status error">
          ⚠ <code>RESEND_API_KEY</code> non définie côté serveur — les envois sont désactivés.
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="row">
          <label>Adresse expéditeur
            <input type="email" formControlName="fromAddress" placeholder="noreply@atelier.com" />
            <small>Doit être sur un domaine vérifié dans Resend.</small>
          </label>
        </div>

        <div class="row">
          <label>Adresse destinataire
            <input type="email" formControlName="toAddress" placeholder="studio@atelier.com" />
            <small>Où arrivent les demandes du formulaire /contact.</small>
          </label>
        </div>

        <div class="actions">
          <button type="submit" class="primary" [disabled]="saving()">Enregistrer</button>
          <button type="button" (click)="test()" [disabled]="testDisabled() || testing()">
            Envoyer un mail de test
          </button>
        </div>

        @if (statusMessage()) {
          <p class="status" [class.error]="statusError()">{{ statusMessage() }}</p>
        }

        @if (testResult(); as r) {
          <p class="status" [class.error]="!r.success">
            @if (r.success) { Test envoyé avec succès. } @else { Échec : {{ r.error }} }
          </p>
        }

        @if (updatedAt()) {
          <p class="meta">Dernière mise à jour : {{ updatedAt() }}</p>
        }
      </form>
    </div>
  `,
  styles: [`
    .mail-settings { max-width: 720px; }
    .row { margin-bottom: 16px; }
    .row label { display: block; font-size: 14px; }
    .row input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .row small { display: block; color: #666; font-size: 12px; margin-top: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 16px; }
    button { padding: 10px 18px; border: 1px solid #222; background: #fff; cursor: pointer; }
    button.primary { background: #222; color: #fff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 12px; font-size: 14px; }
    .status.error { color: #b00020; }
    .meta { color: #666; font-size: 12px; margin-top: 8px; }
    code { background: #f5f5f5; padding: 0 4px; border-radius: 2px; }
  `],
})
export class MailSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PortfolioService);

  readonly form: FormGroup = this.fb.group({
    fromAddress: ['', [Validators.email]],
    toAddress: ['', [Validators.email]],
  });

  readonly apiKeyConfigured = signal(false);
  readonly updatedAt = signal<string | null>(null);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusError = signal(false);
  readonly testResult = signal<MailTestResult | null>(null);

  // Reactive forms ne sont pas natifs signal — on tick ce compteur sur chaque
  // form event pour que les computed qui lisent le form se rafraichissent.
  private readonly formTick = signal(0);

  readonly testDisabled = computed(() => {
    this.formTick();
    if (this.form.dirty) return true;
    if (!this.apiKeyConfigured()) return true;
    const v = this.form.value;
    return !v.fromAddress || !v.toAddress;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    merge(this.form.valueChanges, this.form.events)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.formTick.update(n => n + 1));
    this.reload();
  }

  reload(): void {
    this.api.getMailSettings().subscribe({
      next: view => this.applyView(view),
      error: () => this.setStatus('Impossible de charger la configuration.', true),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.setStatus('Formulaire invalide.', true);
      return;
    }
    const v = this.form.value;
    const payload: MailSettingsInput = {
      fromAddress: emptyToNull(v.fromAddress),
      toAddress: emptyToNull(v.toAddress),
    };

    this.saving.set(true);
    this.testResult.set(null);
    this.api.saveMailSettings(payload).subscribe({
      next: view => {
        this.applyView(view);
        this.form.markAsPristine();
        this.saving.set(false);
        this.setStatus('Configuration enregistrée.', false);
      },
      error: () => {
        this.saving.set(false);
        this.setStatus('Échec de l’enregistrement.', true);
      },
    });
  }

  test(): void {
    this.testing.set(true);
    this.testResult.set(null);
    this.api.testMail().subscribe({
      next: r => {
        this.testResult.set(r);
        this.testing.set(false);
      },
      error: err => {
        this.testResult.set({
          success: false,
          error: err?.error?.error ?? 'Erreur inattendue',
        });
        this.testing.set(false);
      },
    });
  }

  private applyView(view: MailSettingsView): void {
    this.form.patchValue({
      fromAddress: view.fromAddress ?? '',
      toAddress: view.toAddress ?? '',
    });
    this.form.markAsPristine();
    this.apiKeyConfigured.set(view.apiKeyConfigured);
    this.updatedAt.set(view.updatedAt);
  }

  private setStatus(text: string, isError: boolean): void {
    this.statusMessage.set(text);
    this.statusError.set(isError);
  }
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}
```

### Step 11.3 : Réécrire le spec

- [ ] Remplacer **entièrement** `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts` par :

```typescript
import 'zone.js/testing';
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MailSettingsComponent } from './mail-settings.component';
import { MailSettingsView, MailTestResult } from '../../../models/mail-settings.model';

describe('MailSettingsComponent', () => {
  let fixture: ComponentFixture<MailSettingsComponent>;
  let component: MailSettingsComponent;
  let httpMock: HttpTestingController;

  const sampleView: MailSettingsView = {
    fromAddress: 'from@example.com',
    toAddress: 'to@example.com',
    apiKeyConfigured: true,
    updatedAt: '2026-05-24T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MailSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(MailSettingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInitialGet(view: MailSettingsView = sampleView) {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/admin/mail-settings');
    expect(req.request.method).toBe('GET');
    req.flush(view);
    fixture.detectChanges();
  }

  it('preloads the form with the GET response', () => {
    flushInitialGet();

    expect(component.form.value.fromAddress).toBe('from@example.com');
    expect(component.form.value.toAddress).toBe('to@example.com');
    expect(component.apiKeyConfigured()).toBeTrue();
  });

  it('PUT payload only contains fromAddress and toAddress', () => {
    flushInitialGet();
    component.form.patchValue({ fromAddress: 'new@example.com' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.fromAddress).toBe('new@example.com');
    expect(req.request.body.toAddress).toBe('to@example.com');
    expect(Object.keys(req.request.body).sort()).toEqual(['fromAddress', 'toAddress']);
    req.flush({ ...sampleView, fromAddress: 'new@example.com' });
  });

  it('disables the test button while the form is dirty', () => {
    flushInitialGet();
    expect(component.testDisabled()).toBeFalse();

    component.form.markAsDirty();

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when API key is not configured', () => {
    flushInitialGet({
      fromAddress: 'from@example.com',
      toAddress: 'to@example.com',
      apiKeyConfigured: false,
      updatedAt: 'now',
    });

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when from or to is empty', () => {
    flushInitialGet({
      fromAddress: null,
      toAddress: null,
      apiKeyConfigured: true,
      updatedAt: 'now',
    });

    expect(component.testDisabled()).toBeTrue();
  });

  it('shows the test result returned by the API', fakeAsync(() => {
    flushInitialGet();

    component.test();
    tick();

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/mail-settings/test');
    const result: MailTestResult = { success: true, error: null };
    req.flush(result);
    tick();

    expect(component.testResult()).toEqual(result);
  }));
});
```

### Step 11.4 : Faire passer les tests frontend

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/mail-settings.component.spec.ts'
```

Attendu : `TOTAL: 6 SUCCESS`. Si le compose ne marche pas en standalone (problème d'image), utiliser `docker run` direct avec l'image `atelier-lumen/frontend-test:1.0.0`.

Puis vérifier la suite complète (les autres specs ne doivent pas avoir bougé) :

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test
```

Attendu : `TOTAL: 367 SUCCESS` (361 pre-existing + 6 ici, identique au compte d'après la livraison SMTP — on a remplacé les 6 anciens specs par 6 nouveaux).

### Step 11.5 : Commit

- [ ] Git

```powershell
git add frontend/src/app/models/mail-settings.model.ts frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts
git commit -m "refactor(admin): simplifier MailSettingsComponent (2 champs + apiKeyConfigured)"
```

---

## Task 12 : Infrastructure — propager `RESEND_API_KEY` dans les compose

**Files:**
- Modify: `docker-compose.yml` (racine — APP_SECRETS_KEY déjà retiré en Task 9)
- Modify: `deploy/base/docker-compose.yml`
- Modify: `deploy/envs/local/.env`

### Step 12.1 : Ajouter `RESEND_API_KEY` au compose racine

- [ ] Ouvrir `docker-compose.yml` (racine). Repérer le bloc `backend > environment` (les lignes `JWT_SECRET`, `ADMIN_USERNAME`, etc.). Juste après `ADMIN_PASSWORD_HASH`, ajouter :

```yaml
      # Resend API key — definie en local via env shell ou laisser vide pour mode degrade
      RESEND_API_KEY: "${RESEND_API_KEY:-}"
```

(Pas de valeur dev par défaut. Resend n'a pas de clé "throwaway" — en local, soit l'utilisateur exporte sa propre clé Resend, soit il tourne en mode dégradé. Pas de fuite accidentelle d'une clé de prod via le repo.)

### Step 12.2 : Ajouter `RESEND_API_KEY` au compose deploy/base

- [ ] Ouvrir `deploy/base/docker-compose.yml`. Repérer le bloc `backend > environment` (UPLOAD_DIR, JWT_SECRET, etc.). Juste après `ADMIN_PASSWORD_HASH` (et avant `UPLOAD_DIR` si UPLOAD_DIR est positionné en dernier), ajouter :

```yaml
      RESEND_API_KEY: ${RESEND_API_KEY}
```

Note : pas de `:-default` ici, ce fichier est consommé par les déploiements gérés (rancher self-hosted). La valeur doit venir de `deploy/envs/<env>/.env`. Si elle manque, le backend tourne en mode dégradé (WARN au log, pas de crash).

### Step 12.3 : Ajouter `RESEND_API_KEY` à `deploy/envs/local/.env`

- [ ] Ouvrir `deploy/envs/local/.env`. Si une ligne `APP_SECRETS_KEY=...` est présente, la supprimer. À la fin du fichier, ajouter :

```
RESEND_API_KEY=
```

(Vide = mode dégradé en local. L'utilisateur peut éditer cette ligne avec sa vraie clé Resend pour tester l'envoi end-to-end via la stack rancher.)

### Step 12.4 : Commit

- [ ] Git

```powershell
git add docker-compose.yml deploy/base/docker-compose.yml deploy/envs/local/.env
git commit -m "chore(infra): propager RESEND_API_KEY dans les composes (root + deploy/base + local .env)"
```

---

## Task 13 : Documentation — ADR-0014 + supersede 0013 + READMEs

**Files:**
- Create: `docs/adr/0014-bascule-vers-resend.md`
- Modify: `docs/adr/0013-config-smtp-en-base-chiffree.md` (statut Superseded)
- Modify: `docs/adr/README.md` (index)
- Modify: `backend/README.md` (env vars)
- Modify: `deploy/README.md` (Required secrets)

### Step 13.1 : Lire le template ADR

- [ ] Lire `docs/adr/template.md` et `docs/adr/0013-config-smtp-en-base-chiffree.md` pour matcher le format (statut/date/décideurs/tags, sections `Contexte`, `Décision`, `Conséquences`, `Alternatives envisagées`, `Références`).

### Step 13.2 : Créer l'ADR-0014

- [ ] Créer `docs/adr/0014-bascule-vers-resend.md` en suivant le format du template. Contenu de référence à adapter au format exact :

```markdown
# 0014 — Bascule vers Resend pour l'envoi de mails transactionnels

- **Statut** : Accepted
- **Date** : 2026-05-24
- **Décideurs** : Maxime Guillaume
- **Tags** : mail, infra, simplification
- **Supersede** : [ADR-0013](0013-config-smtp-en-base-chiffree.md)

## Contexte

Le travail livré le 2026-05-23 (ADR-0013) intégrait une configuration SMTP générique éditable depuis l'admin, avec chiffrement AES-256-GCM du mot de passe (`SecretCipher`, `APP_SECRETS_KEY`).

Friction observée :
- Crash au démarrage Railway parce que `APP_SECRETS_KEY` est present mais malforme côté Railway (la feature ne tourne pas en staging).
- La complexite de chiffrement (cipher + cle + 5 colonnes mail_settings) n'a de valeur que pour proteger un password SMTP qu'on ne peut pas mettre en clair en base. Avec une integration HTTP qui ne demande qu'une cle API, ce coût n'est plus justifie.

Resend est désormais provisionné sur Railway via l'intégration marketplace et expose `RESEND_API_KEY` comme env var de service.

## Décision

- Remplacer entièrement la couche SMTP par l'API HTTP Resend via le SDK Java officiel `com.resend:resend-java`.
- La clé API vit uniquement en env var (`RESEND_API_KEY`), lue par Spring `@Value("${app.resend.api-key:}")`. Pas de stockage en base.
- L'admin UI continue d'éditer `from` et `to` (en base, dans une `mail_settings` réduite à 4 colonnes). Ces deux adresses changent indépendamment de la clé.
- Comportement dégradé conservé : sans `RESEND_API_KEY`, le backend démarre quand même, WARN au log, demandes de contact persistées avec `mail_sent = false`.

## Conséquences

### Positives
- Une seule env var au lieu de 7 + clé de chiffrement.
- Déliverabilité gérée par Resend (DKIM/SPF/DMARC, suivi, IP réputation) — pas notre problème.
- Pas de password SMTP en base → pas de SecretCipher, pas d'APP_SECRETS_KEY, pas de risque de fuite via dump SQL.
- Le crash actuel sur Railway s'évapore (rien à instancier qui puisse jeter).

### Négatives / compromis
- Lock-in sur Resend. Si on change de provider, refactor du `ResendMailService`. Surface limitée (un seul wrapper).
- Pas de rotation de clé sans redéploiement (lecture au boot uniquement). Acceptable pour notre rythme.
- Pas de fallback transport. Si Resend est down, les demandes s'accumulent dans `contact_request` avec `mail_sent = false` ; l'admin doit consulter la table en attendant.

### Neutres
- Le SDK Resend est un appel HTTP bloquant. Cohérent avec le reste du code synchrone Spring MVC ; aucun changement de modèle de threading.

## Alternatives envisagées

- **Garder SMTP et fixer le bug Railway.** Rejeté : la cause racine du crash est `APP_SECRETS_KEY` ; corriger la valeur sur Railway fixait l'immédiat, mais on garde toute la complexité (chiffrement, 7 champs admin, 5 colonnes DB) pour zéro gain opérationnel.
- **Clé API éditable depuis l'admin (en base, chiffrée).** Rejeté : aucune valeur ajoutée (rotation de clé Resend est rare), réintroduit `SecretCipher` qu'on cherche justement à retirer.
- **Plain HTTP client (RestClient/HttpClient) au lieu du SDK Resend.** Rejeté : le SDK officiel gère retries, parsing d'erreurs, types des modèles. Le gain en autonomie est marginal, le coût en dépendance aussi (un artifact). Préférer le SDK.
- **Autre provider (Mailgun, SendGrid, Postmark, AWS SES).** Out of scope : Resend est déjà provisionné via l'intégration Railway, SDK Java officiel, gratuit jusqu'à un certain volume.

## Références

- Spec : [docs/superpowers/specs/2026-05-24-bascule-resend-design.md](../superpowers/specs/2026-05-24-bascule-resend-design.md)
- Plan : [docs/superpowers/plans/2026-05-24-bascule-resend.md](../superpowers/plans/2026-05-24-bascule-resend.md)
- ADR-0013 (superseded) : [0013-config-smtp-en-base-chiffree.md](0013-config-smtp-en-base-chiffree.md)
- Resend Java SDK : https://github.com/resend/resend-java
```

### Step 13.3 : Marquer ADR-0013 comme Superseded

- [ ] Ouvrir `docs/adr/0013-config-smtp-en-base-chiffree.md`. Remplacer la ligne `- **Statut** : Accepted` (ou équivalent dans le format du fichier) par :

```markdown
- **Statut** : Superseded by [ADR-0014](0014-bascule-vers-resend.md)
```

Si l'ADR a un en-tête de métadonnées différent, adapter au format réellement utilisé en gardant l'intention (statut + lien vers 0014). Ne pas réécrire le reste du document, juste flagger.

### Step 13.4 : Mettre à jour l'index `docs/adr/README.md`

- [ ] Ouvrir `docs/adr/README.md`. Repérer la table d'index des ADR (lignes `| 0013 ... |`). Modifier la ligne 0013 pour marquer le statut superseded, puis ajouter une nouvelle ligne juste après pour 0014 :

```markdown
| 0013 | Config SMTP en base chiffrée                         | Superseded by 0014 | 2026-05-23 |
| 0014 | Bascule vers Resend pour l'envoi de mails transactionnels | Accepted        | 2026-05-24 |
```

Adapter la largeur des colonnes au pattern existant (le subagent l'observera dans le fichier).

### Step 13.5 : Mettre à jour `backend/README.md`

- [ ] Ouvrir `backend/README.md`. Dans la table des variables d'environnement :
  - **Supprimer** la ligne `APP_SECRETS_KEY`.
  - **Ajouter** une nouvelle ligne :

```markdown
| `RESEND_API_KEY` | recommandé | Clé API du compte Resend (commence par `re_`). Sans cette clé : le backend démarre quand même, mais les envois de mail sont désactivés (WARN au démarrage). Voir [ADR-0014](../docs/adr/0014-bascule-vers-resend.md). |
```

Remplacer la section finale qui parle de "Configuration SMTP" par :

```markdown
## Configuration email (Resend)

La configuration mail est désormais minimale : seule la clé API Resend est requise (`RESEND_API_KEY`). Les adresses expéditeur/destinataire se règlent depuis `/admin > onglet Email`. Voir [ADR-0014](../docs/adr/0014-bascule-vers-resend.md).
```

### Step 13.6 : Mettre à jour `deploy/README.md`

- [ ] Ouvrir `deploy/README.md`. Repérer la section "Required secrets". Ajouter une ligne pour `RESEND_API_KEY` au niveau staging ET production :

```markdown
| `RESEND_API_KEY` | repo secrets / `production` env vars | injection automatique par l'intégration Resend de Railway, ou à définir manuellement |
```

(Adapter au format exact de la table existante.)

### Step 13.7 : Commit

- [ ] Git

```powershell
git add docs/adr/0014-bascule-vers-resend.md docs/adr/0013-config-smtp-en-base-chiffree.md docs/adr/README.md backend/README.md deploy/README.md
git commit -m "docs: ADR-0014 (bascule Resend) + READMEs + ADR-0013 superseded"
```

---

## Task 14 : Validation finale

DO NOT modify source code in this task. Verification only.

### Step 14.1 : Suite backend complète

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : aggregate `Tests run: ~170, Failures: 0, Errors: 0` (compte exact ajusté selon que SecretCipherTest disparaît et ResendMailServiceTest apparaît). Aucune erreur de context-load (les `@SpringBootTest` doivent encore tous booter sans la clé Resend → mode dégradé silencieux à part le WARN).

### Step 14.2 : Suite frontend complète

- [ ] Run

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test
```

Attendu : `TOTAL: 367 SUCCESS`.

### Step 14.3 : Compilation finale + démarrage local

- [ ] Run

```powershell
docker compose up --build -d
```

Attendu : les 4 conteneurs démarrent et passent healthy. Le backend démarre **même si `RESEND_API_KEY` n'est pas exportée** dans le shell (mode dégradé attendu — log WARN au boot).

Vérifier les logs :

```powershell
docker logs atelier-backend 2>&1 | Select-String -Pattern "Resend|RESEND|mail_settings|017-"
```

Attendu :
- Liquibase applique le changeset `017-drop-smtp-columns-from-mail-settings` (1 ligne `Successfully applied`).
- Une ligne WARN `RESEND_API_KEY not set — Resend in degraded mode` si tu n'as pas posé la clé en local.

### Step 14.4 : Vérifier l'API surface

- [ ] Sans JWT :

```powershell
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/admin/mail-settings
```

Attendu : `401`.

- [ ] Avec JWT (login admin/admin via `/api/auth/login`) :

```powershell
$tok = (Invoke-RestMethod -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"admin"}' -Uri http://localhost:8080/api/auth/login).token
$resp = Invoke-RestMethod -Headers @{Authorization="Bearer $tok"} -Uri http://localhost:8080/api/admin/mail-settings
$resp
```

Attendu : JSON `{fromAddress: null, toAddress: null, apiKeyConfigured: false, updatedAt: "..."}` — sans `host`/`port`/`username`/`hasPassword`/`encryption` (les colonnes ont disparu de l'entité).

### Step 14.5 : Smoke navigateur (manuel)

À toi de jouer dans le navigateur :

1. http://localhost:4200/login → admin/admin → `/admin > Email`
2. Vérifier l'indicateur `⚠ RESEND_API_KEY non définie` (puisque pas exportée en local par défaut).
3. Saisir `from@example.com` + `to@example.com`, **Enregistrer** → toast OK.
4. Vérifier que le bouton **Envoyer un mail de test** est **désactivé** (apiKeyConfigured=false).
5. Stop la stack, exporter `$env:RESEND_API_KEY="re_test_xxx"` (peu importe la valeur — Resend rejettera mais ça suffit à passer le check `isConfigured()`), restart.
6. Aller sur `/admin > Email` → indicateur ✓ Clé API configurée.
7. Recharger l'état du formulaire (déjà rempli depuis l'étape 3, password n'existe plus comme champ).
8. **Envoyer un mail de test** → résultat (erreur de Resend si la clé est bidon, succès si tu as posé une vraie clé).

Si tout est cohérent, la feature est prête à merger vers main.

### Step 14.6 : Si tout est vert, pas de commit

Cette tâche est purement validation. Si tu as eu besoin de fixer quoi que ce soit pendant ces vérifications, isole le fix dans un commit séparé clairement labellé (`fix(...)`), pas dans Task 14.

---

## Self-review — vérification contre la spec

- ✅ Migration 017 drop les 5 colonnes (Task 3).
- ✅ Entité `MailSettingsEntity` réduit à 4 champs (Task 4).
- ✅ DTOs : `MailSettingsView` (4 fields, `apiKeyConfigured: boolean`), `MailSettingsInput` (2 fields) (Task 5).
- ✅ `ResendMailService` créé avec mode dégradé, constructeur production + constructeur package-private pour tests (Task 2).
- ✅ `MailSettingsService` shrink à get/save/sendTest (Task 6).
- ✅ `ContactRequestService` consomme `ResendMailService` et `MailSettingsService.get()` (Task 8).
- ✅ `AdminMailSettingsController` inchangé en surface, test adapté aux nouveaux DTOs (Task 7).
- ✅ `SecretCipher` + test supprimés (Task 9).
- ✅ `spring-boot-starter-mail` retiré du pom (Task 10).
- ✅ Frontend modèle/composant/spec rewrite (Task 11).
- ✅ Compose racine + deploy/base + local.env propagent `RESEND_API_KEY` (Task 12).
- ✅ ADR-0014 + ADR-0013 marqué Superseded + READMEs mis à jour (Task 13).
- ✅ Validation finale couvre suite tests + démarrage + endpoint security + smoke navigateur (Task 14).

Acceptance criteria de la spec couverts :
1. ✅ Boot sans crash sans/avec `RESEND_API_KEY` malformée — couvert par Task 14.3 + design de `ResendMailService.send()` qui catch `ResendException`.
2. ✅ `GET /api/admin/mail-settings` renvoie les nouveaux champs sans les anciens — Task 7 test + Task 14.4.
3. ✅ `PUT` accepte from/to et refuse les emails malformés — Task 7 (annotations `@Email` sur l'input) + Spring Bean Validation.
4. ✅ `POST /test` envoi via Resend, 409 si incomplete, 200 avec body d'erreur si Resend refuse — Task 6 service + Task 7 controller test.
5. ✅ `/contact` persiste + déclenche envoi Resend cohérent avec `mail_sent` — Task 8 tests.
6. ✅ Page admin charge form, indicateur `apiKeyConfigured`, save, test — Task 11 spec.
7. ✅ `APP_SECRETS_KEY` n'est plus référencée nulle part — Task 9 (code/properties) + Task 12 (composes) + Task 13 (docs).
8. ✅ Tous tests passent, `SecretCipherTest` supprimé, `ResendMailServiceTest` ajouté — Task 14.1.

Aucun placeholder TBD/TODO restant. Les types et noms sont cohérents entre tâches (`MailSettingsView` shape identique partout, `ResendMailService.send(from,to,replyTo,subject,body)` signature identique, etc.).
