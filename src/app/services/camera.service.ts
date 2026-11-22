import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  /**
   * Capture une photo via l'appareil photo du smartphone (Capacitor)
   * avec fallback transparent vers fichier local si sur navigateur web
   */
  public async capturePhoto(): Promise<string | null> {
    try {
      this.triggerHapticFeedback();
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return image.dataUrl || null;
    } catch (err: any) {
      console.warn('Capacitor Camera non disponible ou annulée, utilisation du fallback web:', err?.message);
      return null;
    }
  }

  /**
   * Sélectionne une image depuis la galerie du smartphone
   */
  public async pickFromGallery(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return image.dataUrl || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Vibration haptique sur smartphone Android
   */
  public async triggerHapticFeedback(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Ignorer si non disponible
    }
  }
}
