import { PresetOverride, PresetSound } from '../types';
import { getCustomAudioBlob } from './audioDb';

export const PRESET_SOUNDS: PresetSound[] = [
  {
    id: 'westminster_8',
    name: 'Lonceng Westminster (8 Nada)',
    description: 'Melodi lonceng sekolah klasik legendaris, paling cocok untuk bel masuk & pulang.',
    category: 'Lonceng Klasik',
    durationEstimate: '~6 detik',
    recommendedFor: 'Masuk & Pulang',
  },
  {
    id: 'westminster_4',
    name: 'Lonceng Westminster Singkat (4 Nada)',
    description: 'Melodi pendek lonceng 4 nada, ideal untuk pergantian jam pelajaran.',
    category: 'Lonceng Klasik',
    durationEstimate: '~3 detik',
    recommendedFor: 'Pergantian Jam',
  },
  {
    id: 'westminster_16',
    name: 'Lonceng Westminster Penuh (16 Nada)',
    description: 'Melodi lonceng katedral lengkap dan megah, sangat cocok untuk bel masuk pagi dan upacara.',
    category: 'Lonceng Klasik',
    durationEstimate: '~11 detik',
    recommendedFor: 'Masuk Pagi / Upacara',
  },
  {
    id: 'modern_chime_3',
    name: 'Chime Melodis Tiga Nada',
    description: 'Nada modern ceria bernuansa ramah, cocok untuk jam istirahat.',
    category: 'Modern',
    durationEstimate: '~4 detik',
    recommendedFor: 'Istirahat',
  },
  {
    id: 'modern_chime_5',
    name: 'Melodi Ceria Lima Nada (Pentatonik)',
    description: 'Rangkaian nada ceria dan segar penanda waktu rehat dan istirahat siang.',
    category: 'Modern',
    durationEstimate: '~4 detik',
    recommendedFor: 'Istirahat / Santai',
  },
  {
    id: 'ding_dong_dual',
    name: 'Ding-Dong Tabung Dua Nada',
    description: 'Bunyi lonceng tubular santai dengan gaung elegan.',
    category: 'Modern',
    durationEstimate: '~3 detik',
    recommendedFor: 'Peringatan Singkat',
  },
  {
    id: 'triple_ding_dong',
    name: 'Ding-Dong Tiga Nada (Chime Pengumuman)',
    description: 'Nada elegan standar bandara & stasiun modern sebelum pengumuman penting dibacakan.',
    category: 'Modern',
    durationEstimate: '~4 detik',
    recommendedFor: 'Pengumuman Resmi',
  },
  {
    id: 'electric_bell',
    name: 'Bel Elektrik Tradisional (Kringgg)',
    description: 'Suara bel kring mekanik khas sekolah yang tegas dan terdengar lantang.',
    category: 'Elektrik',
    durationEstimate: '~4 detik',
    recommendedFor: 'Sekolah Klasik',
  },
  {
    id: 'gentle_marimba',
    name: 'Marimba Arpeggio Nada Hangat',
    description: 'Petikan bilah kayu marimba yang menenangkan untuk pergantian sesi santai.',
    category: 'Akustik',
    durationEstimate: '~3 detik',
    recommendedFor: 'Ganti Jam Santai',
  },
  {
    id: 'vibraphone_jazz',
    name: 'Vibrafon Lembut & Hangat',
    description: 'Harmoni logam lembut bervibrato halus, sangat menenangkan dan ramah telinga.',
    category: 'Akustik',
    durationEstimate: '~4 detik',
    recommendedFor: 'Ibadah / Sholat',
  },
  {
    id: 'school_horn',
    name: 'Terompet Panggilan Sekolah (Fanfare)',
    description: 'Tiupan nada horn fanfare yang bersemangat untuk memanggil peserta apel atau kumpul.',
    category: 'Peringatan',
    durationEstimate: '~4 detik',
    recommendedFor: 'Apel / Kumpul',
  },
  {
    id: 'digital_beep',
    name: 'Beep Elektronik Modern (Dual Tone)',
    description: 'Sinyal digital presisi dan tajam penanda waktu ujian atau tes.',
    category: 'Elektrik',
    durationEstimate: '~2 detik',
    recommendedFor: 'Ujian / Tes',
  },
  {
    id: 'siren_alert',
    name: 'Sirene Darurat & Simulasi Evakuasi',
    description: 'Peringatan nada tinggi untuk latihan evakuasi bencana atau keadaan darurat.',
    category: 'Peringatan',
    durationEstimate: '~5 detik',
    recommendedFor: 'Simulasi / Darurat',
  },
];

type PlaybackListener = (isPlaying: boolean, title?: string) => void;

class SchoolAudioEngine {
  private ctx: AudioContext | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isCurrentlyPlaying: boolean = false;
  private currentTitle: string = '';
  private listeners: Set<PlaybackListener> = new Set();
  private isSynthesizing: boolean = false;
  private presetOverrides: Record<string, PresetOverride> = {};
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    // Warm up voice list and listen to voiceschanged event (critical for Android & Huawei browsers)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.cachedVoices = window.speechSynthesis.getVoices();
        };
      } catch {
        // ignore
      }
    }
  }

  public checkSpeechVoiceSupport(): { supported: boolean; hasIndonesian: boolean; voicesCount: number; voiceName?: string } {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { supported: false, hasIndonesian: false, voicesCount: 0 };
    }
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith('id') ||
      v.lang.toLowerCase().includes('indonesia') ||
      v.name.toLowerCase().includes('indonesia')
    );
    return {
      supported: true,
      hasIndonesian: !!idVoice,
      voicesCount: voices.length,
      voiceName: idVoice ? idVoice.name : (voices[0]?.name || undefined)
    };
  }

  public setPresetOverrides(overrides: Record<string, PresetOverride>): void {
    this.presetOverrides = overrides || {};
  }

  public getPresetOverrides(): Record<string, PresetOverride> {
    return this.presetOverrides;
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.isCurrentlyPlaying, this.currentTitle);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.isCurrentlyPlaying, this.currentTitle));
  }

  public async getAudioContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }
    return this.ctx;
  }

  /**
   * Unlocks both Web Audio API and HTMLMediaElement pipelines using the user's gesture,
   * and initializes an inaudible background keep-alive to protect against background tab freezing.
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = await this.getAudioContext();

      // 1. Play an imperceptible beep to satisfy browser audio autoplay policy for Web Audio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      // 2. Prime HTML5 Audio pipeline with tiny silent audio to unlock <audio> autoplay in background
      try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentAudio.volume = 0.01;
        const p = silentAudio.play();
        if (p !== undefined) {
          p.then(() => {
            silentAudio.pause();
          }).catch(() => {});
        }
      } catch {
        // ignore
      }

      // 3. Prime and resume SpeechSynthesis so background timer bells can trigger voice announcements
      if ('speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          // Warm up voice list
          if (this.cachedVoices.length === 0) {
            this.cachedVoices = window.speechSynthesis.getVoices();
          }
        } catch {
          // ignore
        }
      }

      // 4. Start inaudible background keep-alive node to prevent background throttling
      this.startBackgroundKeepAlive();

      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  /**
   * Starts an ultra-low-power, inaudible oscillator connected to destination
   * which signals to the browser that this tab is actively handling audio,
   * preventing browser heuristics from freezing timers and audio in background tabs.
   */
  public async startBackgroundKeepAlive(): Promise<void> {
    try {
      const ctx = await this.getAudioContext();
      if (this.keepAliveOsc) {
        return; // already active
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 10;
      gain.gain.value = 0.000001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.keepAliveOsc = osc;
      this.keepAliveGain = gain;
    } catch {
      // ignore
    }
  }

  public isUnlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public stopAll(): void {
    this.isCurrentlyPlaying = false;
    this.isSynthesizing = false;
    this.currentTitle = '';

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // NOTE: We deliberately do NOT close this.ctx here!
    // Keeping AudioContext open and in 'running' state preserves the user-interaction
    // autoplay authorization for future timer-triggered background bells.
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.notify();
  }

  public async playSound(options: {
    audioType: 'preset' | 'custom' | 'tts';
    audioId: string;
    ttsText?: string;
    playChimeBeforeTts?: boolean;
    repeats?: number;
    volume?: number;
    masterVolume?: number;
    title?: string;
    ignoreOverride?: boolean;
  }): Promise<void> {
    this.stopAll();

    const {
      audioType,
      audioId,
      ttsText = '',
      playChimeBeforeTts = true,
      repeats = 1,
      volume = 1.0,
      masterVolume = 1.0,
      title = 'Bel Sekolah',
      ignoreOverride = false,
    } = options;

    const validVolume = (typeof volume === 'number' && !isNaN(volume)) ? volume : 1.0;
    const validMaster = (typeof masterVolume === 'number' && !isNaN(masterVolume)) ? masterVolume : 1.0;
    const finalVolume = Math.max(0.1, Math.min(1.0, validVolume * validMaster));

    // Try resuming AudioContext before starting playback loop
    try {
      const ctx = await this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }

    this.isCurrentlyPlaying = true;
    this.currentTitle = title;
    this.notify();

    try {
      const totalCycles = Math.max(1, repeats);

      for (let cycle = 0; cycle < totalCycles; cycle++) {
        if (!this.isCurrentlyPlaying) break;

        if (audioType === 'tts') {
          if (playChimeBeforeTts) {
            await this.synthesizePresetSound('modern_chime_3', finalVolume);
            await this.delay(350);
          }
          if (ttsText.trim() && this.isCurrentlyPlaying) {
            await this.speakIndonesianText(ttsText, finalVolume);
          }
        } else if (audioType === 'preset') {
          // Check if this preset sound has been replaced / overridden by user
          const override = !ignoreOverride ? this.presetOverrides[audioId] : null;

          if (override && override.overrideType === 'custom' && override.customAudioId) {
            const blob = await getCustomAudioBlob(override.customAudioId);
            if (blob && this.isCurrentlyPlaying) {
              await this.playAudioBlob(blob, finalVolume);
            } else if (this.isCurrentlyPlaying) {
              await this.synthesizePresetSound(audioId, finalVolume);
            }
          } else if (override && override.overrideType === 'preset' && override.alternatePresetId) {
            if (this.isCurrentlyPlaying) {
              await this.synthesizePresetSound(override.alternatePresetId, finalVolume);
            }
          } else {
            // Check if audioId is a custom audio registered as preset
            const customBlob = await getCustomAudioBlob(audioId);
            if (customBlob && this.isCurrentlyPlaying) {
              await this.playAudioBlob(customBlob, finalVolume);
            } else if (this.isCurrentlyPlaying) {
              // Play default synthesized preset sound
              await this.synthesizePresetSound(audioId, finalVolume);
            }
          }

          // Bunyikan tambahan kata (pengumuman suara) setelah nada bel
          if (ttsText && ttsText.trim() && this.isCurrentlyPlaying) {
            await this.delay(450);
            await this.speakIndonesianText(ttsText, finalVolume);
          }
        } else if (audioType === 'custom') {
          const blob = await getCustomAudioBlob(audioId);
          if (!blob) {
            // Fallback to preset chime if file not found
            if (this.isCurrentlyPlaying) {
              await this.synthesizePresetSound('westminster_4', finalVolume);
            }
          } else {
            if (this.isCurrentlyPlaying) {
              await this.playAudioBlob(blob, finalVolume);
            }
          }

          // Bunyikan tambahan kata (pengumuman suara) setelah audio kustom
          if (ttsText && ttsText.trim() && this.isCurrentlyPlaying) {
            await this.delay(450);
            await this.speakIndonesianText(ttsText, finalVolume);
          }
        }

        // Jeda antarsiklus jika diulang lebih dari 1 kali
        if (cycle < totalCycles - 1 && this.isCurrentlyPlaying) {
          await this.delay(900);
        }
      }
    } catch (err) {
      console.error('Audio playback error:', err);
    } finally {
      this.isCurrentlyPlaying = false;
      this.currentTitle = '';
      this.notify();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private playAudioBlob(blob: Blob, volume: number): Promise<void> {
    return new Promise(async (resolve) => {
      let isResolved = false;
      const safeResolve = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      // Try HTML5 Audio element first
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudioElement = audio;
      audio.volume = volume;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudioElement = null;
        safeResolve();
      };

      audio.onerror = async () => {
        URL.revokeObjectURL(url);
        this.currentAudioElement = null;
        // Fallback to Web Audio buffer decode
        await this.playAudioBlobViaWebAudio(blob, volume);
        safeResolve();
      };

      try {
        await audio.play();
      } catch (playErr) {
        URL.revokeObjectURL(url);
        this.currentAudioElement = null;
        // If browser blocks HTML5 Audio in background, fallback to Web Audio
        await this.playAudioBlobViaWebAudio(blob, volume);
        safeResolve();
      }
    });
  }

  private async playAudioBlobViaWebAudio(blob: Blob, volume: number): Promise<void> {
    try {
      const ctx = await this.getAudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    } catch (e) {
      console.warn('Web Audio blob fallback failed:', e);
    }
  }

  private speakIndonesianText(text: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text.trim()) {
        resolve();
        return;
      }

      let isDone = false;
      const safeResolve = () => {
        if (!isDone) {
          isDone = true;
          this.activeUtterance = null;
          resolve();
        }
      };

      try {
        // Resume if suspended/paused by mobile browser heuristics
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text.trim());
        this.activeUtterance = utterance; // Prevent garbage collection on Android/HarmonyOS

        utterance.volume = Math.max(0.1, Math.min(1.0, volume));
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = 'id-ID'; // Explicitly set Indonesian language tag

        const voices = this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();
        const idVoice = voices.find((v) =>
          v.lang.toLowerCase().startsWith('id') ||
          v.lang.toLowerCase().includes('indonesia') ||
          v.name.toLowerCase().includes('indonesia')
        );

        if (idVoice) {
          utterance.voice = idVoice;
        } else if (voices.length > 0) {
          // If no Indonesian voice is installed on Huawei MatePad, pick default/first voice rather than failing silently
          const defaultVoice = voices.find((v) => v.default) || voices[0];
          if (defaultVoice) {
            utterance.voice = defaultVoice;
          }
        }

        utterance.onstart = () => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        };

        utterance.onend = () => {
          safeResolve();
        };

        utterance.onerror = (e) => {
          console.warn('Speech synthesis error / voice missing on device:', e);
          safeResolve();
        };

        // Safety timeout watchdog: on tablets/Huawei where TTS engine hangs or produces no audio events,
        // don't leave the bell scheduler blocked forever
        const estimatedDurationMs = Math.max(3500, text.length * 150 + 2000);
        setTimeout(safeResolve, estimatedDurationMs);

        // Resume once more right before invocation
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis invocation failed:', err);
        safeResolve();
      }
    });
  }

  // Pure Web Audio API synthesizers for rich preset sounds
  private async synthesizePresetSound(presetId: string, volume: number): Promise<void> {
    const ctx = await this.getAudioContext();
    this.isSynthesizing = true;

    switch (presetId) {
      case 'westminster_8':
        await this.playWestminster(ctx, volume, 8);
        break;
      case 'westminster_4':
        await this.playWestminster(ctx, volume, 4);
        break;
      case 'westminster_16':
        await this.playWestminster(ctx, volume, 16);
        break;
      case 'modern_chime_3':
        await this.playModernChime(ctx, volume);
        break;
      case 'modern_chime_5':
        await this.playModernChime5(ctx, volume);
        break;
      case 'ding_dong_dual':
        await this.playDingDong(ctx, volume);
        break;
      case 'triple_ding_dong':
        await this.playTripleDingDong(ctx, volume);
        break;
      case 'electric_bell':
        await this.playElectricBell(ctx, volume);
        break;
      case 'gentle_marimba':
        await this.playMarimba(ctx, volume);
        break;
      case 'vibraphone_jazz':
        await this.playVibraphone(ctx, volume);
        break;
      case 'school_horn':
        await this.playSchoolHorn(ctx, volume);
        break;
      case 'digital_beep':
        await this.playDigitalBeep(ctx, volume);
        break;
      case 'siren_alert':
        await this.playSiren(ctx, volume);
        break;
      default:
        await this.playWestminster(ctx, volume, 4);
        break;
    }

    this.isSynthesizing = false;
  }

  // Westminster Chime (4, 8, or full 16 notes)
  private async playWestminster(ctx: AudioContext, volume: number, noteCount: 4 | 8 | 16): Promise<void> {
    const freqs: { [key: string]: number } = {
      B3: 246.94,
      E4: 329.63,
      Fs4: 369.99,
      Gs4: 415.3,
    };

    let notes: number[] = [];
    if (noteCount === 4) {
      notes = [freqs.Gs4, freqs.Fs4, freqs.E4, freqs.B3];
    } else if (noteCount === 8) {
      notes = [freqs.E4, freqs.Gs4, freqs.Fs4, freqs.B3, freqs.E4, freqs.Fs4, freqs.Gs4, freqs.E4];
    } else {
      // 16 notes full cathedral quarters
      notes = [
        freqs.Gs4, freqs.Fs4, freqs.E4, freqs.B3,
        freqs.E4, freqs.Gs4, freqs.Fs4, freqs.B3,
        freqs.E4, freqs.Fs4, freqs.Gs4, freqs.E4,
        freqs.Gs4, freqs.E4, freqs.Fs4, freqs.B3,
      ];
    }

    const noteDuration = 0.62;

    for (let i = 0; i < notes.length; i++) {
      if (!this.isCurrentlyPlaying) return;
      this.strikeBellTone(ctx, notes[i], volume, 1.4);
      await this.delay(noteDuration * 1000);
    }
    await this.delay(1200);
  }

  // Warm tubular bell tone with harmonic overtones
  private strikeBellTone(ctx: AudioContext, baseFreq: number, volume: number, decaySec: number): void {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const safeVolume = Math.max(0.1, Math.min(1.0, isNaN(volume) ? 1.0 : volume));
    const now = ctx.currentTime;
    const harmonics = [
      { ratio: 1.0, amp: 1.0 },
      { ratio: 2.0, amp: 0.4 },
      { ratio: 3.0, amp: 0.2 },
      { ratio: 4.16, amp: 0.1 },
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(safeVolume * 0.8, now);
    masterGain.connect(ctx.destination);

    harmonics.forEach(({ ratio, amp }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(amp, now + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decaySec);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + decaySec + 0.1);
    });
  }

  // Modern Chime 3 (G4 -> B4 -> D5 -> G5)
  private async playModernChime(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [392.0, 493.88, 587.33, 783.99]; // G4, B4, D5, G5
    for (const freq of notes) {
      if (!this.isCurrentlyPlaying) return;
      this.strikeBellTone(ctx, freq, volume * 0.9, 1.6);
      await this.delay(420);
    }
    await this.delay(1000);
  }

  // Modern Chime 5 (C5 -> E5 -> G5 -> A5 -> C6)
  private async playModernChime5(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [523.25, 659.25, 783.99, 880.0, 1046.5];
    for (const freq of notes) {
      if (!this.isCurrentlyPlaying) return;
      this.strikeBellTone(ctx, freq, volume * 0.85, 1.5);
      await this.delay(360);
    }
    await this.delay(1000);
  }

  // Classic Ding-Dong (F5 -> C5)
  private async playDingDong(ctx: AudioContext, volume: number): Promise<void> {
    if (!this.isCurrentlyPlaying) return;
    this.strikeBellTone(ctx, 698.46, volume, 2.0); // F5 (Ding)
    await this.delay(850);
    if (!this.isCurrentlyPlaying) return;
    this.strikeBellTone(ctx, 523.25, volume, 2.4); // C5 (Dong)
    await this.delay(1400);
  }

  // Triple Ding-Dong (D5 -> F#5 -> A5)
  private async playTripleDingDong(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [587.33, 739.99, 880.0]; // D5, F#5, A5
    for (const freq of notes) {
      if (!this.isCurrentlyPlaying) return;
      this.strikeBellTone(ctx, freq, volume * 0.9, 2.0);
      await this.delay(650);
    }
    await this.delay(1200);
  }

  // Traditional School Electric Bell (Kringgggg)
  private async playElectricBell(ctx: AudioContext, volume: number): Promise<void> {
    const now = ctx.currentTime;
    const duration = 3.2;

    const baseOsc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();

    baseOsc.type = 'triangle';
    baseOsc.frequency.setValueAtTime(1180, now);

    lfo.type = 'square';
    lfo.frequency.setValueAtTime(18, now);

    lfoGain.gain.setValueAtTime(300, now);
    lfo.connect(baseOsc.frequency);

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(volume * 0.75, now + 0.08);
    mainGain.gain.setValueAtTime(volume * 0.75, now + duration - 0.2);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    baseOsc.connect(mainGain);
    mainGain.connect(ctx.destination);

    baseOsc.start(now);
    lfo.start(now);
    baseOsc.stop(now + duration + 0.1);
    lfo.stop(now + duration + 0.1);

    await this.delay(duration * 1000 + 100);
  }

  // Marimba arpeggio (warm wooden mallet sound)
  private async playMarimba(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5
    for (const freq of notes) {
      if (!this.isCurrentlyPlaying) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume * 0.85, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);

      await this.delay(280);
    }
    await this.delay(800);
  }

  // Vibraphone with gentle vibrato tremolo
  private async playVibraphone(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [349.23, 440.0, 523.25, 659.25]; // F4, A4, C5, E5
    for (const freq of notes) {
      if (!this.isCurrentlyPlaying) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      tremolo.type = 'sine';
      tremolo.frequency.setValueAtTime(5.5, now); // 5.5 Hz vibrato

      tremoloGain.gain.setValueAtTime(volume * 0.25, now);
      tremolo.connect(tremoloGain.gain);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(noteGain);
      noteGain.connect(ctx.destination);

      osc.start(now);
      tremolo.start(now);
      osc.stop(now + 1.9);
      tremolo.stop(now + 1.9);

      await this.delay(450);
    }
    await this.delay(1000);
  }

  // Brassy School Horn Fanfare
  private async playSchoolHorn(ctx: AudioContext, volume: number): Promise<void> {
    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    for (let i = 0; i < notes.length; i++) {
      if (!this.isCurrentlyPlaying) return;
      const freq = notes[i];
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 1.004, now); // slight chorus detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(2400, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(1000, now + 0.7);

      const noteLen = i === notes.length - 1 ? 1.2 : 0.45;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.04);
      gain.gain.setValueAtTime(volume * 0.6, now + noteLen - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + noteLen);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + noteLen + 0.1);
      osc2.stop(now + noteLen + 0.1);

      await this.delay(noteLen * 1000);
    }
    await this.delay(800);
  }

  // Digital Beep (Dual Tone)
  private async playDigitalBeep(ctx: AudioContext, volume: number): Promise<void> {
    const tones = [880, 1320];
    for (let repeat = 0; repeat < 2; repeat++) {
      if (!this.isCurrentlyPlaying) return;
      for (const f of tones) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);

        await this.delay(180);
      }
      await this.delay(200);
    }
    await this.delay(400);
  }

  // Siren alert for emergency drills
  private async playSiren(ctx: AudioContext, volume: number): Promise<void> {
    const now = ctx.currentTime;
    const duration = 4.5;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);

    for (let t = 0; t < duration; t += 1.2) {
      osc.frequency.linearRampToValueAtTime(920, now + t + 0.6);
      osc.frequency.linearRampToValueAtTime(450, now + t + 1.2);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.1);
    gain.gain.setValueAtTime(volume * 0.7, now + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);

    await this.delay(duration * 1000 + 100);
  }
}

export const schoolAudioEngine = new SchoolAudioEngine();
