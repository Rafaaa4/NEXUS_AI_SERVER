FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/nexus-soap-service-1.0.0-SNAPSHOT.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
