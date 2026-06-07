export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: string;
  tags: string[];
  format?: string;
  sizeBytes?: number;
}
