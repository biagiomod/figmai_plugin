package com.figmai.ace.wrapper.health;

import com.figmai.ace.wrapper.config.AceWrapperProperties;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.net.HttpURLConnection;
import java.net.URI;

/**
 * Custom health indicator that checks Node sidecar reachability.
 * Exposed via /actuator/health as "nodeBackend" status.
 */
@Component("nodeBackend")
public class NodeHealthIndicator implements HealthIndicator {

    private final AceWrapperProperties props;

    public NodeHealthIndicator(AceWrapperProperties props) {
        this.props = props;
    }

    @Override
    public Health health() {
        String baseUrl = props.getProxy().getNodeBaseUrl();
        try {
            HttpURLConnection conn = (HttpURLConnection)
                    URI.create(baseUrl + "/api/build-info").toURL().openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            int status = conn.getResponseCode();
            conn.disconnect();

            if (status >= 200 && status < 400) {
                return Health.up()
                        .withDetail("nodeUrl", baseUrl)
                        .withDetail("statusCode", status)
                        .build();
            } else {
                return Health.down()
                        .withDetail("nodeUrl", baseUrl)
                        .withDetail("statusCode", status)
                        .build();
            }
        } catch (Exception e) {
            return Health.down()
                    .withDetail("nodeUrl", baseUrl)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
