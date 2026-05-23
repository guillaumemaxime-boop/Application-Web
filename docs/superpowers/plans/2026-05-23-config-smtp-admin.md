# Configuration SMTP éditable depuis l'admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'administrateur de modifier la configuration SMTP (hôte, port, identifiant, mot de passe, chiffrement, expéditeur, destinataire) depuis la console `/admin` sans redéploiement, et de tester l'envoi.

**Architecture :** Une table `mail_settings` single-row stocke la configuration ; le mot de passe est chiffré en AES-256-GCM avec une clé fournie par `APP_SECRETS_KEY`. Un `MailSettingsService` lit la ligne, déchiffre le password, construit un `JavaMailSenderImpl` à la demande, et le fournit à `ContactRequestService` (qui n'utilise plus l'auto-config Spring Mail). Le frontend ajoute un onglet « Email » dans la console admin existante (pas de nouvelle route).

**Tech Stack :** Spring Boot 4, JPA, Liquibase, JJWT (sécurité déjà en place), AES-GCM (javax.crypto), Angular 21 standalone + signals + reactive forms.

**Divergence assumée vs spec :** le spec mentionnait une route lazy `/admin/parametres/email` mais l'admin est un composant unique avec des onglets internes. Le plan ajoute un onglet `email` qui rend `<app-mail-settings>` (composant standalone, ses propres tests).

**Référence spec :** `docs/superpowers/specs/2026-05-17-config-smtp-admin-design.md`

---

## File structure

**Backend — création**

| Fichier | Rôle |
|---|---|
| `backend/src/main/resources/db/changelog/changes/016-create-mail-settings.yaml` | Migration table + ligne `'default'` |
| `backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java` | AES-256-GCM, mode dégradé si clé absente |
| `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java` | JPA entity |
| `backend/src/main/java/com/atelier/portfolio/repository/MailSettingsRepository.java` | `JpaRepository<MailSettingsEntity, String>` |
| `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java` | DTO record (réponse GET/PUT, password masqué) |
| `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java` | DTO record (corps PUT) |
| `backend/src/main/java/com/atelier/portfolio/model/MailTestResult.java` | DTO record (`success`, `error`) |
| `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java` | `get()`, `save()`, `buildSender()`, `sendTest()` |
| `backend/src/main/java/com/atelier/portfolio/controller/AdminMailSettingsController.java` | Endpoints `/api/admin/mail-settings` |
| `backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java` | Round-trip, IV différents, clé invalide, mode dégradé |
| `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java` | save/get/buildSender/sendTest |
| `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java` | Délégation, masquage |

**Backend — modification**

| Fichier | Changement |
|---|---|
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | Ajouter include `016-create-mail-settings.yaml` |
| `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java` | Remplacer `ObjectProvider<JavaMailSender>` + `@Value` SMTP par dépendance à `MailSettingsService` |
| `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java` | Adapter aux nouveaux collaborateurs |
| `backend/README.md` | Documenter `APP_SECRETS_KEY`, retirer mentions `SPRING_MAIL_*`/`APP_CONTACT_*` si présentes |

**Frontend — création**

| Fichier | Rôle |
|---|---|
| `frontend/src/app/models/mail-settings.model.ts` | Types `MailSettingsView`, `MailSettingsInput`, `MailTestResult`, `MailEncryption` |
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts` | Standalone, signals, reactive form |
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts` | Karma spec |

**Frontend — modification**

| Fichier | Changement |
|---|---|
| `frontend/src/app/services/portfolio.service.ts` | Ajouter `getMailSettings`, `saveMailSettings`, `testMail` |
| `frontend/src/app/pages/admin/admin.component.ts` | Ajouter onglet `email`, importer `MailSettingsComponent`, rendre conditionnellement |

**Docs**

| Fichier | Changement |
|---|---|
| `docs/adr/0013-config-smtp-en-base-chiffree.md` | Nouvel ADR |

---

## Task 1 : Configuration de la clé `APP_SECRETS_KEY` + composant `SecretCipher` (TDD)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java`
- Create: `backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java`
- Modify: `backend/src/main/resources/application.properties` (ajout `app.secrets.key=${APP_SECRETS_KEY:}` à la fin du fichier, après la ligne `app.upload.base-url=/api/photos/files`)

### Step 1.1 : Écrire le test d'échec

- [ ] Créer `backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java`

```java
package com.atelier.portfolio.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SecretCipherTest {

    // Clé AES-256 base64 de 32 octets, déterministe pour les tests.
    private static final String VALID_KEY_B64 = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

    @Test
    void encrypt_thenDecrypt_returnsOriginalPlaintext() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);

        String enc = cipher.encrypt("hello-smtp-password");

        assertNotNull(enc);
        assertTrue(enc.contains(":"), "expected base64(iv) ':' base64(ct+tag)");
        assertEquals("hello-smtp-password", cipher.decrypt(enc));
    }

    @Test
    void encrypt_sameInputTwice_yieldsDifferentCiphertexts() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);

        String a = cipher.encrypt("same");
        String b = cipher.encrypt("same");

        assertNotEquals(a, b, "IV must be random per call");
        assertEquals("same", cipher.decrypt(a));
        assertEquals("same", cipher.decrypt(b));
    }

    @Test
    void constructor_rejectsKeyWithWrongLength() {
        // 16 octets en base64 — pas AES-256.
        String shortKey = "AAECAwQFBgcICQoLDA0ODw==";

        assertThrows(IllegalArgumentException.class, () -> new SecretCipher(shortKey));
    }

    @Test
    void degradedMode_whenKeyBlank_throwsOnEncryptAndDecrypt() {
        SecretCipher cipher = new SecretCipher("");

        assertTrue(cipher.isDegraded());
        assertThrows(IllegalStateException.class, () -> cipher.encrypt("x"));
        assertThrows(IllegalStateException.class, () -> cipher.decrypt("x"));
    }

    @Test
    void decrypt_rejectsTamperedCiphertext() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);
        String enc = cipher.encrypt("payload");
        // Modifie un caractère après le ':' pour casser le tag GCM.
        int sep = enc.indexOf(':');
        char swap = enc.charAt(sep + 1) == 'A' ? 'B' : 'A';
        String tampered = enc.substring(0, sep + 1) + swap + enc.substring(sep + 2);

        assertThrows(IllegalStateException.class, () -> cipher.decrypt(tampered));
    }
}
```

### Step 1.2 : Lancer le test pour vérifier qu'il échoue

- [ ] Exécuter

```powershell
cd backend
mvn -Dtest=SecretCipherTest test
```

Attendu : compilation échoue (classe `SecretCipher` n'existe pas).

### Step 1.3 : Implémenter `SecretCipher`

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java`

```java
package com.atelier.portfolio.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class SecretCipher {

    private static final Logger log = LoggerFactory.getLogger(SecretCipher.class);
    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;        // 96 bits
    private static final int TAG_LENGTH_BITS = 128;
    private static final int KEY_LENGTH = 32;       // AES-256

    private final SecretKeySpec key;
    private final boolean degraded;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${app.secrets.key:}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            log.warn("APP_SECRETS_KEY is not set — SecretCipher in degraded mode, mail config will not be usable");
            this.key = null;
            this.degraded = true;
            return;
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("APP_SECRETS_KEY is not valid base64", ex);
        }
        if (raw.length != KEY_LENGTH) {
            throw new IllegalArgumentException(
                    "APP_SECRETS_KEY must decode to " + KEY_LENGTH + " bytes (AES-256); got " + raw.length);
        }
        this.key = new SecretKeySpec(raw, "AES");
        this.degraded = false;
    }

    public boolean isDegraded() {
        return degraded;
    }

    public String encrypt(String clear) {
        if (degraded) {
            throw new IllegalStateException("SecretCipher is in degraded mode (APP_SECRETS_KEY not set)");
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ct = cipher.doFinal(clear.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(ct);
        } catch (Exception ex) {
            throw new IllegalStateException("Encryption failure", ex);
        }
    }

    public String decrypt(String stored) {
        if (degraded) {
            throw new IllegalStateException("SecretCipher is in degraded mode (APP_SECRETS_KEY not set)");
        }
        int sep = stored.indexOf(':');
        if (sep < 0) {
            throw new IllegalStateException("Stored ciphertext is malformed (missing ':')");
        }
        try {
            byte[] iv = Base64.getDecoder().decode(stored.substring(0, sep));
            byte[] ct = Base64.getDecoder().decode(stored.substring(sep + 1));
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Decryption failure", ex);
        }
    }
}
```

### Step 1.4 : Ajouter la property Spring

- [ ] Ouvrir `backend/src/main/resources/application.properties`. Repérer la fin du fichier (ligne `app.upload.base-url=/api/photos/files`). Ajouter à la suite :

```properties

# Symmetric encryption key for at-rest secrets (mail password)
app.secrets.key=${APP_SECRETS_KEY:}
```

### Step 1.5 : Faire passer les tests

- [ ] Exécuter

```powershell
mvn -Dtest=SecretCipherTest test
```

Attendu : `Tests run: 5, Failures: 0`.

### Step 1.6 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/security/SecretCipher.java backend/src/test/java/com/atelier/portfolio/security/SecretCipherTest.java backend/src/main/resources/application.properties
git commit -m "feat(security): ajouter SecretCipher AES-256-GCM avec mode degrade"
```

---

## Task 2 : Migration Liquibase `016-create-mail-settings`

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/016-create-mail-settings.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

### Step 2.1 : Créer le fichier de migration

- [ ] Créer `backend/src/main/resources/db/changelog/changes/016-create-mail-settings.yaml`

```yaml
databaseChangeLog:
  - changeSet:
      id: 016-create-mail-settings
      author: atelier-lumen
      changes:
        - createTable:
            tableName: mail_settings
            columns:
              - column:
                  name: id
                  type: varchar(20)
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: host
                  type: varchar(200)
              - column:
                  name: port
                  type: int
              - column:
                  name: username
                  type: varchar(200)
              - column:
                  name: password_encrypted
                  type: varchar(500)
              - column:
                  name: encryption
                  type: varchar(20)
                  constraints:
                    nullable: false
                  defaultValue: NONE
              - column:
                  name: from_address
                  type: varchar(300)
              - column:
                  name: to_address
                  type: varchar(300)
              - column:
                  name: updated_at
                  type: varchar(50)
                  constraints:
                    nullable: false
        - insert:
            tableName: mail_settings
            columns:
              - column:
                  name: id
                  value: default
              - column:
                  name: encryption
                  value: NONE
              - column:
                  name: updated_at
                  value: "2026-05-17T00:00:00Z"
```

### Step 2.2 : Référencer la migration dans le master

- [ ] Ouvrir `backend/src/main/resources/db/changelog/db.changelog-master.yaml` et ajouter à la fin (après l'include `015-create-contact-requests.yaml`) :

```yaml
  - include:
      file: changes/016-create-mail-settings.yaml
      relativeToChangelogFile: true
```

### Step 2.3 : Vérifier que la migration s'applique en H2 lors des tests

- [ ] Exécuter

```powershell
mvn test -Dtest=ContactRequestServiceTest
```

Attendu : test pass — confirme que Liquibase joue la nouvelle migration sans erreur (Hibernate `ddl-auto=validate` n'a pas d'entity correspondante encore mais la migration n'est référencée par aucune entity à ce stade, c'est OK).

### Step 2.4 : Commit

- [ ] Git

```powershell
git add backend/src/main/resources/db/changelog/changes/016-create-mail-settings.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "feat(db): migration 016 — table mail_settings single-row"
```

---

## Task 3 : Entité JPA `MailSettingsEntity` + repository

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/MailSettingsRepository.java`

### Step 3.1 : Créer l'entité

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java`

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

    @Column(length = 200)
    private String host;

    @Column
    private Integer port;

    @Column(length = 200)
    private String username;

    @Column(name = "password_encrypted", length = 500)
    private String passwordEncrypted;

    @Column(nullable = false, length = 20)
    private String encryption;

    @Column(name = "from_address", length = 300)
    private String fromAddress;

    @Column(name = "to_address", length = 300)
    private String toAddress;

    @Column(name = "updated_at", nullable = false, length = 50)
    private String updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }

    public Integer getPort() { return port; }
    public void setPort(Integer port) { this.port = port; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordEncrypted() { return passwordEncrypted; }
    public void setPasswordEncrypted(String passwordEncrypted) { this.passwordEncrypted = passwordEncrypted; }

    public String getEncryption() { return encryption; }
    public void setEncryption(String encryption) { this.encryption = encryption; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
```

### Step 3.2 : Créer le repository

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/repository/MailSettingsRepository.java`

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.MailSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MailSettingsRepository extends JpaRepository<MailSettingsEntity, String> {
}
```

### Step 3.3 : Vérifier la validation Hibernate

- [ ] Exécuter

```powershell
mvn test -Dtest=ContactRequestServiceTest
```

Attendu : test pass. Hibernate valide désormais que la table `mail_settings` matche bien l'entité (`ddl-auto=validate` est strict — un mismatch ferait échouer le démarrage du contexte Spring).

### Step 3.4 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/entity/MailSettingsEntity.java backend/src/main/java/com/atelier/portfolio/repository/MailSettingsRepository.java
git commit -m "feat(mail): entite et repository MailSettings"
```

---

## Task 4 : DTOs `MailSettingsView`, `MailSettingsInput`, `MailTestResult`

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/MailTestResult.java`

### Step 4.1 : Créer `MailSettingsView` (réponse, password masqué)

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java`

```java
package com.atelier.portfolio.model;

public record MailSettingsView(
        String host,
        Integer port,
        String username,
        boolean hasPassword,
        String encryption,
        String fromAddress,
        String toAddress,
        String updatedAt
) {
}
```

### Step 4.2 : Créer `MailSettingsInput` (corps PUT, avec validation)

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java`

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MailSettingsInput(
        @Size(max = 200) String host,
        @Min(1) @Max(65535) Integer port,
        @Size(max = 200) String username,
        @Size(max = 500) String password,
        @Pattern(regexp = "NONE|STARTTLS|SSL", message = "encryption must be NONE, STARTTLS, or SSL")
        String encryption,
        @Email @Size(max = 300) String fromAddress,
        @Email @Size(max = 300) String toAddress
) {
}
```

### Step 4.3 : Créer `MailTestResult`

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/model/MailTestResult.java`

```java
package com.atelier.portfolio.model;

public record MailTestResult(boolean success, String error) {

    public static MailTestResult ok() {
        return new MailTestResult(true, null);
    }

    public static MailTestResult failure(String error) {
        String safe = error == null ? "unknown error" : error;
        if (safe.length() > 500) {
            safe = safe.substring(0, 500);
        }
        return new MailTestResult(false, safe);
    }
}
```

### Step 4.4 : Compilation

- [ ] Exécuter

```powershell
mvn -DskipTests compile
```

Attendu : `BUILD SUCCESS`.

### Step 4.5 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/model/MailSettingsView.java backend/src/main/java/com/atelier/portfolio/model/MailSettingsInput.java backend/src/main/java/com/atelier/portfolio/model/MailTestResult.java
git commit -m "feat(mail): DTOs MailSettingsView, MailSettingsInput, MailTestResult"
```

---

## Task 5 : `MailSettingsService` — `get`, `save`, `buildSender` (TDD)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java`

### Step 5.1 : Écrire le test d'échec

- [ ] Créer `backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java`

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.repository.MailSettingsRepository;
import com.atelier.portfolio.security.SecretCipher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailSettingsServiceTest {

    @Mock private MailSettingsRepository repository;
    @Mock private SecretCipher cipher;

    private MailSettingsService service;

    @BeforeEach
    void setUp() {
        service = new MailSettingsService(repository, cipher);
    }

    private MailSettingsEntity existingEntity() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId("default");
        e.setHost("smtp.example.com");
        e.setPort(587);
        e.setUsername("user@example.com");
        e.setPasswordEncrypted("iv:ct");
        e.setEncryption("STARTTLS");
        e.setFromAddress("noreply@example.com");
        e.setToAddress("studio@example.com");
        e.setUpdatedAt("2026-05-17T00:00:00Z");
        return e;
    }

    @Test
    void get_returnsViewWithMaskedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));

        MailSettingsView v = service.get();

        assertEquals("smtp.example.com", v.host());
        assertEquals(587, v.port());
        assertEquals("user@example.com", v.username());
        assertTrue(v.hasPassword(), "hasPassword must be true when password_encrypted is non-null");
        assertEquals("STARTTLS", v.encryption());
        assertEquals("noreply@example.com", v.fromAddress());
        assertEquals("studio@example.com", v.toAddress());
        assertEquals("2026-05-17T00:00:00Z", v.updatedAt());
    }

    @Test
    void get_emptyEntity_returnsViewWithHasPasswordFalse() {
        MailSettingsEntity empty = new MailSettingsEntity();
        empty.setId("default");
        empty.setEncryption("NONE");
        empty.setUpdatedAt("2026-05-17T00:00:00Z");
        when(repository.findById("default")).thenReturn(Optional.of(empty));

        MailSettingsView v = service.get();

        assertNull(v.host());
        assertFalse(v.hasPassword());
        assertEquals("NONE", v.encryption());
    }

    @Test
    void save_withNonEmptyPassword_encryptsAndStores() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cipher.encrypt("newsecret")).thenReturn("ENC");
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 465, "user2", "newsecret", "SSL",
                "from2@example.com", "to2@example.com");

        MailSettingsView v = service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        MailSettingsEntity saved = captor.getValue();
        assertEquals("smtp2.example.com", saved.getHost());
        assertEquals(465, saved.getPort());
        assertEquals("user2", saved.getUsername());
        assertEquals("ENC", saved.getPasswordEncrypted());
        assertEquals("SSL", saved.getEncryption());
        assertEquals("from2@example.com", saved.getFromAddress());
        assertEquals("to2@example.com", saved.getToAddress());
        assertNotNull(saved.getUpdatedAt());
        assertTrue(v.hasPassword());
    }

    @Test
    void save_withBlankPassword_keepsExistingEncryptedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 587, "user", "", "STARTTLS",
                "from@example.com", "to@example.com");

        service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("iv:ct", captor.getValue().getPasswordEncrypted(),
                "blank password input must not overwrite existing encrypted password");
        verify(cipher, never()).encrypt(any());
    }

    @Test
    void save_withNullPassword_keepsExistingEncryptedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 587, "user", null, "STARTTLS",
                "from@example.com", "to@example.com");

        service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("iv:ct", captor.getValue().getPasswordEncrypted());
        verify(cipher, never()).encrypt(any());
    }

    @Test
    void buildSender_whenConfigComplete_returnsConfiguredJavaMailSender() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(cipher.decrypt("iv:ct")).thenReturn("plain-pwd");

        JavaMailSender sender = service.buildSender();

        assertNotNull(sender);
        assertInstanceOf(JavaMailSenderImpl.class, sender);
        JavaMailSenderImpl impl = (JavaMailSenderImpl) sender;
        assertEquals("smtp.example.com", impl.getHost());
        assertEquals(587, impl.getPort());
        assertEquals("user@example.com", impl.getUsername());
        assertEquals("plain-pwd", impl.getPassword());
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"));
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.auth"));
    }

    @Test
    void buildSender_whenHostMissing_returnsNull() {
        MailSettingsEntity empty = new MailSettingsEntity();
        empty.setId("default");
        empty.setEncryption("NONE");
        empty.setUpdatedAt("now");
        when(repository.findById("default")).thenReturn(Optional.of(empty));

        assertNull(service.buildSender());
    }

    @Test
    void buildSender_whenCipherDegraded_returnsNullAndDoesNotThrow() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(cipher.decrypt("iv:ct")).thenThrow(new IllegalStateException("degraded"));

        assertNull(service.buildSender());
    }
}
```

### Step 5.2 : Vérifier l'échec

- [ ] Exécuter

```powershell
mvn -Dtest=MailSettingsServiceTest test
```

Attendu : compilation échoue (`MailSettingsService` n'existe pas).

### Step 5.3 : Implémenter `MailSettingsService`

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java`

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import com.atelier.portfolio.security.SecretCipher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Properties;

@Service
public class MailSettingsService {

    private static final Logger log = LoggerFactory.getLogger(MailSettingsService.class);

    private final MailSettingsRepository repository;
    private final SecretCipher cipher;

    public MailSettingsService(MailSettingsRepository repository, SecretCipher cipher) {
        this.repository = repository;
        this.cipher = cipher;
    }

    @Transactional(readOnly = true)
    public MailSettingsView get() {
        return toView(loadOrInit());
    }

    @Transactional
    public MailSettingsView save(MailSettingsInput input) {
        MailSettingsEntity entity = loadOrInit();
        entity.setHost(blankToNull(input.host()));
        entity.setPort(input.port());
        entity.setUsername(blankToNull(input.username()));
        entity.setEncryption(input.encryption() == null || input.encryption().isBlank() ? "NONE" : input.encryption());
        entity.setFromAddress(blankToNull(input.fromAddress()));
        entity.setToAddress(blankToNull(input.toAddress()));
        entity.setUpdatedAt(Instant.now().toString());

        String password = input.password();
        if (password != null && !password.isBlank()) {
            entity.setPasswordEncrypted(cipher.encrypt(password));
        }
        // si password est null ou vide : on conserve l'existant
        return toView(repository.save(entity));
    }

    /**
     * Construit un JavaMailSender à partir de la configuration enregistrée.
     * Retourne null si la conf est incomplète, ou si le password ne peut pas être déchiffré
     * (par exemple cipher en mode dégradé). Ne jette jamais.
     */
    public JavaMailSender buildSender() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null || entity.getHost() == null || entity.getHost().isBlank() || entity.getPort() == null) {
            return null;
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(entity.getHost());
        sender.setPort(entity.getPort());

        boolean hasAuth = entity.getUsername() != null && !entity.getUsername().isBlank();
        if (hasAuth) {
            sender.setUsername(entity.getUsername());
            if (entity.getPasswordEncrypted() != null && !entity.getPasswordEncrypted().isBlank()) {
                try {
                    sender.setPassword(cipher.decrypt(entity.getPasswordEncrypted()));
                } catch (IllegalStateException ex) {
                    log.warn("Cannot decrypt mail password ({}); sender unavailable", ex.getMessage());
                    return null;
                }
            }
        }

        Properties props = sender.getJavaMailProperties();
        props.setProperty("mail.transport.protocol", "smtp");
        props.setProperty("mail.smtp.auth", Boolean.toString(hasAuth));
        props.setProperty("mail.smtp.starttls.enable", Boolean.toString("STARTTLS".equals(entity.getEncryption())));
        props.setProperty("mail.smtp.ssl.enable", Boolean.toString("SSL".equals(entity.getEncryption())));
        return sender;
    }

    public MailTestResult sendTest() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null
                || entity.getHost() == null || entity.getHost().isBlank()
                || entity.getPort() == null
                || entity.getFromAddress() == null || entity.getFromAddress().isBlank()
                || entity.getToAddress() == null || entity.getToAddress().isBlank()) {
            return MailTestResult.failure("incomplete");
        }
        JavaMailSender sender = buildSender();
        if (sender == null) {
            return MailTestResult.failure("sender unavailable (encryption key or password issue)");
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(entity.getFromAddress());
            msg.setTo(entity.getToAddress());
            msg.setSubject("Test de configuration mail — Atelier");
            msg.setText("Mail de test envoyé le " + Instant.now() + ".");
            sender.send(msg);
            return MailTestResult.ok();
        } catch (Exception ex) {
            log.warn("Mail test failed: {}", ex.getMessage());
            return MailTestResult.failure(ex.getMessage());
        }
    }

    private MailSettingsEntity loadOrInit() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID).orElseGet(() -> {
            MailSettingsEntity e = new MailSettingsEntity();
            e.setId(MailSettingsEntity.DEFAULT_ID);
            e.setEncryption("NONE");
            e.setUpdatedAt(Instant.now().toString());
            return e;
        });
    }

    private static MailSettingsView toView(MailSettingsEntity e) {
        return new MailSettingsView(
                e.getHost(),
                e.getPort(),
                e.getUsername(),
                e.getPasswordEncrypted() != null && !e.getPasswordEncrypted().isBlank(),
                e.getEncryption(),
                e.getFromAddress(),
                e.getToAddress(),
                e.getUpdatedAt()
        );
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
```

### Step 5.4 : Faire passer les tests

- [ ] Exécuter

```powershell
mvn -Dtest=MailSettingsServiceTest test
```

Attendu : `Tests run: 8, Failures: 0`.

### Step 5.5 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java backend/src/test/java/com/atelier/portfolio/service/MailSettingsServiceTest.java
git commit -m "feat(mail): MailSettingsService avec encryption et build du JavaMailSender"
```

---

## Task 6 : `AdminMailSettingsController` (TDD)

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminMailSettingsController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java`

### Step 6.1 : Écrire le test d'échec

- [ ] Créer `backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java`

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
                "smtp.x", 587, "u", true, "STARTTLS",
                "from@x", "to@x", "2026-05-17T00:00:00Z");
        when(service.get()).thenReturn(view);

        MailSettingsView result = controller.get();

        assertSame(view, result);
    }

    @Test
    void put_delegatesToServiceSave() {
        MailSettingsInput input = new MailSettingsInput(
                "h", 25, "u", "p", "NONE", "f@x", "t@x");
        MailSettingsView view = new MailSettingsView(
                "h", 25, "u", true, "NONE", "f@x", "t@x", "now");
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
    void test_smtpFailure_returns200WithErrorBody() {
        when(service.sendTest()).thenReturn(MailTestResult.failure("connection refused"));

        ResponseEntity<MailTestResult> resp = controller.test();

        // Erreur SMTP réelle (host valide mais refus) — pas incomplete → 200 avec body en erreur.
        assertEquals(200, resp.getStatusCode().value());
        assertFalse(resp.getBody().success());
        assertEquals("connection refused", resp.getBody().error());
    }
}
```

### Step 6.2 : Vérifier l'échec

- [ ] Exécuter

```powershell
mvn -Dtest=AdminMailSettingsControllerTest test
```

Attendu : compilation échoue (contrôleur n'existe pas).

### Step 6.3 : Implémenter le contrôleur

- [ ] Créer `backend/src/main/java/com/atelier/portfolio/controller/AdminMailSettingsController.java`

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.service.MailSettingsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/mail-settings")
public class AdminMailSettingsController {

    private final MailSettingsService service;

    public AdminMailSettingsController(MailSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public MailSettingsView get() {
        return service.get();
    }

    @PutMapping
    public MailSettingsView put(@Valid @RequestBody MailSettingsInput input) {
        return service.save(input);
    }

    @PostMapping("/test")
    public ResponseEntity<MailTestResult> test() {
        MailTestResult result = service.sendTest();
        if (!result.success() && "incomplete".equals(result.error())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(MailTestResult.failure("Configuration incomplète"));
        }
        return ResponseEntity.ok(result);
    }
}
```

### Step 6.4 : Faire passer les tests

- [ ] Exécuter

```powershell
mvn -Dtest=AdminMailSettingsControllerTest test
```

Attendu : `Tests run: 5, Failures: 0`.

### Step 6.5 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/controller/AdminMailSettingsController.java backend/src/test/java/com/atelier/portfolio/controller/AdminMailSettingsControllerTest.java
git commit -m "feat(mail): endpoints admin GET/PUT/POST /api/admin/mail-settings"
```

---

## Task 7 : Migrer `ContactRequestService` vers `MailSettingsService`

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java`

### Step 7.1 : Mettre à jour le test (TDD)

- [ ] Remplacer le contenu de `backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.repository.ContactRequestRepository;
import com.atelier.portfolio.repository.MailSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock private ContactRequestRepository repository;
    @Mock private MailSettingsService mailSettingsService;
    @Mock private JavaMailSender mailSender;

    private ContactRequestService service;

    @BeforeEach
    void setUp() {
        when(repository.save(any(ContactRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new ContactRequestService(repository, mailSettingsService);
    }

    private ContactRequestInput sampleInput() {
        return new ContactRequestInput(
                "Jean Test", "jean@example.com", "0600000000",
                "acquisition", "Bonjour, je suis intéressé.",
                "f-001", "onde", "Onde"
        );
    }

    private MailSettingsEntity configuredEntity() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId(MailSettingsEntity.DEFAULT_ID);
        e.setHost("smtp.x");
        e.setPort(587);
        e.setEncryption("STARTTLS");
        e.setFromAddress("no-reply@studio.fr");
        e.setToAddress("studio@example.com");
        e.setUpdatedAt("now");
        return e;
    }

    @Test
    void testSubmit_PersistsTrimmedFields() {
        when(mailSettingsService.buildSender()).thenReturn(null);
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
    void testSubmit_NoSenderAvailable_SkipsDelivery() {
        when(mailSettingsService.buildSender()).thenReturn(null);

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_NoToAddress_SkipsDelivery() {
        MailSettingsEntity noTo = configuredEntity();
        noTo.setToAddress(null);
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(noTo));

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void testSubmit_MailConfigured_SendsAndMarksMailSent() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));

        service.submit(sampleInput());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage msg = captor.getValue();
        assertArrayEquals(new String[]{"studio@example.com"}, msg.getTo());
        assertEquals("no-reply@studio.fr", msg.getFrom());
        assertEquals("jean@example.com", msg.getReplyTo());
        assertTrue(msg.getSubject().contains("Acquisition"));
        assertTrue(msg.getSubject().contains("Onde"));
        assertTrue(msg.getText().contains("/mobilier/onde"));

        ArgumentCaptor<ContactRequestEntity> entityCaptor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailDeliveryFails_KeepsRecordWithMailSentFalse() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_PressInterest_UsesPressLabelInSubject() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));
        ContactRequestInput input = new ContactRequestInput(
                "Reporter", "r@p.fr", null, "press",
                "Demande presse.", null, null, null
        );

        service.submit(input);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertTrue(captor.getValue().getSubject().contains("Presse"));
    }
}
```

### Step 7.2 : Vérifier que le test échoue

- [ ] Exécuter

```powershell
mvn -Dtest=ContactRequestServiceTest test
```

Attendu : compilation échoue (`ContactRequestService` ne prend pas encore `MailSettingsService` ; `MailSettingsService.getConfigSnapshot()` n'existe pas).

### Step 7.3 : Ajouter `getConfigSnapshot()` à `MailSettingsService`

- [ ] Modifier `backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java`. À l'intérieur de la classe, juste après `public JavaMailSender buildSender()`, ajouter :

```java
    /**
     * Renvoie l'entité brute (utile pour lire from/to sans repasser par le DTO).
     * Optional.empty() si la ligne n'existe pas.
     */
    @Transactional(readOnly = true)
    public Optional<MailSettingsEntity> getConfigSnapshot() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID);
    }
```

Et ajouter en haut, dans les imports : `import java.util.Optional;` (déplacer s'il y est déjà au bon endroit).

### Step 7.4 : Réécrire `ContactRequestService`

- [ ] Remplacer le contenu de `backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java` par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ContactRequestService {

    private static final Logger log = LoggerFactory.getLogger(ContactRequestService.class);

    private final ContactRequestRepository repository;
    private final MailSettingsService mailSettingsService;

    public ContactRequestService(ContactRequestRepository repository,
                                 MailSettingsService mailSettingsService) {
        this.repository = repository;
        this.mailSettingsService = mailSettingsService;
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
        JavaMailSender sender = mailSettingsService.buildSender();
        if (sender == null) {
            log.info("Mail delivery skipped (no SMTP sender) — contact request {} stored only", req.getId());
            return false;
        }
        Optional<MailSettingsEntity> cfg = mailSettingsService.getConfigSnapshot();
        if (cfg.isEmpty()
                || cfg.get().getToAddress() == null || cfg.get().getToAddress().isBlank()
                || cfg.get().getFromAddress() == null || cfg.get().getFromAddress().isBlank()) {
            log.info("Mail delivery skipped (from/to missing) — contact request {} stored only", req.getId());
            return false;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(cfg.get().getFromAddress());
            msg.setTo(cfg.get().getToAddress());
            msg.setReplyTo(req.getEmail());
            msg.setSubject(buildSubject(req));
            msg.setText(buildBody(req));
            sender.send(msg);
            return true;
        } catch (Exception ex) {
            log.warn("Failed to deliver contact mail for request {} — kept in DB", req.getId(), ex);
            return false;
        }
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

### Step 7.5 : Faire passer tous les tests backend

- [ ] Exécuter

```powershell
mvn test
```

Attendu : tous les tests passent. Si `JavaMailSender` est encore référencé par un test/composant non listé, suivre la trace de compilation et l'adapter — il ne doit plus rester d'auto-config Spring Mail bean dépendante de variables d'environnement.

### Step 7.6 : Commit

- [ ] Git

```powershell
git add backend/src/main/java/com/atelier/portfolio/service/MailSettingsService.java backend/src/main/java/com/atelier/portfolio/service/ContactRequestService.java backend/src/test/java/com/atelier/portfolio/service/ContactRequestServiceTest.java
git commit -m "refactor(contact): basculer ContactRequestService sur MailSettingsService"
```

---

## Task 8 : Frontend — modèles et service HTTP

**Files:**
- Create: `frontend/src/app/models/mail-settings.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`

### Step 8.1 : Créer le modèle

- [ ] Créer `frontend/src/app/models/mail-settings.model.ts`

```typescript
export type MailEncryption = 'NONE' | 'STARTTLS' | 'SSL';

export interface MailSettingsView {
  host: string | null;
  port: number | null;
  username: string | null;
  hasPassword: boolean;
  encryption: MailEncryption;
  fromAddress: string | null;
  toAddress: string | null;
  updatedAt: string;
}

export interface MailSettingsInput {
  host: string | null;
  port: number | null;
  username: string | null;
  password?: string;
  encryption: MailEncryption;
  fromAddress: string | null;
  toAddress: string | null;
}

export interface MailTestResult {
  success: boolean;
  error: string | null;
}
```

### Step 8.2 : Ajouter les méthodes au service

- [ ] Ouvrir `frontend/src/app/services/portfolio.service.ts`. En haut du fichier, après la ligne `import { ContactRequestInput, ContactRequestAck } from '../models/contact.model';`, ajouter :

```typescript
import { MailSettingsView, MailSettingsInput, MailTestResult } from '../models/mail-settings.model';
```

Puis, en fin de classe (juste avant la dernière accolade `}`), ajouter ces 3 méthodes :

```typescript
  getMailSettings(): Observable<MailSettingsView> {
    return this.http.get<MailSettingsView>(`${API}/admin/mail-settings`);
  }

  saveMailSettings(input: MailSettingsInput): Observable<MailSettingsView> {
    return this.http.put<MailSettingsView>(`${API}/admin/mail-settings`, input);
  }

  testMail(): Observable<MailTestResult> {
    return this.http.post<MailTestResult>(`${API}/admin/mail-settings/test`, {});
  }
```

### Step 8.3 : Compilation TypeScript

- [ ] Exécuter

```powershell
cd frontend
npx ng build --configuration=development
```

Attendu : compilation OK (warnings normaux mais pas d'erreurs).

### Step 8.4 : Commit

- [ ] Git

```powershell
git add frontend/src/app/models/mail-settings.model.ts frontend/src/app/services/portfolio.service.ts
git commit -m "feat(frontend): client portfolio pour /api/admin/mail-settings"
```

---

## Task 9 : Composant `MailSettingsComponent` (TDD)

**Files:**
- Create: `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts`
- Create: `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts`

### Step 9.1 : Écrire le test d'échec

- [ ] Créer `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts`

```typescript
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
    host: 'smtp.example.com',
    port: 587,
    username: 'user@example.com',
    hasPassword: true,
    encryption: 'STARTTLS',
    fromAddress: 'from@example.com',
    toAddress: 'to@example.com',
    updatedAt: '2026-05-17T10:00:00Z',
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

    expect(component.form.value.host).toBe('smtp.example.com');
    expect(component.form.value.port).toBe(587);
    expect(component.form.value.encryption).toBe('STARTTLS');
    expect(component.form.value.password).toBe('');
    expect(component.hasPassword()).toBeTrue();
  });

  it('omits the password key from the PUT payload when password input is empty', () => {
    flushInitialGet();
    component.form.patchValue({ host: 'smtp2.example.com' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.password).toBeUndefined();
    expect(req.request.body.host).toBe('smtp2.example.com');
    req.flush({ ...sampleView, host: 'smtp2.example.com' });
  });

  it('includes password in PUT payload when filled', () => {
    flushInitialGet();
    component.form.patchValue({ password: 'newsecret' });

    component.save();

    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/mail-settings');
    expect(req.request.body.password).toBe('newsecret');
    req.flush(sampleView);
  });

  it('disables the test button while the form is dirty', () => {
    flushInitialGet();
    expect(component.testDisabled()).toBeFalse();

    component.form.markAsDirty();

    expect(component.testDisabled()).toBeTrue();
  });

  it('disables the test button when required fields are missing', () => {
    flushInitialGet({
      host: null, port: null, username: null, hasPassword: false,
      encryption: 'NONE', fromAddress: null, toAddress: null,
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

### Step 9.2 : Vérifier l'échec

- [ ] Exécuter

```powershell
npx ng test --watch=false --include='**/mail-settings.component.spec.ts'
```

Attendu : échec de compilation (composant introuvable).

### Step 9.3 : Implémenter le composant

- [ ] Créer `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts`

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import {
  MailEncryption,
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
          Paramètres SMTP utilisés pour relayer les demandes de contact reçues sur le site.
          La connexion est testée avec la configuration <strong>enregistrée</strong> — pensez à sauvegarder avant de tester.
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="row">
          <label>Hôte SMTP
            <input type="text" formControlName="host" placeholder="smtp.example.com" />
          </label>
          <label>Port
            <input type="number" formControlName="port" min="1" max="65535" />
          </label>
        </div>

        <div class="row">
          <label>Chiffrement
            <select formControlName="encryption">
              <option value="NONE">Aucun</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL</option>
            </select>
          </label>
          <label>Identifiant
            <input type="text" formControlName="username" autocomplete="off" />
          </label>
        </div>

        <div class="row">
          <label>Mot de passe
            <input
              type="password"
              formControlName="password"
              autocomplete="new-password"
              [placeholder]="hasPassword() ? '••••• défini (laisser vide pour conserver)' : 'aucun mot de passe enregistré'"
            />
          </label>
        </div>

        <div class="row">
          <label>Adresse expéditeur
            <input type="email" formControlName="fromAddress" />
          </label>
          <label>Adresse destinataire
            <input type="email" formControlName="toAddress" />
          </label>
        </div>

        <div class="actions">
          <button type="submit" class="primary" [disabled]="saving()">Enregistrer</button>
          <button type="button" (click)="test()" [disabled]="testDisabled() || testing()">Envoyer un mail de test</button>
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
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .row label { display: block; font-size: 14px; }
    .row input, .row select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 16px; }
    button { padding: 10px 18px; border: 1px solid #222; background: #fff; cursor: pointer; }
    button.primary { background: #222; color: #fff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 12px; font-size: 14px; }
    .status.error { color: #b00020; }
    .meta { color: #666; font-size: 12px; margin-top: 8px; }
  `],
})
export class MailSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PortfolioService);

  readonly form: FormGroup = this.fb.group({
    host: [''],
    port: [null as number | null, [Validators.min(1), Validators.max(65535)]],
    encryption: ['NONE' as MailEncryption],
    username: [''],
    password: [''],
    fromAddress: ['', [Validators.email]],
    toAddress: ['', [Validators.email]],
  });

  readonly hasPassword = signal(false);
  readonly updatedAt = signal<string | null>(null);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusError = signal(false);
  readonly testResult = signal<MailTestResult | null>(null);

  readonly testDisabled = computed(() => {
    if (this.form.dirty) return true;
    const v = this.form.value;
    return !v.host || !v.port || !v.fromAddress || !v.toAddress;
  });

  constructor() {
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
      host: emptyToNull(v.host),
      port: v.port ?? null,
      username: emptyToNull(v.username),
      encryption: (v.encryption ?? 'NONE') as MailEncryption,
      fromAddress: emptyToNull(v.fromAddress),
      toAddress: emptyToNull(v.toAddress),
    };
    if (v.password && v.password.length > 0) {
      payload.password = v.password;
    }

    this.saving.set(true);
    this.testResult.set(null);
    this.api.saveMailSettings(payload).subscribe({
      next: view => {
        this.applyView(view);
        this.form.patchValue({ password: '' });
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
      host: view.host ?? '',
      port: view.port,
      encryption: view.encryption,
      username: view.username ?? '',
      password: '',
      fromAddress: view.fromAddress ?? '',
      toAddress: view.toAddress ?? '',
    });
    this.form.markAsPristine();
    this.hasPassword.set(view.hasPassword);
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

### Step 9.4 : Faire passer le test du composant

- [ ] Exécuter

```powershell
npx ng test --watch=false --include='**/mail-settings.component.spec.ts'
```

Attendu : tous les tests passent.

### Step 9.5 : Commit

- [ ] Git

```powershell
git add frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts
git commit -m "feat(admin): composant MailSettings pour configurer le SMTP"
```

---

## Task 10 : Intégrer le composant dans l'onglet admin

**Files:**
- Modify: `frontend/src/app/pages/admin/admin.component.ts`

### Step 10.1 : Étendre le type `Tab`

- [ ] Ouvrir `frontend/src/app/pages/admin/admin.component.ts`. À la ligne 32, remplacer :

```typescript
type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos' | 'home' | 'typography' | 'analytics';
```

par :

```typescript
type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos' | 'home' | 'typography' | 'analytics' | 'email';
```

### Step 10.2 : Importer le composant

- [ ] Ajouter l'import en haut du fichier (juste après `import { SlidesEditorComponent } from './slides-editor.component';`) :

```typescript
import { MailSettingsComponent } from './mail-settings/mail-settings.component';
```

Puis modifier le tableau `imports:` du décorateur `@Component` (ligne 44) pour y ajouter `MailSettingsComponent` :

```typescript
  imports: [ReactiveFormsModule, FormsModule, NgStyle, ReorderableDirective, SlidesEditorComponent, MailSettingsComponent],
```

### Step 10.3 : Ajouter le bouton d'onglet

- [ ] Dans le template, juste après le bouton « Analytics » (ligne 102, qui se termine par `(click)="switchTab('analytics')">Analytics</button>`), ajouter :

```html
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'email'"
              [class.active]="tab() === 'email'"
              (click)="switchTab('email')">Email</button>
```

### Step 10.4 : Ajouter le rendu conditionnel

- [ ] Dans le template, **juste avant** la balise fermante `</div>` qui clôt `<div class="admin-content">` (cette div ouvre ligne 105, et a `@if (tab() === 'analytics') { ... }` comme dernier bloc enfant, autour de la ligne 710), ajouter :

```html
        @if (tab() === 'email') {
          <app-mail-settings></app-mail-settings>
        }
```

### Step 10.5 : Ajouter `email` au map `tabLabels`

Le composant possède un `Record<Tab, string>` exhaustif vers la ligne 1653 ; étendre `Tab` à `'email'` casse le typecheck tant que la clé n'est pas ajoutée.

- [ ] Dans `frontend/src/app/pages/admin/admin.component.ts`, repérer le bloc :

```typescript
  private readonly tabLabels: Record<Tab, string> = {
    furniture: 'Mobilier',
    exhibitions: 'Expositions',
    texts: 'Textes du site',
    photos: 'Médiathèque',
    home: 'Accueil',
    typography: 'Typographie',
    analytics: 'Analytics',
  };
```

- [ ] Ajouter `email: 'Email',` à la fin du map (avant la `};` fermante).

### Step 10.6 : Lancer les tests du composant admin

- [ ] Exécuter

```powershell
npx ng test --watch=false --include='**/admin.component.spec.ts'
```

Attendu : pass. Si un test casse parce qu'il vérifie le nombre d'onglets ou la liste exhaustive des labels, l'adapter (ajouter `'Email'` à la liste attendue).

### Step 10.7 : Smoke manuel rapide

- [ ] Démarrer le backend et le frontend en local :

```powershell
# terminal 1
cd backend
$env:APP_SECRETS_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8="
mvn spring-boot:run
```

```powershell
# terminal 2
cd frontend
npm start
```

Puis dans un navigateur :
- Se connecter à `/login` avec les identifiants admin.
- Aller sur `/admin`, vérifier que l'onglet **Email** apparaît.
- Saisir une conf SMTP factice (par exemple `localhost` / `1025` pour MailHog ou un faux serveur), enregistrer.
- Vérifier que le bouton **Envoyer un mail de test** est activé seulement si on n'a pas de modif en attente et si les 4 champs requis sont remplis.

### Step 10.8 : Commit

- [ ] Git

```powershell
git add frontend/src/app/pages/admin/admin.component.ts
git commit -m "feat(admin): nouvel onglet Email pour configurer le SMTP"
```

---

## Task 11 : ADR `0013-config-smtp-en-base-chiffree.md`

**Files:**
- Create: `docs/adr/0013-config-smtp-en-base-chiffree.md`

### Step 11.1 : Lire le template

- [ ] Lire `docs/adr/template.md` pour reprendre la structure exacte (titre, statut, contexte, décision, conséquences, alternatives) — on doit s'aligner sur le format des ADR existants.

### Step 11.2 : Créer l'ADR

- [ ] Créer `docs/adr/0013-config-smtp-en-base-chiffree.md` en suivant le template. Contenu de référence (à adapter au format exact du template du repo) :

```markdown
# 0013 — Configuration SMTP éditable depuis l'admin, password chiffré en base

Statut : Accepté
Date : 2026-05-23

## Contexte

La configuration SMTP (host, port, credentials, expéditeur, destinataire) était fournie par variables d'environnement (`SPRING_MAIL_*`, `APP_CONTACT_MAIL_*`). Toute modification — changer de relai, faire tourner un mot de passe — exigeait un redéploiement Railway. Un seul opérateur administre l'instance, ce qui rend ce coût opérationnel disproportionné.

## Décision

- Stocker la configuration SMTP dans une table `mail_settings` (single-row, id = `'default'`).
- Exposer un écran dédié dans la console admin pour la lire/modifier.
- Chiffrer le password SMTP au repos avec AES-256-GCM ; clé via la variable d'environnement `APP_SECRETS_KEY` (base64 32 octets).
- En l'absence de `APP_SECRETS_KEY` : pas de crash au démarrage, mode dégradé, les envois sont silencieusement désactivés (WARN dans les logs).
- L'auto-configuration Spring Mail (properties `spring.mail.*`) n'est plus utilisée. `ContactRequestService` demande son `JavaMailSender` à `MailSettingsService.buildSender()` qui le construit à la volée à chaque envoi (pas de cache).

## Alternatives considérées

- **B. Garder les variables d'environnement comme fallback.** Rejeté : double source de configuration coûteuse à tester et à documenter pour une seule install à migrer.
- **C. Stocker le password en clair en base.** Rejeté : un dump SQL exposé compromettrait immédiatement les credentials SMTP.
- **D. KMS externe / Vault.** Hors de portée pour la taille actuelle du projet ; introduit un service à provisionner et à monitorer.

## Conséquences

Positives :
- L'admin peut faire tourner le compte SMTP ou changer de relai sans redéploiement.
- Le password reste chiffré au repos.

Négatives / risques :
- La perte de `APP_SECRETS_KEY` rend les passwords stockés indéchiffrables → l'admin doit ressaisir le password depuis le formulaire. Mitigation : documenter la sauvegarde de la clé côté infra (Railway > variables, sauvegarde hors-bande).
- Pas de rotation automatique de la clé. Si rotation nécessaire, procédure manuelle : déchiffrer avec l'ancienne, rechiffrer avec la nouvelle, mettre à jour `APP_SECRETS_KEY` puis redéployer. À documenter si le besoin se présente.

## Migration

Voir le plan d'implémentation `docs/superpowers/plans/2026-05-23-config-smtp-admin.md` (notamment Task 7 pour la bascule de `ContactRequestService`).
```

### Step 11.3 : Commit

- [ ] Git

```powershell
git add docs/adr/0013-config-smtp-en-base-chiffree.md
git commit -m "docs(adr): ADR-0013 config SMTP en base chiffree"
```

---

## Task 12 : Mettre à jour le README backend

**Files:**
- Modify: `backend/README.md`

### Step 12.1 : Lire le README

- [ ] Lire `backend/README.md` pour repérer la section qui liste les variables d'environnement (probablement « Configuration » ou « Variables d'environnement »).

### Step 12.2 : Ajouter `APP_SECRETS_KEY` et retirer les mentions SMTP

- [ ] Dans la section variables d'environnement :
  - **Ajouter** :
    ```
    APP_SECRETS_KEY   — clé AES-256 en base64 (32 octets). Générer avec : openssl rand -base64 32.
                        Utilisée pour chiffrer le mot de passe SMTP stocké en base.
                        Sans cette clé : pas de crash, mais les envois mail sont désactivés (WARN au démarrage).
    ```
  - **Retirer** (si présentes) toute mention de `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `APP_CONTACT_MAIL_TO`, `APP_CONTACT_MAIL_FROM` — remplacer par une note brève :
    ```
    La configuration SMTP (hôte, port, expéditeur, destinataire, password) se fait désormais depuis
    /admin > onglet « Email ». Voir ADR-0013.
    ```

### Step 12.3 : Commit

- [ ] Git

```powershell
git add backend/README.md
git commit -m "docs(backend): documenter APP_SECRETS_KEY et la config SMTP via admin"
```

---

## Task 13 : Validation finale — full test suite + smoke

### Step 13.1 : Tests backend complets

- [ ] Exécuter

```powershell
cd backend
mvn test
```

Attendu : tous les tests verts. Vérifier le rapport `target/site/jacoco/index.html` pour s'assurer qu'on n'a pas dégradé la couverture des classes touchées.

### Step 13.2 : Tests frontend complets

- [ ] Exécuter

```powershell
cd frontend
npx ng test --watch=false
```

Attendu : tous les tests verts, couverture ≥ 80 % maintenue (seuil enforced par `karma.conf.js`).

### Step 13.3 : Lancer la stack complète et vérifier le flow

- [ ] Démarrer en local :

```powershell
# Définir la clé pour le backend
$env:APP_SECRETS_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8="

# Stack
docker compose up --build
```

- [ ] Dans le navigateur :
  1. Se logger sur `/login` (admin).
  2. Aller sur `/admin`, onglet **Email**.
  3. Vérifier que le formulaire affiche l'état initial (vide, encryption `NONE`, `hasPassword=false`, placeholder « aucun mot de passe enregistré »).
  4. Saisir une conf avec un faux SMTP (`host=localhost`, `port=1025`, `encryption=NONE`, `from=test@local`, `to=studio@local`).
  5. Cliquer **Enregistrer** → statut « Configuration enregistrée ».
  6. Recharger la page → le formulaire est à nouveau pré-rempli avec ces valeurs.
  7. Cliquer **Envoyer un mail de test** → résultat (succès si MailHog tourne sur 1025, échec sinon — c'est le SMTP qui est testé, pas le code).
  8. Sur `/contact`, envoyer une demande de contact → vérifier en DB (`select id, mail_sent from contact_request order by created_at desc limit 1`) que `mail_sent` est `true`/`false` cohérent avec le succès de l'envoi.

### Step 13.4 : Vérifier que `APP_SECRETS_KEY` absente ne crashe pas

- [ ] Arrêter le backend, retirer la variable :

```powershell
Remove-Item Env:\APP_SECRETS_KEY
mvn spring-boot:run
```

- [ ] Vérifier dans les logs : un message WARN `APP_SECRETS_KEY is not set — SecretCipher in degraded mode`, et le démarrage va jusqu'au bout. Un GET sur `/api/admin/mail-settings` (avec JWT) renvoie l'état stocké, password masqué. Un POST `/api/admin/mail-settings/test` renvoie `{ "success": false, "error": "..." }` (200 ou 409). Une soumission `/contact` persiste avec `mail_sent=false`.

### Step 13.5 : Commit final (si rien d'autre à corriger)

Aucun changement de code attendu à cette étape — c'est de la validation. Si des bugs sont découverts, revenir en arrière sur la tâche concernée, corriger, retester, recommiter.

---

## Self-review — points vérifiés contre le spec

- ✅ Table `mail_settings` single-row id=`default`, colonnes nullables sauf id/encryption/updated_at (Task 2).
- ✅ `SecretCipher` AES-256-GCM, IV aléatoire 12 octets, tag 128 bits, format `b64(iv):b64(ct+tag)`, mode dégradé (Task 1).
- ✅ Endpoints `GET`/`PUT`/`POST /test` sur `/api/admin/mail-settings`, JWT par couverture `/api/admin/**` de `SecurityConfig` (Task 6).
- ✅ Masquage password en GET (`hasPassword`), préservation en PUT si vide (Tasks 5 + 9).
- ✅ Validation `@Email`, `@Pattern(NONE|STARTTLS|SSL)`, `@Min/@Max` port (Task 4).
- ✅ `POST /test` utilise la conf enregistrée et renvoie 409 si incomplète (Task 6).
- ✅ `ContactRequestService` bascule sur `MailSettingsService`, properties Spring Mail retirées (Task 7).
- ✅ Onglet « Email » dans la console admin existante, formulaire reactive + signals (Tasks 9 + 10).
- ✅ Bouton test désactivé tant que `dirty` ou champs requis manquants (Task 9 spec test).
- ✅ ADR créé (Task 11), README mis à jour (Task 12).
- ✅ Mode dégradé sans `APP_SECRETS_KEY` validé manuellement (Task 13.4).

Aucun placeholder restant — chaque step a son code, sa commande, ou son contenu.
