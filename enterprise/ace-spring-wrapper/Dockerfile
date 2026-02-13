# ============================================================================
# ACE Spring Wrapper — Multi-stage Docker build
# Build:  docker build -t ace-spring-wrapper .
# Run:    docker run -p 8080:8080 ace-spring-wrapper
# Config: Mount a custom-ace.yml and pass as additional config location:
#   docker run -p 8080:8080 \
#     -v /path/to/custom-ace.yml:/app/custom-ace.yml:ro \
#     ace-spring-wrapper \
#     --spring.config.additional-location=file:/app/custom-ace.yml
# ============================================================================

# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
# Cache dependencies first
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# --- Stage 2: Runtime ---
FROM eclipse-temurin:17-jre-alpine
LABEL maintainer="ACE team"
LABEL description="ACE Spring Wrapper — reverse proxy for custom deployments"

RUN addgroup -S ace && adduser -S ace -G ace
WORKDIR /app

COPY --from=build /build/target/*.jar app.jar
RUN chown -R ace:ace /app

USER ace
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
