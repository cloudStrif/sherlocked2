export interface SherlockClue {
  id: string;
  label: string;
  deduction: string;
  x: number; // 5% à 90% pour être visible sur la photo
  y: number; // 10% à 85%
  category: 'behaviour' | 'profession' | 'origin' | 'timeline' | 'secrets' | 'identification';
  categoryLabel: string;
  confidence: number;
}

export interface IdentificationFact {
  label: string;
  value: string;
  icon: string;
}

export interface ImageIdentification {
  mainSubject: string;
  category: 'sports' | 'celebrity' | 'event' | 'place' | 'object' | 'animal' | 'artwork' | 'vehicle' | 'food' | 'nature' | 'other';
  categoryLabel: string;
  eventName?: string;
  dateOrPeriod?: string;
  location?: string;
  facts: IdentificationFact[];
  unseenDetails: string[];
  summary: string;
  deductionNote?: string;
}

export interface SherlockAnalysis {
  subject: string;
  identification: ImageIdentification;
  targetPersonProfile: string;
  verdict: string;
  clues: SherlockClue[];
  floatingKeywords: string[];
  speechMonologue: string;
  analyzedAt: Date;
  imageSrc: string;
}

export interface MockCase {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  analysis: SherlockAnalysis;
}
