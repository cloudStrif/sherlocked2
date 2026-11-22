import { Component, EventEmitter, inject, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-api-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-modal.component.html'
})
export class ApiModalComponent {
  public readonly geminiService = inject(GeminiService);
  public readonly speechService = inject(SpeechService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  public activeTab: WritableSignal<'gemini' | 'elevenlabs'> = signal('gemini');

  public inputGeminiKey = this.geminiService.apiKey();
  public inputElevenKey = this.speechService.elevenLabsApiKey();
  public inputVoiceId = this.speechService.elevenLabsVoiceId();

  // État du test de clé Gemini
  public isTestingGeminiKey: WritableSignal<boolean> = signal(false);
  public geminiTestResult: WritableSignal<{ success: boolean; message: string } | null> = signal(null);

  public saveConfig(): void {
    this.geminiService.setApiKey(this.inputGeminiKey);
    this.speechService.setElevenLabsConfig(this.inputElevenKey, this.inputVoiceId);
    this.saved.emit();
    this.close.emit();
  }

  public async testGeminiKey(): Promise<void> {
    if (!this.inputGeminiKey.trim()) {
      this.geminiTestResult.set({
        success: false,
        message: 'Veuillez saisir ou coller une clé d\'abord.'
      });
      return;
    }

    this.isTestingGeminiKey.set(true);
    this.geminiTestResult.set(null);

    try {
      const result = await this.geminiService.testApiKey(this.inputGeminiKey);
      this.geminiTestResult.set(result);
    } catch (err: any) {
      this.geminiTestResult.set({
        success: false,
        message: err?.message || 'Erreur inconnue lors du test.'
      });
    } finally {
      this.isTestingGeminiKey.set(false);
    }
  }

  public testSherlockVoice(): void {
    this.speechService.setElevenLabsConfig(this.inputElevenKey, this.inputVoiceId);
    this.speechService.speakMonologue(
      'Je ne suis pas un psychopathe, Anderson. Je suis un sociopathe de haut niveau. Renseignez-vous.'
    );
  }

  public removeGeminiKey(): void {
    this.geminiService.setApiKey('');
    this.inputGeminiKey = '';
    this.geminiTestResult.set(null);
  }

  public removeElevenKey(): void {
    this.speechService.setElevenLabsConfig('', '');
    this.inputElevenKey = '';
    this.inputVoiceId = '';
  }
}
