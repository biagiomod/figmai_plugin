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
# Use jammy (Ubuntu) base instead of Alpine: eclipse-temurin Alpine images do not
# publish linux/arm64 manifests, which breaks builds on Apple Silicon (M1/M2/M3).
# jammy is multi-arch (amd64 + arm64) and functionally equivalent.
FROM eclipse-temurin:17-jre-jammy
LABEL maintainer="ACE team"
LABEL description="ACE Spring Wrapper — reverse proxy for custom deployments"

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && groupadd --system ace && useradd --system --gid ace ace
WORKDIR /app

COPY --from=build /build/target/*.jar app.jar
RUN chown -R ace:ace /app

USER ace
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
