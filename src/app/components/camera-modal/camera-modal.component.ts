import { Component, ElementRef, EventEmitter, inject, OnDestroy, OnInit, Output, signal, viewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-camera-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-modal.component.html'
})
export class CameraModalComponent implements OnInit, OnDestroy {
  private readonly speechService = inject(SpeechService);

  @Output() photoCaptured = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  public readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  public readonly isStreaming: WritableSignal<boolean> = signal(false);
  public readonly errorMessage: WritableSignal<string | null> = signal(null);
  public readonly facingMode: WritableSignal<'environment' | 'user'> = signal('environment');

  private mediaStream: MediaStream | null = null;

  async ngOnInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /**
   * Démarre le flux vidéo en direct de la webcam / caméra du smartphone
   */
  public async startCamera(): Promise<void> {
    this.stopCamera();
    this.errorMessage.set(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L\'accès caméra direct n\'est pas supporté par ce navigateur.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.facingMode() },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      this.mediaStream = stream;
      this.isStreaming.set(true);

      const videoEl = this.videoRef()?.nativeElement;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Impossible d\'ouvrir la caméra directe:', err);
      this.isStreaming.set(false);
      this.errorMessage.set(
        err?.name === 'NotAllowedError'
          ? 'Permission caméra refusée. Veuillez autoriser la caméra dans votre navigateur.'
          : 'Impossible d\'activer la caméra directe. Vous pouvez importer une image ci-dessous.'
      );
    }
  }

  /**
   * Alterne entre caméra arrière et caméra avant
   */
  public async switchCamera(): Promise<void> {
    const nextMode = this.facingMode() === 'environment' ? 'user' : 'environment';
    this.facingMode.set(nextMode);
    await this.startCamera();
  }

  /**
   * Capture une photo haute résolution depuis le flux vidéo actif
   */
  public capturePhoto(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video || !this.isStreaming()) return;

    this.speechService.playAudioEffect('clue');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.88);

    this.stopCamera();
    this.photoCaptured.emit(base64Data);
  }

  /**
   * Arrête proprement les pistes vidéo
   */
  public stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isStreaming.set(false);
  }

  public onClose(): void {
    this.stopCamera();
    this.close.emit();
  }
}
