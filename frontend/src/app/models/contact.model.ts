export type ContactInterest = 'acquisition' | 'order' | 'press' | 'other';

export interface ContactRequestInput {
  name: string;
  email: string;
  phone: string;
  interest: ContactInterest;
  message: string;
  furnitureId: string;
  furnitureSlug: string;
  furnitureTitle: string;
}

export interface ContactRequestAck {
  id: string;
  createdAt: string;
  status: string;
}
