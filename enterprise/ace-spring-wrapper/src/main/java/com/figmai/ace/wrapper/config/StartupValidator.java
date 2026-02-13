package com.figmai.ace.wrapper.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Validates critical configuration at startup. Fails fast on unsafe defaults.
 */
@Component
public class StartupValidator {

    private static final Logger log = LoggerFactory.getLogger(StartupValidator.class);

    /** Placeholder values that must be replaced before deployment. */
    private static final Set<String> PLACEHOLDER_TOKENS = Set.of(
            "", "REPLACE_ME_LONG_RANDOM", "REPLACE_ME", "changeme", "test", "secret"
    );

    private final AceWrapperProperties props;

    public StartupValidator(AceWrapperProperties props) {
        this.props = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        validateWrapperToken();
    }

    private void validateWrapperToken() {
        String token = props.getProxy().getWrapperToken();
        if (token == null || PLACEHOLDER_TOKENS.contains(token.trim())) {
            throw new IllegalStateException(
                "SECURITY ERROR: ace.proxy.wrapper-token is not configured or still uses a " +
                "placeholder value ('" + token + "'). Generate a strong random token: " +
                "openssl rand -hex 32"
            );
        }
        if (token.length() < 32) {
            log.warn("WARNING: ace.proxy.wrapper-token is shorter than 32 characters. " +
                     "Consider using a longer token for production (openssl rand -hex 32).");
        }
    }
}
