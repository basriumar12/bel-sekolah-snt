import { CustomAudio } from '../types';
import { saveCustomAudio, getAllCustomAudios, getCustomAudioBlob } from './audioDb';

/**
 * Creates a valid PCM 16-bit mono WAV Blob from musical note frequencies and timing.
 * Uses additive synthesis with chime harmonics and exponential decay to produce authentic bell sounds.
 */
function createBellWavBlob(
  notes: { freq: number; start: number; duration: number; gain?: number }[],
  totalDurationSeconds: number
): Blob {
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * totalDurationSeconds);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true); // ChunkSize
  writeString(8, 'WAVE');

  // fmt Subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data Subchunk
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true); // Subchunk2Size

  // Synthesize samples into float buffer first
  const floatSamples = new Float32Array(totalSamples);

  for (const note of notes) {
    const startSample = Math.floor(note.start * sampleRate);
    const noteLength = Math.floor(note.duration * sampleRate);
    const endSample = Math.min(totalSamples, startSample + noteLength);
    const freq = note.freq;
    const baseGain = note.gain ?? 0.85;

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / sampleRate;
      // Exponential decay envelope
      const decay = Math.exp(-t * (3.0 / Math.max(0.2, note.duration)));
      // Attack envelope (5ms attack to avoid clicks)
      const attack = Math.min(1.0, (i - startSample) / (sampleRate * 0.008));
      const env = attack * decay * baseGain;

      // Additive bell harmonics: Fundamental (1.0), Octave (2.0), Tierce (2.4), Quint (3.0)
      const fundamental = Math.sin(2 * Math.PI * freq * t);
      const overtone1 = 0.45 * Math.sin(2 * Math.PI * freq * 2.00 * t);
      const overtone2 = 0.25 * Math.sin(2 * Math.PI * freq * 2.76 * t);
      const overtone3 = 0.15 * Math.sin(2 * Math.PI * freq * 4.07 * t);

      const sampleVal = (fundamental + overtone1 + overtone2 + overtone3) * env * 0.45;
      floatSamples[i] += sampleVal;
    }
  }

  // Normalize and convert float samples to 16-bit signed PCM
  let maxAmp = 0.0001;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(floatSamples[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const scale = maxAmp > 0.95 ? 0.95 / maxAmp : 1.0;

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i] * scale));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface SeedCustomAudioConfig {
  id: string;
  name: string;
  fileName: string;
  category: 'masuk' | 'istirahat' | 'ganti_jam' | 'pulang' | 'upacara' | 'sholat' | 'khusus';
  durationSeconds: number;
  isPreset: boolean;
  isDefault: boolean;
  notes: { freq: number; start: number; duration: number; gain?: number }[];
}

export const SEED_CUSTOM_AUDIOS: SeedCustomAudioConfig[] = [
  {
    id: 'aud-bawaan-masuk',
    name: '⭐ Bel Masuk Sekolah Resmi (8 Nada Melodi Genta)',
    fileName: 'bel_masuk_sekolah_resmi.wav',
    category: 'masuk',
    durationSeconds: 6.8,
    isPreset: true,
    isDefault: true,
    notes: [
      // Westminster Quarters part 1 & 2
      { freq: 415.30, start: 0.0, duration: 0.9 }, // G#4
      { freq: 369.99, start: 0.8, duration: 0.9 }, // F#4
      { freq: 329.63, start: 1.6, duration: 0.9 }, // E4
      { freq: 246.94, start: 2.4, duration: 1.2 }, // B3
      // second phrase
      { freq: 329.63, start: 3.4, duration: 0.9 }, // E4
      { freq: 369.99, start: 4.1, duration: 0.9 }, // F#4
      { freq: 415.30, start: 4.8, duration: 0.9 }, // G#4
      { freq: 329.63, start: 5.5, duration: 1.5 }, // E4
    ],
  },
  {
    id: 'aud-bawaan-pergantian',
    name: '⭐ Bel Pergantian Jam Pelajaran (4 Nada Harmoni)',
    fileName: 'bel_pergantian_jam_4_nada.wav',
    category: 'ganti_jam',
    durationSeconds: 4.2,
    isPreset: true,
    isDefault: false,
    notes: [
      { freq: 329.63, start: 0.0, duration: 0.85 }, // E4
      { freq: 415.30, start: 0.7, duration: 0.85 }, // G#4
      { freq: 369.99, start: 1.4, duration: 0.85 }, // F#4
      { freq: 246.94, start: 2.1, duration: 1.8 },  // B3
    ],
  },
  {
    id: 'aud-bawaan-istirahat',
    name: '⭐ Bel Waktu Istirahat (Chime Santai 3 Nada Ceria)',
    fileName: 'bel_waktu_istirahat_ceria.wav',
    category: 'istirahat',
    durationSeconds: 4.5,
    isPreset: true,
    isDefault: false,
    notes: [
      { freq: 523.25, start: 0.0, duration: 1.0 }, // C5
      { freq: 659.25, start: 0.7, duration: 1.0 }, // E5
      { freq: 783.99, start: 1.4, duration: 1.2 }, // G5
      { freq: 1046.50, start: 2.2, duration: 2.0 }, // C6
    ],
  },
  {
    id: 'aud-bawaan-pulang',
    name: '⭐ Bel Pulang Sekolah (Melodi Lengkap Penutup Hari)',
    fileName: 'bel_pulang_sekolah_lengkap.wav',
    category: 'pulang',
    durationSeconds: 8.5,
    isPreset: true,
    isDefault: false,
    notes: [
      { freq: 415.30, start: 0.0, duration: 0.8 }, // G#4
      { freq: 329.63, start: 0.65, duration: 0.8 }, // E4
      { freq: 369.99, start: 1.3, duration: 0.8 }, // F#4
      { freq: 246.94, start: 1.95, duration: 1.1 }, // B3
      // Bridge
      { freq: 246.94, start: 2.9, duration: 0.8 }, // B3
      { freq: 369.99, start: 3.5, duration: 0.8 }, // F#4
      { freq: 415.30, start: 4.1, duration: 0.8 }, // G#4
      { freq: 329.63, start: 4.7, duration: 1.1 }, // E4
      // Final chime
      { freq: 415.30, start: 5.7, duration: 0.8 }, // G#4
      { freq: 369.99, start: 6.3, duration: 0.9 }, // F#4
      { freq: 329.63, start: 7.0, duration: 1.8 }, // E4
    ],
  },
  {
    id: 'aud-bawaan-upacara',
    name: '⭐ Bel Upacara & Apel Resmi (Fanfare Genta Sekolah)',
    fileName: 'bel_upacara_bendera_apel.wav',
    category: 'upacara',
    durationSeconds: 5.5,
    isPreset: true,
    isDefault: false,
    notes: [
      { freq: 261.63, start: 0.0, duration: 0.6 },  // C4
      { freq: 329.63, start: 0.45, duration: 0.6 }, // E4
      { freq: 392.00, start: 0.9, duration: 0.6 },  // G4
      { freq: 523.25, start: 1.35, duration: 1.2 }, // C5
      { freq: 392.00, start: 2.3, duration: 0.6 },  // G4
      { freq: 523.25, start: 2.8, duration: 2.4 },  // C5 (long sustain)
    ],
  },
  {
    id: 'aud-bawaan-ibadah',
    name: '⭐ Bel Panggilan Ibadah & Sholat Dzuhur (Gong Khidmat)',
    fileName: 'bel_panggilan_ibadah_sholat.wav',
    category: 'sholat',
    durationSeconds: 6.0,
    isPreset: true,
    isDefault: false,
    notes: [
      { freq: 220.00, start: 0.0, duration: 2.2, gain: 1.0 }, // A3
      { freq: 277.18, start: 1.6, duration: 2.2, gain: 1.0 }, // C#4
      { freq: 329.63, start: 3.2, duration: 2.6, gain: 1.0 }, // E4
    ],
  },
];

/**
 * Seeds default Indonesian school bell audio files into the IndexedDB database.
 * If force = false, only seeds items that do not exist yet.
 * Returns the count of newly seeded audio items.
 */
export async function seedDefaultCustomAudios(force = false): Promise<number> {
  const existingList = await getAllCustomAudios();
  const existingIds = new Set(existingList.map((a) => a.id));

  let seededCount = 0;

  for (const config of SEED_CUSTOM_AUDIOS) {
    // If not forcing, skip if already exists in DB
    if (!force && existingIds.has(config.id)) {
      // Check if blob exists
      const existingBlob = await getCustomAudioBlob(config.id);
      if (existingBlob && existingBlob.size > 0) {
        continue;
      }
    }

    try {
      const blob = createBellWavBlob(config.notes, config.durationSeconds);
      const metadata: CustomAudio = {
        id: config.id,
        name: config.name,
        fileName: config.fileName,
        size: blob.size,
        mimeType: 'audio/wav',
        duration: Math.round(config.durationSeconds),
        createdAt: Date.now() - seededCount * 1000, // staggered timestamp
        isPreset: config.isPreset,
        isDefault: config.isDefault,
        presetCategory: config.category,
      };

      await saveCustomAudio(metadata, blob);
      seededCount++;
    } catch (e) {
      console.error(`Failed to seed audio "${config.name}":`, e);
    }
  }

  return seededCount;
}
