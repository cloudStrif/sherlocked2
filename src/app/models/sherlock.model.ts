export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  mimeType: string;
  name: string;
}

export interface TextExtractionResult {
  title: string;
  contentType: 'code' | 'text' | 'mixed';
  language: string;
  suggestedFilename: string;
  extractedText: string;
  summary: string;
  photoCount: number;
  photos: string[];
  extractedAt: Date;
}
