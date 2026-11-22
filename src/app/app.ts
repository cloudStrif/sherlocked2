import { Component, ElementRef, inject, signal, viewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { CameraService } from './services/camera.service';
import { SpeechService } from './services/speech.service';
import { SherlockAnalysis, MockCase } from './models/sherlock.model';
import { MOCK_CASES } from './data/mock-cases.data';
import { MindPalaceComponent } from './components/mind-palace/mind-palace.component';
import { ApiModalComponent } from './components/api-modal/api-modal.component';
import { CameraModalComponent } from './components/camera-modal/camera-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MindPalaceComponent, ApiModalComponent, CameraModalComponent],
  templateUrl: './app.html'
})
export class App {
  public readonly geminiService = inject(GeminiService);
  public readonly cameraService = inject(CameraService);
  public readonly speechService = inject(SpeechService);

  public readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  public readonly currentAnalysis: WritableSignal<SherlockAnalysis | null> = signal(null);
  public readonly showApiModal: WritableSignal<boolean> = signal(false);
  public readonly showCameraModal: WritableSignal<boolean> = signal(false);
  public readonly pendingImage: WritableSignal<{ data: string; mime: string } | null> = signal(null);
  public readonly mockCases: MockCase[] = MOCK_CASES;

  /**
   * Ouvre le viseur caméra en direct (Webcam PC / Caméra Smartphone)
   */
  public openLiveCamera(): void {
    this.speechService.playAudioEffect('scan');
    this.showCameraModal.set(true);
  }

  /**
   * Traitement d'une photo capturée depuis le viseur en direct
   */
  public async onCameraPhotoCaptured(dataUrl: string): Promise<void> {
    this.showCameraModal.set(false);
    await this.processImage(dataUrl, 'image/jpeg');
  }

  /**
   * Capture directe via appareil photo du smartphone (Capacitor)
   */
  public async captureWithCamera(): Promise<void> {
    this.openLiveCamera();
  }

  /**
   * Sélection depuis la galerie
   */
  public async selectFromGallery(): Promise<void> {
    const dataUrl = await this.cameraService.pickFromGallery();
    if (dataUrl) {
      await this.processImage(dataUrl);
    } else {
      this.fileInputRef()?.nativeElement.click();
    }
  }

  /**
   * Fallback input fichier pour test rapide sur navigateur desktop
   */
  public async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await this.processImage(base64, file.type);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  /**
   * Compresse et redimensionne une image pour accélérer l'analyse Gemini (de 10 Mo -> 75 Ko)
   */
  private async compressForAI(base64: string, maxDim: number = 1024, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  }

  /**
   * Déclenche la vraie analyse par Sherlock Holmes (Gemini Flash Vision)
   */
  public async processImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<void> {
    if (!this.geminiService.apiKey()) {
      this.pendingImage.set({ data: base64Image, mime: mimeType });
      this.showApiModal.set(true);
      return;
    }

    try {
      this.speechService.playAudioEffect('scan');
      // Compression instantanée pour accélérer l'envoi réseau de 10x à 50x
      const lightweightImage = await this.compressForAI(base64Image);
      // On envoie l'image allégée à l'IA, tout en gardant l'image haute définition pour l'affichage visuel
      const result = await this.geminiService.analyzeImage(lightweightImage, 'image/jpeg', base64Image);
      this.currentAnalysis.set(result);
    } catch (err) {
      console.error('Erreur lors de l\'analyse de l\'image:', err);
    }
  }

  public onApiKeySaved(): void {
    const pending = this.pendingImage();
    if (pending) {
      this.pendingImage.set(null);
      this.processImage(pending.data, pending.mime);
    }
  }

  /**
   * Charge un cas pré-établi de démonstration en 1 clic
   */
  public loadMockCase(caseItem: MockCase): void {
    this.speechService.playAudioEffect('clue');
    this.cameraService.triggerHapticFeedback();
    this.currentAnalysis.set({
      ...caseItem.analysis,
      analyzedAt: new Date()
    });
  }

  public resetInvestigation(): void {
    this.speechService.stopSpeaking();
    this.currentAnalysis.set(null);
    this.geminiService.errorMessage.set(null);
  }
}
