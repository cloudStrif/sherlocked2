import { Component, ElementRef, inject, signal, viewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { CameraService } from './services/camera.service';
import { SpeechService } from './services/speech.service';
import { CapturedPhoto, TextExtractionResult } from './models/sherlock.model';
import { ExtractionResultComponent } from './components/extraction-result/extraction-result.component';
import { ApiModalComponent } from './components/api-modal/api-modal.component';
import { CameraModalComponent } from './components/camera-modal/camera-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ExtractionResultComponent, ApiModalComponent, CameraModalComponent],
  templateUrl: './app.html'
})
export class App {
  public readonly geminiService = inject(GeminiService);
  public readonly cameraService = inject(CameraService);
  public readonly speechService = inject(SpeechService);

  public readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  public readonly capturedPhotos: WritableSignal<CapturedPhoto[]> = signal([]);
  public readonly extractionResult: WritableSignal<TextExtractionResult | null> = signal(null);
  public readonly showApiModal: WritableSignal<boolean> = signal(false);
  public readonly showCameraModal: WritableSignal<boolean> = signal(false);

  private pendingExtraction = false;

  public openLiveCamera(): void {
    this.speechService.playAudioEffect('scan');
    this.showCameraModal.set(true);
  }

  public onCameraPhotoCaptured(dataUrl: string): void {
    this.showCameraModal.set(false);
    this.addPhoto(dataUrl, 'image/jpeg', `Photo caméra ${this.capturedPhotos().length + 1}`);
  }

  public async selectFromGallery(): Promise<void> {
    this.fileInputRef()?.nativeElement.click();
  }

  public async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    for (const file of files) {
      const dataUrl = await this.readFileAsDataUrl(file);
      if (dataUrl) {
        this.addPhoto(dataUrl, file.type || 'image/jpeg', file.name);
      }
    }
    input.value = '';
  }

  private readFileAsDataUrl(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  private addPhoto(dataUrl: string, mimeType: string, name: string): void {
    const photo: CapturedPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl,
      mimeType,
      name
    };
    this.capturedPhotos.update(list => [...list, photo]);
    this.geminiService.errorMessage.set(null);
  }

  public removePhoto(id: string): void {
    this.capturedPhotos.update(list => list.filter(p => p.id !== id));
  }

  public movePhoto(index: number, direction: -1 | 1): void {
    const list = [...this.capturedPhotos()];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(targetIndex, 0, item);
    this.capturedPhotos.set(list);
  }

  public clearPhotos(): void {
    this.capturedPhotos.set([]);
    this.geminiService.errorMessage.set(null);
  }

  /**
   * Optimise la taille des photos tout en conservant une haute netteté pour la lecture du code (1600px)
   */
  private async optimizeForOCR(base64: string, maxDim: number = 1600, quality: number = 0.88): Promise<string> {
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

  public async extractAllPhotos(): Promise<void> {
    const photos = this.capturedPhotos();
    if (!photos.length) return;

    if (!this.geminiService.apiKey()) {
      this.pendingExtraction = true;
      this.showApiModal.set(true);
      return;
    }

    try {
      this.speechService.playAudioEffect('scan');
      const optimized = await Promise.all(
        photos.map(async (photo) => ({
          base64: await this.optimizeForOCR(photo.dataUrl),
          mimeType: 'image/jpeg'
        }))
      );

      const displayUrls = photos.map(p => p.dataUrl);
      const result = await this.geminiService.extractTextFromImages(optimized, displayUrls);
      this.extractionResult.set(result);
    } catch (err) {
      console.error('Erreur lors de l\'extraction du texte:', err);
    }
  }

  public onApiKeySaved(): void {
    if (this.pendingExtraction && this.capturedPhotos().length > 0) {
      this.pendingExtraction = false;
      this.extractAllPhotos();
    }
  }

  public resetScan(): void {
    this.extractionResult.set(null);
    this.capturedPhotos.set([]);
    this.geminiService.errorMessage.set(null);
  }
}
