package com.figmai.ace.wrapper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ACE Spring Wrapper — optional reverse-proxy for custom deployments.
 * Provides auth hooks, RBAC, audit logging, and strict route allowlisting.
 * Node ACE runs as a localhost-only sidecar; Spring is the only externally reachable service.
 */
@SpringBootApplication
public class AceWrapperApplication {
    public static void main(String[] args) {
        SpringApplication.run(AceWrapperApplication.class, args);
    }
}
