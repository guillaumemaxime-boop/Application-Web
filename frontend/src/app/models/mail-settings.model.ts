export interface MailSettingsView {
  fromAddress: string | null;
  toAddress: string | null;
  apiKeyConfigured: boolean;
  updatedAt: string;
}

export interface MailSettingsInput {
  fromAddress: string | null;
  toAddress: string | null;
}

export interface MailTestResult {
  success: boolean;
  error: string | null;
}
