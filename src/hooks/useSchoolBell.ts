import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BellCategory,
  BellLog,
  CustomAudio,
  DayOfWeek,
  PresetOverride,
  ScheduleItem,
  SchoolSettings,
} from '../types';
import {
  getAllCustomAudios,
  saveCustomAudio,
  deleteCustomAudio as deleteAudioFromDb,
  exportAllCustomAudiosAsBase64,
  importCustomAudiosFromBase64,
  updateCustomAudioMetadata,
} from '../utils/audioDb';
import { schoolAudioEngine, PRESET_SOUNDS } from '../utils/audioEngine';
import { DEFAULT_SCHEDULES, SCHEDULE_TEMPLATES } from '../utils/constants';
import { seedDefaultCustomAudios } from '../utils/defaultAudioData';
import { globalBackgroundTimer } from '../utils/backgroundTimer';
import { screenWakeLock } from '../utils/wakeLock';

const STORAGE_KEY_SCHEDULES = 'bel_sekolah_schedules_v1';
const STORAGE_KEY_SETTINGS = 'bel_sekolah_settings_v1';
const STORAGE_KEY_LOGS = 'bel_sekolah_logs_v1';
const STORAGE_KEY_OVERRIDES = 'bel_sekolah_preset_overrides_v1';

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMP / SMA NEGERI 1',
  academicYear: '2026/2027',
  autoBellEnabled: true,
  masterVolume: 1.0,
  notificationsEnabled: true,
  audioUnlocked: false,
  defaultPresetId: 'westminster_8',
};

export function useSchoolBell() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_SCHEDULES;
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [presetOverrides, setPresetOverrides] = useState<Record<string, PresetOverride>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const [logs, setLogs] = useState<BellLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [customAudios, setCustomAudios] = useState<CustomAudio[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState<string>('');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    return schoolAudioEngine.isUnlocked();
  });
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(screenWakeLock.isActive());

  // Periodically verify true AudioContext state
  useEffect(() => {
    const syncAudioState = () => {
      setAudioUnlocked(schoolAudioEngine.isUnlocked());
    };
    syncAudioState();
    const timer = setInterval(syncAudioState, 2000);
    return () => clearInterval(timer);
  }, []);

  // Keep track of triggered bells to avoid duplicate triggers within the same minute
  const triggeredBellsRef = useRef<Set<string>>(new Set());

  // Listen to Screen Wake Lock changes
  useEffect(() => {
    return screenWakeLock.subscribe((active) => {
      setWakeLockActive(active);
    });
  }, []);

  // Synchronize Screen Wake Lock with autoBellEnabled to prevent OS sleep / screen turn off
  useEffect(() => {
    if (settings.autoBellEnabled) {
      screenWakeLock.acquire().catch(() => {});
    } else {
      screenWakeLock.release().catch(() => {});
    }
    return () => {
      screenWakeLock.release().catch(() => {});
    };
  }, [settings.autoBellEnabled]);

  // Unlock audio & wake lock on mount and first user interaction anywhere on the page
  useEffect(() => {
    // Attempt immediate silent unlock on mount
    schoolAudioEngine.unlockAudio().then((ok) => {
      if (ok) {
        setAudioUnlocked(true);
      }
    }).catch(() => {});

    const unlockOnInteraction = async () => {
      try {
        localStorage.setItem('school_bell_audio_unlocked', 'true');
      } catch {}
      if (!schoolAudioEngine.isUnlocked()) {
        const ok = await schoolAudioEngine.unlockAudio();
        if (ok) {
          setAudioUnlocked(true);
          setSettings((prev) => ({ ...prev, audioUnlocked: true }));
        }
      } else {
        setAudioUnlocked(true);
      }
      if (settings.autoBellEnabled) {
        screenWakeLock.acquire().catch(() => {});
      }
    };

    const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
    const handler = () => {
      unlockOnInteraction();
    };

    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
    };
  }, [settings.autoBellEnabled]);

  // Save schedules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save schedules', e);
    }
  }, [schedules]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Save preset overrides to localStorage and update audio engine
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(presetOverrides));
      schoolAudioEngine.setPresetOverrides(presetOverrides);
    } catch (e) {
      console.error('Failed to save preset overrides', e);
    }
  }, [presetOverrides]);

  // Save logs to localStorage
  useEffect(() => {
    try {
      // keep max 100 logs
      const trimmed = logs.slice(0, 100);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [logs]);

  // Load custom audios from IndexedDB on mount (seeds default custom audios if empty)
  const refreshCustomAudios = useCallback(async () => {
    try {
      let items = await getAllCustomAudios();
      if (items.length === 0) {
        // Automatically seed authentic default custom bell audios into the IndexedDB database
        await seedDefaultCustomAudios();
        items = await getAllCustomAudios();
      }
      setCustomAudios(items);
    } catch (err) {
      console.error('Failed to load custom audios', err);
    }
  }, []);

  const reseedDefaultAudios = useCallback(async () => {
    try {
      await seedDefaultCustomAudios(true);
      await refreshCustomAudios();
    } catch (err) {
      console.error('Failed to reseed default audios', err);
    }
  }, [refreshCustomAudios]);

  useEffect(() => {
    refreshCustomAudios();
  }, [refreshCustomAudios]);

  // Subscribe to Audio Engine state
  useEffect(() => {
    const unsub = schoolAudioEngine.subscribe((playing, title) => {
      setIsPlaying(playing);
      setCurrentPlayingTitle(title || '');
    });
    return unsub;
  }, []);

  // Check notification permission
  useEffect(() => {
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.notificationsEnabled]);

  // Request unlock audio with optional test sound
  const handleUnlockAudio = useCallback(async (playTestChime: boolean = true) => {
    const ok = await schoolAudioEngine.unlockAudio();
    setAudioUnlocked(ok);
    setSettings((prev) => ({ ...prev, audioUnlocked: ok }));
    if (settings.autoBellEnabled) {
      await screenWakeLock.acquire().catch(() => {});
    }
    if (ok && playTestChime && !isPlaying) {
      // Play a quick 2-second test chime so the user immediately hears confirmation
      try {
        await schoolAudioEngine.playSound({
          audioType: 'preset',
          audioId: 'ding_dong_dual',
          repeats: 1,
          volume: 1.0,
          masterVolume: settings.masterVolume,
          title: 'Tes Suara (Audio Siap Bunyi)',
        });
      } catch {
        // ignore
      }
    }
    return ok;
  }, [settings.autoBellEnabled, settings.masterVolume, isPlaying]);

  // Sound resolver with preset override awareness
  const getSoundLabel = useCallback((audioType: string, audioId: string): string => {
    if (audioType === 'tts') return 'Pengumuman Suara (TTS)';
    if (audioType === 'preset') {
      // Check if it's a custom audio registered as preset
      const customMatch = customAudios.find((a) => a.id === audioId);
      if (customMatch) {
        return `${customMatch.name} (Nada Bawaan Kustom)`;
      }

      const p = PRESET_SOUNDS.find((s) => s.id === audioId);
      const baseName = p ? p.name : audioId;
      const override = presetOverrides[audioId];
      if (override) {
        if (override.overrideType === 'custom') {
          return `${baseName} (Diganti: ${override.customAudioName || 'Audio Kustom'})`;
        }
        if (override.overrideType === 'preset' && override.alternatePresetId) {
          const alt = PRESET_SOUNDS.find((s) => s.id === override.alternatePresetId);
          return `${baseName} (Diganti: ${alt?.name || override.alternatePresetId})`;
        }
      }
      return baseName;
    }
    if (audioType === 'custom') {
      const c = customAudios.find((a) => a.id === audioId);
      return c ? `${c.name}${c.isPreset ? ' (⭐ Bawaan)' : ''}` : `Kustom (${audioId})`;
    }
    return audioId;
  }, [customAudios, presetOverrides]);

  // Trigger Bell
  const triggerBell = useCallback(
    async (schedule: ScheduleItem, triggerType: 'otomatis' | 'manual' = 'otomatis') => {
      const soundLabel = getSoundLabel(schedule.audioType, schedule.audioId);

      // Add log
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLog: BellLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        timeFormatted: timeStr,
        title: schedule.title,
        triggerType,
        soundName: soundLabel,
      };

      setLogs((prev) => [newLog, ...prev]);

      // Show Desktop Notification if permitted
      if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🔔 Bel Sekolah Berbunyi: ${schedule.title}`, {
            body: `Waktu: ${schedule.time} WIB - ${soundLabel}`,
            silent: true,
          });
        } catch {
          // ignore
        }
      }

      // Play Sound
      await schoolAudioEngine.playSound({
        audioType: schedule.audioType,
        audioId: schedule.audioId,
        ttsText: schedule.ttsText,
        playChimeBeforeTts: schedule.playChimeBeforeTts ?? true,
        repeats: schedule.repeats,
        volume: schedule.volume,
        masterVolume: settings.masterVolume,
        title: schedule.title,
      });
    },
    [getSoundLabel, settings.masterVolume, settings.notificationsEnabled]
  );

  // Stop current playback
  const stopPlayback = useCallback(() => {
    schoolAudioEngine.stopAll();
  }, []);

  // Main clock and scheduler loop powered by Web Worker
  useEffect(() => {
    const unsubscribe = globalBackgroundTimer.subscribe((timestamp) => {
      const now = new Date(timestamp);
      setCurrentTime(now);

      // Check automatic bell
      if (settings.autoBellEnabled) {
        const currentDay = now.getDay() as DayOfWeek;
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const timeKey = `${currentHours}:${currentMinutes}`;
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

        schedules.forEach((sch) => {
          if (!sch.enabled) return;
          if (!sch.days.includes(currentDay)) return;
          if (sch.time === timeKey) {
            const dedupeKey = `${dateKey}_${timeKey}_${sch.id}`;
            if (!triggeredBellsRef.current.has(dedupeKey)) {
              triggeredBellsRef.current.add(dedupeKey);
              // Clean up old entries from reference set if it grows large
              if (triggeredBellsRef.current.size > 200) {
                triggeredBellsRef.current.clear();
                triggeredBellsRef.current.add(dedupeKey);
              }
              triggerBell(sch, 'otomatis');
            }
          }
        });
      }
    });

    globalBackgroundTimer.start();

    return () => {
      unsubscribe();
    };
  }, [settings.autoBellEnabled, schedules, triggerBell]);

  // Compute next upcoming bell today
  const nextBell = (() => {
    if (!settings.autoBellEnabled) return null;
    const currentDay = currentTime.getDay() as DayOfWeek;
    const currentTotalSec = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();

    // Filter schedules active for today
    const todaysSchedules = schedules
      .filter((s) => s.enabled && s.days.includes(currentDay))
      .map((s) => {
        const [h, m] = s.time.split(':').map(Number);
        const schedTotalSec = h * 3600 + m * 60;
        return {
          ...s,
          schedTotalSec,
          diffSec: schedTotalSec - currentTotalSec,
        };
      })
      .filter((s) => s.diffSec > 0)
      .sort((a, b) => a.diffSec - b.diffSec);

    if (todaysSchedules.length > 0) {
      const next = todaysSchedules[0];
      const hoursLeft = Math.floor(next.diffSec / 3600);
      const minsLeft = Math.floor((next.diffSec % 3600) / 60);
      const secsLeft = next.diffSec % 60;
      return {
        schedule: next,
        countdownStr:
          hoursLeft > 0
            ? `${hoursLeft}j ${minsLeft}m ${secsLeft}s`
            : minsLeft > 0
            ? `${minsLeft}m ${secsLeft}s`
            : `${secsLeft} detik lagi`,
        secondsRemaining: next.diffSec,
      };
    }

    return null;
  })();

  // Schedule CRUD
  const addSchedule = (item: Omit<ScheduleItem, 'id'>) => {
    const newItem: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setSchedules((prev) => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const updateSchedule = (item: ScheduleItem) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === item.id ? item : s)).sort((a, b) => a.time.localeCompare(b.time))
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const duplicateSchedule = (id: string) => {
    const item = schedules.find((s) => s.id === id);
    if (!item) return;
    const duplicated: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${item.title} (Salinan)`,
    };
    setSchedules((prev) => [...prev, duplicated].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const toggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // Custom Audio Upload & Management
  const uploadCustomAudio = async (
    name: string,
    file: File,
    options?: { asPreset?: boolean; isDefault?: boolean; presetCategory?: string }
  ): Promise<CustomAudio> => {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    // Calculate audio duration
    let duration = 0;
    try {
      duration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        audio.src = url;
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(Math.round(audio.duration));
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(0);
        };
      });
    } catch {
      duration = 0;
    }

    const metadata: CustomAudio = {
      id,
      name: name.trim() || file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      size: file.size,
      mimeType: file.type || 'audio/mpeg',
      duration,
      createdAt: Date.now(),
      isPreset: options?.asPreset ?? false,
      isDefault: options?.isDefault ?? false,
      presetCategory: options?.presetCategory || 'Bawaan Kustom',
    };

    await saveCustomAudio(metadata, file);
    if (options?.isDefault) {
      setSettings((prev) => ({
        ...prev,
        defaultPresetId: id,
        defaultCustomAudioId: id,
      }));
    }
    await refreshCustomAudios();
    return metadata;
  };

  const toggleCustomAudioAsPreset = async (id: string, asPreset?: boolean) => {
    const item = customAudios.find((a) => a.id === id);
    if (!item) return;
    const nextState = asPreset !== undefined ? asPreset : !item.isPreset;
    await updateCustomAudioMetadata(id, { isPreset: nextState });
    if (!nextState && item.isDefault) {
      await updateCustomAudioMetadata(id, { isDefault: false });
      setSettings((prev) => ({
        ...prev,
        defaultPresetId: 'westminster_8',
        defaultCustomAudioId: undefined,
      }));
    }
    await refreshCustomAudios();
  };

  const setCustomAudioAsSchoolDefault = async (id: string) => {
    for (const a of customAudios) {
      if (a.id === id) {
        await updateCustomAudioMetadata(a.id, { isDefault: true, isPreset: true });
      } else if (a.isDefault) {
        await updateCustomAudioMetadata(a.id, { isDefault: false });
      }
    }
    setSettings((prev) => ({
      ...prev,
      defaultPresetId: id,
      defaultCustomAudioId: id,
    }));
    await refreshCustomAudios();
  };

  const applyAudioToAllSchedules = (audioId: string, audioType: 'preset' | 'custom' = 'preset') => {
    setSchedules((prev) =>
      prev.map((sch) => ({
        ...sch,
        audioType,
        audioId,
      }))
    );
  };

  const deleteCustomAudioItem = async (id: string) => {
    // If it was default bell, reset to factory default
    if (settings.defaultCustomAudioId === id || settings.defaultPresetId === id) {
      setSettings((prev) => ({
        ...prev,
        defaultPresetId: 'westminster_8',
        defaultCustomAudioId: undefined,
      }));
    }

    // Also remove any overrides that were pointing to this custom audio
    setPresetOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k].customAudioId === id) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    await deleteAudioFromDb(id);
    await refreshCustomAudios();
  };

  // Preset Sound Overrides (Mengganti Nada Bawaan)
  const setPresetOverride = useCallback(
    (
      targetPresetId: string,
      override: {
        overrideType: 'custom' | 'preset';
        customAudioId?: string;
        customAudioName?: string;
        alternatePresetId?: string;
      }
    ) => {
      setPresetOverrides((prev) => ({
        ...prev,
        [targetPresetId]: {
          targetPresetId,
          overrideType: override.overrideType,
          customAudioId: override.customAudioId,
          customAudioName: override.customAudioName,
          alternatePresetId: override.alternatePresetId,
          updatedAt: Date.now(),
        },
      }));
    },
    []
  );

  const removePresetOverride = useCallback((targetPresetId: string) => {
    setPresetOverrides((prev) => {
      const next = { ...prev };
      delete next[targetPresetId];
      return next;
    });
  }, []);

  const resetAllPresetOverrides = useCallback(() => {
    setPresetOverrides({});
    localStorage.removeItem(STORAGE_KEY_OVERRIDES);
    schoolAudioEngine.setPresetOverrides({});
  }, []);

  // Batch Sound Replacement across all or category schedules
  const batchReplaceSoundInSchedules = useCallback(
    (criteria: {
      targetType: 'all_matching_sound' | 'by_category';
      matchAudioId?: string;
      matchCategory?: BellCategory;
      newAudioType: 'preset' | 'custom';
      newAudioId: string;
    }) => {
      setSchedules((prev) =>
        prev.map((item) => {
          if (criteria.targetType === 'all_matching_sound') {
            if (item.audioId === criteria.matchAudioId) {
              return {
                ...item,
                audioType: criteria.newAudioType,
                audioId: criteria.newAudioId,
              };
            }
          } else if (criteria.targetType === 'by_category') {
            if (item.category === criteria.matchCategory) {
              return {
                ...item,
                audioType: criteria.newAudioType,
                audioId: criteria.newAudioId,
              };
            }
          }
          return item;
        })
      );
    },
    []
  );

  // Play test preview with option to hear either actual sound or raw original preset
  const previewPresetSound = useCallback(
    async (presetId: string, options?: { ignoreOverride?: boolean; volume?: number }) => {
      await schoolAudioEngine.playSound({
        audioType: 'preset',
        audioId: presetId,
        repeats: 1,
        volume: options?.volume ?? 1.0,
        masterVolume: settings.masterVolume,
        title: `Uji Nada: ${getSoundLabel('preset', presetId)}`,
        ignoreOverride: options?.ignoreOverride ?? false,
      });
    },
    [getSoundLabel, settings.masterVolume]
  );

  // Templates
  const applyTemplate = (templateId: string) => {
    const t = SCHEDULE_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!t) return;
    setSchedules(t.schedules);
  };

  // Settings
  const updateSettings = (partial: Partial<SchoolSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Export JSON configuration (Termasuk seluruh file audio kustom)
  const exportConfiguration = async (includeAudios: boolean = true): Promise<number> => {
    let customAudiosData: any[] = [];
    if (includeAudios) {
      try {
        customAudiosData = await exportAllCustomAudiosAsBase64();
      } catch (err) {
        console.error('Failed to export custom audios', err);
      }
    }

    const data = {
      version: '2.0',
      type: 'school_bell_package',
      exportedAt: new Date().toISOString(),
      schoolName: settings.schoolName,
      academicYear: settings.academicYear,
      schedules,
      presetOverrides,
      settings: {
        ...settings,
        audioUnlocked: false,
      },
      customAudios: customAudiosData,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSchool = (settings.schoolName || 'sekolah')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const hasAudiosSuffix = customAudiosData.length > 0 ? '_lengkap_audio' : '';
    a.download = `paket_bel_${safeSchool}${hasAudiosSuffix}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return customAudiosData.length;
  };

  // Export package as JSON string
  const exportPackageAsJsonString = async (includeAudios: boolean = true): Promise<string> => {
    let customAudiosData: any[] = [];
    if (includeAudios) {
      try {
        customAudiosData = await exportAllCustomAudiosAsBase64();
      } catch (err) {
        console.error('Failed to export custom audios', err);
      }
    }

    const data = {
      version: '2.0',
      type: 'school_bell_package',
      exportedAt: new Date().toISOString(),
      schoolName: settings.schoolName,
      academicYear: settings.academicYear,
      schedules,
      presetOverrides,
      settings: {
        ...settings,
        audioUnlocked: false,
      },
      customAudios: customAudiosData,
    };

    return JSON.stringify(data, null, 2);
  };

  // Import JSON configuration (Mendukung pemulihan jadwal + audio kustom)
  const importConfiguration = async (
    jsonString: string
  ): Promise<{ success: boolean; audioCount: number; message: string }> => {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.schedules)) {
        setSchedules(data.schedules);
        if (data.presetOverrides && typeof data.presetOverrides === 'object') {
          setPresetOverrides(data.presetOverrides);
        }
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            audioUnlocked: prev.audioUnlocked,
          }));
        }

        let audioCount = 0;
        if (Array.isArray(data.customAudios) && data.customAudios.length > 0) {
          audioCount = await importCustomAudiosFromBase64(data.customAudios);
          await refreshCustomAudios();
        }

        return {
          success: true,
          audioCount,
          message:
            audioCount > 0
              ? `Jadwal berhasil dipulihkan beserta ${audioCount} file audio kustom!`
              : 'Jadwal bel berhasil dipulihkan!',
        };
      }
      return { success: false, audioCount: 0, message: 'Format file JSON tidak valid.' };
    } catch (err) {
      console.error('Import failed', err);
      return { success: false, audioCount: 0, message: 'Gagal memproses file konfigurasi.' };
    }
  };

  return {
    currentTime,
    schedules,
    settings,
    logs,
    customAudios,
    presetOverrides,
    isPlaying,
    currentPlayingTitle,
    audioUnlocked,
    wakeLockActive,
    nextBell,
    handleUnlockAudio,
    triggerBell,
    stopPlayback,
    previewPresetSound,
    setPresetOverride,
    removePresetOverride,
    resetAllPresetOverrides,
    batchReplaceSoundInSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    duplicateSchedule,
    toggleSchedule,
    uploadCustomAudio,
    toggleCustomAudioAsPreset,
    setCustomAudioAsSchoolDefault,
    applyAudioToAllSchedules,
    deleteCustomAudioItem,
    applyTemplate,
    updateSettings,
    clearLogs,
    exportConfiguration,
    exportPackageAsJsonString,
    importConfiguration,
    getSoundLabel,
    refreshCustomAudios,
    reseedDefaultAudios,
  };
}
