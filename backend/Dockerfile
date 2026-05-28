# --- Build stage : Maven + JDK 25 ---
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Runtime stage : JRE 25 minimal ---
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# su-exec : drop de privileges root -> app au demarrage (cf. entrypoint.sh).
# Necessaire car les volumes montes (Railway, K8s) sont root-owned et masquent
# le chown de l'image ; on doit donc chown le point de montage au runtime.
RUN apk add --no-cache su-exec
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /workspace/target/portfolio-backend-*.jar app.jar
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh && chown -R app:app /app \
    && mkdir -p /data/uploads && chown app:app /data/uploads
# Pas de `USER app` ici : le conteneur demarre en root pour pouvoir chown le
# volume monte, puis entrypoint.sh redescend vers `app` via su-exec.

EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -q -O- http://localhost:8080/actuator/health | grep -q UP || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["java", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=200", \
     "-XX:+UseStringDeduplication", \
     "-Xms256m", "-Xmx512m", \
     "-jar", "/app/app.jar"]
