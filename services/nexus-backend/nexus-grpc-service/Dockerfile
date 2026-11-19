FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/nexus-grpc-service-1.0.0-SNAPSHOT.jar app.jar
EXPOSE 9090
EXPOSE 8083
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
