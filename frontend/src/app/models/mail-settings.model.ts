export type MailEncryption = 'NONE' | 'STARTTLS' | 'SSL';

export interface MailSettingsView {
  host: string | null;
  port: number | null;
  username: string | null;
  hasPassword: boolean;
  encryption: MailEncryption;
  fromAddress: string | null;
  toAddress: string | null;
  updatedAt: string;
}

export interface MailSettingsInput {
  host: string | null;
  port: number | null;
  username: string | null;
  password?: string;
  encryption: MailEncryption;
  fromAddress: string | null;
  toAddress: string | null;
}

export interface MailTestResult {
  success: boolean;
  error: string | null;
}
