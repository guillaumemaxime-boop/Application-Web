package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.service.MailSettingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminMailSettingsControllerTest {

    @Mock private MailSettingsService service;
    @InjectMocks private AdminMailSettingsController controller;

    @Test
    void get_returnsServiceView() {
        MailSettingsView view = new MailSettingsView(
                "from@x", "to@x", true, "2026-05-24T00:00:00Z");
        when(service.get()).thenReturn(view);

        MailSettingsView result = controller.get();

        assertSame(view, result);
    }

    @Test
    void put_delegatesToServiceSave() {
        MailSettingsInput input = new MailSettingsInput("f@x", "t@x");
        MailSettingsView view = new MailSettingsView("f@x", "t@x", true, "now");
        when(service.save(any(MailSettingsInput.class))).thenReturn(view);

        MailSettingsView result = controller.put(input);

        verify(service).save(input);
        assertSame(view, result);
    }

    @Test
    void test_success_returns200WithResult() {
        when(service.sendTest()).thenReturn(MailTestResult.ok());

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(200, resp.getStatusCode().value());
        assertTrue(resp.getBody().success());
    }

    @Test
    void test_incompleteConfig_returns409() {
        when(service.sendTest()).thenReturn(MailTestResult.failure("incomplete"));

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(409, resp.getStatusCode().value());
        assertFalse(resp.getBody().success());
    }

    @Test
    void test_resendFailure_returns200WithErrorBody() {
        when(service.sendTest()).thenReturn(MailTestResult.failure("Resend a refusé l'envoi"));

        ResponseEntity<MailTestResult> resp = controller.test();

        assertEquals(200, resp.getStatusCode().value());
        assertFalse(resp.getBody().success());
        assertTrue(resp.getBody().error().contains("Resend"));
    }
}
