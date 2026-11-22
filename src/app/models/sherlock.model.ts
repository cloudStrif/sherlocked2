export interface SherlockClue {
  id: string;
  label: string;
  deduction: string;
  x: number; // 5% à 90% pour être visible sur la photo
  y: number; // 10% à 85%
  category: 'behaviour' | 'profession' | 'origin' | 'timeline' | 'secrets';
  categoryLabel: string;
  confidence: number;
}

export interface SherlockAnalysis {
  subject: string;
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
