import { Component, EventEmitter, Input, OnInit, Output, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SherlockAnalysis, SherlockClue } from '../../models/sherlock.model';
import { SpeechService } from '../../services/speech.service';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-mind-palace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mind-palace.component.html'
})
export class MindPalaceComponent implements OnInit {
  public readonly speechService = inject(SpeechService);
  private readonly cameraService = inject(CameraService);

  @Input({ required: true }) analysis!: SherlockAnalysis;
  @Output() newInvestigation = new EventEmitter<void>();

  // Indices révélés progressivement (Effet BBC Sherlock)
  public readonly visibleCluesCount: WritableSignal<number> = signal(1);
  public readonly selectedClue: WritableSignal<SherlockClue | null> = signal(null);
  public readonly isCopied: WritableSignal<boolean> = signal(false);
  public readonly activeTab: WritableSignal<'mindpalace' | 'monologue'> = signal('mindpalace');

  ngOnInit(): void {
    this.speechService.playAudioEffect('verdict');
    this.cameraService.triggerHapticFeedback();
    
    // Défilement automatique progressif des indices (1 par 1 toutes les 1.2s)
    this.startAutoReveal();
  }

  private startAutoReveal(): void {
    const total = this.analysis.clues.length;
    let current = 1;
    const interval = setInterval(() => {
      if (current < total) {
        current++;
        this.visibleCluesCount.set(current);
        this.speechService.playAudioEffect('clue');
        this.cameraService.triggerHapticFeedback();
      } else {
        clearInterval(interval);
      }
    }, 1200);
  }

  public revealAllClues(): void {
    this.visibleCluesCount.set(this.analysis.clues.length);
    this.speechService.playAudioEffect('clue');
  }

  public selectClue(clue: SherlockClue): void {
    this.selectedClue.set(this.selectedClue() === clue ? null : clue);
    this.speechService.playAudioEffect('clue');
    this.cameraService.triggerHapticFeedback();
  }

  public toggleSpeech(): void {
    if (this.speechService.isSpeaking()) {
      this.speechService.stopSpeaking();
    } else {
      this.speechService.speakMonologue(this.analysis.speechMonologue);
    }
  }

  public async copyMonologue(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.analysis.speechMonologue);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
      this.cameraService.triggerHapticFeedback();
    } catch {
      // Fallback
    }
  }
}
