import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private readonly STORAGE_ELEVEN_KEY = 'sherlocked_elevenlabs_api_key';
  private readonly STORAGE_VOICE_KEY = 'sherlocked_elevenlabs_voice_id';

  public readonly elevenLabsApiKey: WritableSignal<string> = signal('');
  public readonly elevenLabsVoiceId: WritableSignal<string> = signal('');
  public readonly isSpeaking: WritableSignal<boolean> = signal(false);
  public readonly isLoadingAudio: WritableSignal<boolean> = signal(false);
  public readonly audioError: WritableSignal<string | null> = signal(null);

  private currentAudioElement: HTMLAudioElement | null = null;
  private cachedFrenchVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    const savedKey = localStorage.getItem(this.STORAGE_ELEVEN_KEY);
    const savedVoice = localStorage.getItem(this.STORAGE_VOICE_KEY);
    if (savedKey) this.elevenLabsApiKey.set(savedKey);
    if (savedVoice) this.elevenLabsVoiceId.set(savedVoice);

    this.initLocalVoices();
  }

  public setElevenLabsConfig(key: string, voiceId: string): void {
    const cleanKey = key.trim();
    const cleanVoice = voiceId.trim();

    this.elevenLabsApiKey.set(cleanKey);
    this.elevenLabsVoiceId.set(cleanVoice);
    this.audioError.set(null);

    if (cleanKey) {
      localStorage.setItem(this.STORAGE_ELEVEN_KEY, cleanKey);
    } else {
      localStorage.removeItem(this.STORAGE_ELEVEN_KEY);
    }

    if (cleanVoice) {
      localStorage.setItem(this.STORAGE_VOICE_KEY, cleanVoice);
    } else {
      localStorage.removeItem(this.STORAGE_VOICE_KEY);
    }
  }

  /**
   * Récite le monologue de Sherlock Holmes à voix haute
   * (En priorité avec la voix clonée ElevenLabs de Sherlock VF, sinon synthèse locale)
   */
  public async speakMonologue(text: string): Promise<void> {
    this.stopSpeaking();

    // 1. Essayer ElevenLabs si configuré
    const key = this.elevenLabsApiKey();
    const voiceId = this.elevenLabsVoiceId() || 'onwK4e9ZLuTAKqWW03F9'; // Voix baritone masculine par défaut si non spécifié

    if (key) {
      const success = await this.speakWithElevenLabs(text, key, voiceId);
      if (success) return;
    }

    // 2. Fallback vers la synthèse vocale locale calibrée
    this.speakWithLocalVoice(text);
  }

  /**
   * Synthèse vocale haute fidélité via ElevenLabs
   */
  private async speakWithElevenLabs(text: string, key: string, voiceId: string): Promise<boolean> {
    this.isLoadingAudio.set(true);
    this.audioError.set(null);

    try {
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.88,
            style: 0.25,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('Erreur ElevenLabs:', response.status, errText);
        this.audioError.set(`ElevenLabs (${response.status}) : Vérifiez votre clé ou quota.`);
        this.isLoadingAudio.set(false);
        return false;
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;

      audio.onplay = () => {
        this.isLoadingAudio.set(false);
        this.isSpeaking.set(true);
      };

      audio.onended = () => {
        this.isSpeaking.set(false);
        URL.revokeObjectURL(audioUrl);
        this.currentAudioElement = null;
      };

      audio.onerror = () => {
        this.isSpeaking.set(false);
        this.isLoadingAudio.set(false);
        URL.revokeObjectURL(audioUrl);
        this.currentAudioElement = null;
      };

      await audio.play();
      return true;
    } catch (err: any) {
      console.warn('Échec ElevenLabs, utilisation de la voix locale:', err);
      this.isLoadingAudio.set(false);
      return false;
    }
  }

  /**
   * Synthèse vocale locale du système calibrée style Sherlock
   */
  private speakWithLocalVoice(text: string): void {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis non supporté sur ce navigateur.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.12; // Débit vif et percutant
    utterance.pitch = 0.92; // Timbre plus grave et posé

    const voice = this.getBestFrenchVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    window.speechSynthesis.speak(utterance);
  }

  private initLocalVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedFrenchVoice = this.findFrenchVoice();
      };
      this.cachedFrenchVoice = this.findFrenchVoice();
    }
  }

  private getBestFrenchVoice(): SpeechSynthesisVoice | null {
    if (!this.cachedFrenchVoice) {
      this.cachedFrenchVoice = this.findFrenchVoice();
    }
    return this.cachedFrenchVoice;
  }

  private findFrenchVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const french = voices.filter(v => v.lang.startsWith('fr'));
    
    // Priorité voix masculines naturelles (Henri, Paul, Google français, etc.)
    const maleVoice = french.find(v => 
      v.name.includes('Henri') || 
      v.name.includes('Paul') || 
      v.name.includes('Claude') || 
      v.name.includes('Nicolas') || 
      v.name.includes('Natural') ||
      v.name.includes('Male')
    );

    return maleVoice || french[0] || null;
  }

  public stopSpeaking(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.isSpeaking.set(false);
    this.isLoadingAudio.set(false);
  }

  /**
   * Effets sonores synthétiques du Mind Palace (Web Audio API)
   */
  public playAudioEffect(type: 'scan' | 'clue' | 'verdict'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'scan') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'clue') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'verdict') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio fallback silencieux
    }
  }
}
