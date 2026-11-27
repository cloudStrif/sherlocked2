import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextExtractionResult } from '../../models/sherlock.model';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'app-extraction-result',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './extraction-result.component.html'
})
export class ExtractionResultComponent implements OnChanges {
  private readonly cameraService = inject(CameraService);

  @Input({ required: true }) result!: TextExtractionResult;
  @Output() newScan = new EventEmitter<void>();

  public readonly editableText: WritableSignal<string> = signal('');
  public readonly filename: WritableSignal<string> = signal('extraction.txt');
  public readonly isCopied: WritableSignal<boolean> = signal(false);
  public readonly isEditing: WritableSignal<boolean> = signal(false);
  public readonly wrapLines: WritableSignal<boolean> = signal(true);
  public readonly showPhotos: WritableSignal<boolean> = signal(false);

  public readonly lineCount = computed(() => {
    const text = this.editableText();
    return text ? text.split('\n').length : 0;
  });

  public readonly charCount = computed(() => this.editableText().length);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result'] && this.result) {
      this.editableText.set(this.result.extractedText);
      this.filename.set(this.result.suggestedFilename || 'extraction.txt');
      this.isEditing.set(false);
      this.isCopied.set(false);
    }
  }

  public async copyText(): Promise<void> {
    const content = this.editableText();
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      this.isCopied.set(true);
      this.cameraService.triggerHapticFeedback();
      setTimeout(() => this.isCopied.set(false), 2000);
    } catch {
      // Fallback textarea si clipboard API indisponible
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    }
  }

  public downloadFile(): void {
    const content = this.editableText();
    const targetName = this.filename().trim() || 'extraction.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = targetName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    this.cameraService.triggerHapticFeedback();
  }

  public toggleEditMode(): void {
    this.isEditing.update(v => !v);
  }

  public toggleWrapLines(): void {
    this.wrapLines.update(v => !v);
  }

  public toggleShowPhotos(): void {
    this.showPhotos.update(v => !v);
  }
}
