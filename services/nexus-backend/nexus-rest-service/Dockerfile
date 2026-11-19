FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/nexus-rest-service-1.0.0-SNAPSHOT.jar app.jar
COPY bin/ /app/bin/
EXPOSE 4000
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
