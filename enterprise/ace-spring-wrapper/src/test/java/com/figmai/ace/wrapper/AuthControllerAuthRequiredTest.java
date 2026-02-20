package com.figmai.ace.wrapper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "ace.security.enable-auth=true",
        "ace.security.dev-stub-auth=false",
        "ace.proxy.wrapper-token=test-wrapper-token",
        "ace.proxy.node-base-url=http://127.0.0.1:3333"
})
@AutoConfigureMockMvc
class AuthControllerAuthRequiredTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void meReturns401WhenNoAuthenticatedPrincipalExists() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());
    }
}
