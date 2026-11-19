package com.nexus.grpc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan("com.nexus.common.entity")
@EnableJpaRepositories("com.nexus.common.repository")
public class NexusGrpcApplication {
    public static void main(String[] args) {
        SpringApplication.run(NexusGrpcApplication.class, args);
    }
}
