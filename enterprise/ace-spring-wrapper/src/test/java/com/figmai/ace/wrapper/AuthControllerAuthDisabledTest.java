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
        "ace.security.enable-auth=false",
        "ace.security.dev-stub-auth=false",
        "ace.proxy.wrapper-token=test-wrapper-token",
        "ace.proxy.node-base-url=http://127.0.0.1:3333"
})
@AutoConfigureMockMvc
class AuthControllerAuthDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void meReturnsAceCompatibleShapeWhenAuthIsDisabled() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("dev-user@example.com"))
                .andExpect(jsonPath("$.user.email").value("dev-user@example.com"))
                .andExpect(jsonPath("$.user.role").value("admin"))
                .andExpect(jsonPath("$.allowedTabs[0]").value("config"))
                .andExpect(jsonPath("$.allowedTabs[1]").value("ai"))
                .andExpect(jsonPath("$.allowedTabs[2]").value("assistants"))
                .andExpect(jsonPath("$.allowedTabs[3]").value("knowledge-bases"))
                .andExpect(jsonPath("$.allowedTabs[4]").value("content-models"))
                .andExpect(jsonPath("$.allowedTabs[5]").value("registries"))
                .andExpect(jsonPath("$.allowedTabs[6]").value("analytics"))
                .andExpect(jsonPath("$.allowedTabs[7]").value("users"));
    }
}
