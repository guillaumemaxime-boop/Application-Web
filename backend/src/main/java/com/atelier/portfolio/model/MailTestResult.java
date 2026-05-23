package com.atelier.portfolio.model;

public record MailTestResult(boolean success, String error) {

    public static MailTestResult ok() {
        return new MailTestResult(true, null);
    }

    public static MailTestResult failure(String error) {
        String safe = error == null ? "unknown error" : error;
        if (safe.length() > 500) {
            safe = safe.substring(0, 500);
        }
        return new MailTestResult(false, safe);
    }
}
