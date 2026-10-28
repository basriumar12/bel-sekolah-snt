export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Minggu, 1 = Senin, ...

export type BellCategory = 
  | 'masuk' 
  | 'istirahat' 
  | 'ganti_jam' 
  | 'pulang' 
  | 'upacara' 
  | 'sholat' 
  | 'khusus';

export type AudioSourceType = 'preset' | 'custom' | 'tts';

export interface ScheduleItem {
  id: string;
  time: string; // "HH:mm" 24-hour format
  title: string;
  days: DayOfWeek[];
  audioType: AudioSourceType;
  audioId: string; // preset id (e.g. "westminster") or custom audio id
  ttsText?: string;
  playChimeBeforeTts?: boolean;
  repeats: number; // 1, 2, 3
  volume: number; // 0.1 to 1.0
  enabled: boolean;
  category: BellCategory;
}

export interface CustomAudio {
  id: string;
  name: string;
  fileName: string;
  size: number;
  mimeType: string;
  duration: number; // in seconds
  createdAt: number;
  isPreset?: boolean; // Ditandai sebagai nada bel bawaan juga
  isDefault?: boolean; // Ditandai sebagai nada bawaan utama sekolah
  presetCategory?: string; // Kategori saat dijadikan nada bawaan
}

export interface PresetSound {
  id: string;
  name: string;
  description: string;
  category: string;
  durationEstimate: string;
  recommendedFor?: string;
  isCustom?: boolean;
  customAudioId?: string;
}

export interface PresetOverride {
  targetPresetId: string;
  overrideType: 'custom' | 'preset';
  customAudioId?: string;
  customAudioName?: string;
  alternatePresetId?: string;
  updatedAt: number;
}

export interface BellLog {
  id: string;
  timestamp: number;
  timeFormatted: string;
  title: string;
  triggerType: 'otomatis' | 'manual';
  soundName: string;
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  autoBellEnabled: boolean;
  masterVolume: number;
  notificationsEnabled: boolean;
  audioUnlocked: boolean;
  defaultPresetId?: string;
  defaultCustomAudioId?: string;
  presetOverrides?: Record<string, PresetOverride>;
}
