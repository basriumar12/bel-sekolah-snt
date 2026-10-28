import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Volume2,
  Square,
  Clock,
  Music,
  Mic,
  Calendar,
  Sparkles,
  Sliders,
  Trash2,
  Upload,
  Check,
  StopCircle,
  AlertCircle,
  Play,
  FileAudio,
  Star,
} from 'lucide-react';
import {
  BellCategory,
  CustomAudio,
  DayOfWeek,
  PresetOverride,
  ScheduleItem,
} from '../types';
import { schoolAudioEngine, PRESET_SOUNDS } from '../utils/audioEngine';
import { CATEGORY_CONFIG, DAYS_CONFIG } from '../utils/constants';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ScheduleItem, 'id'> | ScheduleItem) => void;
  initialItem?: ScheduleItem | null;
  customAudios: CustomAudio[];
  presetOverrides?: Record<string, PresetOverride>;
  defaultPresetId?: string;
  onUploadAudio?: (
    name: string,
    file: File,
    options?: { asPreset?: boolean; isDefault?: boolean }
  ) => Promise<CustomAudio>;
  onNavigateToAudioTab: () => void;
  onDelete?: (id: string) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  customAudios,
  presetOverrides = {},
  defaultPresetId,
  onUploadAudio,
  onNavigateToAudioTab,
  onDelete,
}) => {
  // Detect default sound selection
  const defaultSound = (() => {
    if (initialItem) {
      return { type: initialItem.audioType, id: initialItem.audioId };
    }
    // Check if there is a default preset configured (could be custom audio ID or preset ID)
    if (defaultPresetId) {
      const customMatch = customAudios.find((a) => a.id === defaultPresetId);
      if (customMatch) {
        return { type: 'preset' as const, id: customMatch.id };
      }
      return { type: 'preset' as const, id: defaultPresetId };
    }
    const defaultCustom = customAudios.find((a) => a.isDefault || a.isPreset);
    if (defaultCustom) {
      return { type: 'preset' as const, id: defaultCustom.id };
    }
    return {
      type: (customAudios.length > 0 ? 'custom' : 'preset') as 'preset' | 'custom',
      id: customAudios.length > 0 ? customAudios[0].id : 'westminster_8',
    };
  })();

  const [time, setTime] = useState<string>(initialItem ? initialItem.time : '07:00');
  const [title, setTitle] = useState<string>(initialItem ? initialItem.title : '');
  const [category, setCategory] = useState<BellCategory>(initialItem ? initialItem.category : 'masuk');
  const [days, setDays] = useState<DayOfWeek[]>(initialItem ? initialItem.days : [1, 2, 3, 4, 5]);
  const [audioType, setAudioType] = useState<'preset' | 'custom' | 'tts'>(
    initialItem ? initialItem.audioType : defaultSound.type
  );
  const [audioId, setAudioId] = useState<string>(
    initialItem ? initialItem.audioId : defaultSound.id
  );
  const [ttsText, setTtsText] = useState<string>(
    initialItem ? initialItem.ttsText || '' : ''
  );
  const [playChimeBeforeTts, setPlayChimeBeforeTts] = useState<boolean>(
    initialItem?.playChimeBeforeTts ?? true
  );
  const [repeats, setRepeats] = useState<number>(initialItem ? initialItem.repeats : 1);
  const [volume, setVolume] = useState<number>(initialItem ? initialItem.volume : 1.0);
  const [enabled, setEnabled] = useState<boolean>(initialItem ? initialItem.enabled : true);

  // Preview & Confirmation
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Inline Upload & Mic Recording State
  const [isUploadingInline, setIsUploadingInline] = useState<boolean>(false);
  const [inlineUploadMsg, setInlineUploadMsg] = useState<string>('');
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  const [isRecordingInline, setIsRecordingInline] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [micErrorMsg, setMicErrorMsg] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Sync state when modal is opened or target item changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      setTime(initialItem.time);
      setTitle(initialItem.title);
      setCategory(initialItem.category);
      setDays(initialItem.days);
      setAudioType(initialItem.audioType);
      setAudioId(initialItem.audioId);
      setTtsText(initialItem.ttsText || '');
      setPlayChimeBeforeTts(initialItem.playChimeBeforeTts ?? true);
      setRepeats(initialItem.repeats || 1);
      setVolume(initialItem.volume ?? 1.0);
      setEnabled(initialItem.enabled ?? true);
    } else {
      setTime('07:00');
      setTitle('');
      setCategory('masuk');
      setDays([1, 2, 3, 4, 5]);
      setAudioType(defaultSound.type);
      setAudioId(defaultSound.id);
      setTtsText('');
      setPlayChimeBeforeTts(true);
      setRepeats(1);
      setVolume(1.0);
      setEnabled(true);
    }
    setIsPreviewing(false);
    setShowDeleteConfirm(false);
    setInlineUploadMsg('');
    setMicErrorMsg('');
  }, [isOpen, initialItem, defaultSound.type, defaultSound.id]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleTestSound = async () => {
    if (isPreviewing) {
      schoolAudioEngine.stopAll();
      setIsPreviewing(false);
      return;
    }

    setIsPreviewing(true);
    await schoolAudioEngine.playSound({
      audioType,
      audioId,
      ttsText,
      playChimeBeforeTts,
      repeats, // Uji dengan jumlah pengulangan suara yang dipilih
      volume,
      title: title || 'Pratinjau Nada Bel',
    });
    setIsPreviewing(false);
  };

  const handleDayToggle = (day: DayOfWeek) => {
    if (days.includes(day)) {
      if (days.length === 1) return; // keep at least 1 day
      setDays(days.filter((d) => d !== day));
    } else {
      setDays([...days, day].sort());
    }
  };

  const handleSelectWeekdays = () => setDays([1, 2, 3, 4, 5]);
  const handleSelectSixDays = () => setDays([1, 2, 3, 4, 5, 6]);
  const handleSelectAllDays = () => setDays([1, 2, 3, 4, 5, 6, 0]);

  // Inline File Upload right from Schedule Modal
  const handleInlineFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAudio) return;

    setIsUploadingInline(true);
    try {
      const defaultName = title.trim() ? `Audio Bel - ${title.trim()}` : file.name.replace(/\.[^/.]+$/, '');
      const savedAudio = await onUploadAudio(defaultName, file, { asPreset: true });
      setAudioType('preset');
      setAudioId(savedAudio.id);
      setInlineUploadMsg(`✓ Berhasil! Audio "${savedAudio.name}" terpasang sebagai Nada Bawaan untuk jadwal ini.`);
      setTimeout(() => setInlineUploadMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setInlineUploadMsg('Gagal mengunggah file audio.');
    } finally {
      setIsUploadingInline(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    }
  };

  // Inline Mic Recording right from Schedule Modal
  const startInlineRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (onUploadAudio) {
          setIsUploadingInline(true);
          try {
            const recName = title.trim() ? `Suara - ${title.trim()}` : `Rekaman Bel ${time}`;
            const file = new File([audioBlob], `${recName}.webm`, { type: 'audio/webm' });
            const savedAudio = await onUploadAudio(recName, file, { asPreset: true });
            setAudioType('preset');
            setAudioId(savedAudio.id);
            setInlineUploadMsg(`✓ Berhasil! Rekaman suara terpasang sebagai Nada Bawaan untuk jam bel ini.`);
            setTimeout(() => setInlineUploadMsg(''), 5000);
          } catch (err) {
            console.error('Failed to save recorded audio', err);
          } finally {
            setIsUploadingInline(false);
          }
        }
      };

      mediaRecorder.start(200);
      setIsRecordingInline(true);
      setRecordingSeconds(0);
      setMicErrorMsg('');

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setMicErrorMsg('Tidak dapat mengakses mikrofon. Berikan izin di browser.');
      setTimeout(() => setMicErrorMsg(''), 5000);
    }
  };

  const stopInlineRecording = () => {
    if (mediaRecorderRef.current && isRecordingInline) {
      mediaRecorderRef.current.stop();
      setIsRecordingInline(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Quick Action: Auto fill TTS with title/keterangan
  const handleUseTitleAsAnnouncement = () => {
    if (!title.trim()) return;
    setTtsText(`Perhatian kepada seluruh siswa dan dewan guru, saatnya ${title.trim()} dimulai.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time.trim() || !title.trim()) return;

    const payload = {
      ...(initialItem ? { id: initialItem.id } : {}),
      time: time.trim(),
      title: title.trim(),
      category,
      days,
      audioType,
      audioId: audioType === 'custom' && !audioId && customAudios.length > 0 ? customAudios[0].id : audioId,
      ttsText: ttsText.trim(),
      playChimeBeforeTts,
      repeats,
      volume,
      enabled,
    };

    onSave(payload as ScheduleItem);
    onClose();
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialItem ? 'Ubah Jadwal Jam Bel' : 'Tambah Jam Bel Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Atur waktu, keterangan kegiatan, dan pilih audio/nada yang akan berbunyi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Jam & Keterangan */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Waktu / Jam (24-Jam) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-['JetBrains_Mono',monospace] text-base focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="sm:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Keterangan Bel / Kegiatan <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseTitleAsAnnouncement}
                  disabled={!title.trim()}
                  className="text-[11px] text-teal-400 hover:text-teal-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  title="Jadikan keterangan ini sebagai kalimat pengumuman suara otomatis"
                >
                  <Sparkles className="w-3 h-3" />
                  Jadikan Pengumuman Suara
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Contoh: Masuk Kelas Jam Ke-1 / Istirahat Pertama"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Kategori Kegiatan Bel */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Kategori Bel
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as BellCategory[]).map((catKey) => {
                const conf = CATEGORY_CONFIG[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    type="button"
                    key={catKey}
                    onClick={() => setCategory(catKey)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? `${conf.bg} ${conf.border} ${conf.color} ring-1 ring-indigo-500/40 font-semibold`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hari Berlaku */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Hari Berlaku
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectWeekdays}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Sen - Jum
                </button>
                <button
                  type="button"
                  onClick={handleSelectSixDays}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Sen - Sab
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Semua
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_CONFIG.map((d) => {
                const isSelected = days.includes(d.value);
                return (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => handleDayToggle(d.value)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PILIHAN SUARA & AUDIO BEL (DAPAT MENGGUNAKAN AUDIO SAYA SENDIRI)           */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Music className="w-4 h-4 text-indigo-400" />
                Pilihan Audio / Suara yang Diputar Saat Bel Tiba
              </label>

              {/* Source Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAudioType('custom');
                    if (customAudios.length > 0 && !audioId) {
                      setAudioId(customAudios[0].id);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    audioType === 'custom'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio Saya ({customAudios.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioType('preset')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    audioType === 'preset'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Nada Bawaan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioType('tts')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    audioType === 'tts'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Suara TTS</span>
                </button>
              </div>
            </div>

            {/* Notification if inline upload/record succeeded */}
            {inlineUploadMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{inlineUploadMsg}</span>
              </div>
            )}

            {micErrorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{micErrorMsg}</span>
              </div>
            )}

            {/* OPTION 1: CUSTOM AUDIO (AUDIO SAYA) */}
            {audioType === 'custom' && (
              <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Pilih File Audio yang Akan Diputar untuk Jam & Keterangan Ini:
                  </span>
                  <span className="text-[11px] text-indigo-400">
                    Tersimpan permanen di browser
                  </span>
                </div>

                {customAudios.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {customAudios.map((aud) => {
                      const isSelected = audioId === aud.id;
                      return (
                        <div
                          key={aud.id}
                          onClick={() => setAudioId(aud.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold truncate flex items-center gap-1.5">
                              {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                              <span>{aud.name}</span>
                              {aud.isPreset && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                                  ⭐ Bawaan
                                </span>
                              )}
                              {aud.isDefault && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold shrink-0">
                                  👑 Utama
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-['JetBrains_Mono',monospace]">
                              {aud.fileName} · {(aud.size / 1024).toFixed(0)} KB {aud.duration ? `· ${aud.duration}s` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await schoolAudioEngine.playSound({
                                  audioType: 'custom',
                                  audioId: aud.id,
                                  repeats: 1,
                                  volume: 1.0,
                                  title: `Tes: ${aud.name}`,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Dengarkan cuplikan audio ini"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">
                    Belum ada audio di koleksi Anda. Silakan unggah file MP3/WAV atau rekam suara di bawah ini:
                  </p>
                )}

                {/* Instant Inline Upload & Recording Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* File Input */}
                  <input
                    ref={inlineFileInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/m4a,audio/*"
                    onChange={handleInlineFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inlineFileInputRef.current?.click()}
                    disabled={isUploadingInline}
                    className="flex-1 py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingInline ? 'Menyimpan File...' : 'Unggah File Audio untuk Jam Ini (MP3/WAV)'}</span>
                  </button>

                  {/* Inline Voice Recorder */}
                  {!isRecordingInline ? (
                    <button
                      type="button"
                      onClick={startInlineRecording}
                      disabled={isUploadingInline}
                      className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Rekam Suara Mic</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopInlineRecording}
                      className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 animate-pulse"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Selesai Rekam ({formatSecs(recordingSeconds)})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* OPTION 2: PRESET SOUND */}
            {audioType === 'preset' && (
              <div className="space-y-2">
                <select
                  value={audioId}
                  onChange={(e) => setAudioId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {/* Custom Presets created by user */}
                  {customAudios.length > 0 && (
                    <optgroup label="⭐ Nada Bawaan Kustom Buatan Anda">
                      {customAudios
                        .filter((a) => a.isPreset || a.isDefault)
                        .map((aud) => (
                          <option key={aud.id} value={aud.id}>
                            ⭐ {aud.name} {aud.duration ? `(${aud.duration} dtk)` : ''} {aud.isDefault ? '👑 [Utama Sekolah]' : ''}
                          </option>
                        ))}
                      {/* If user has custom audios but none marked isPreset yet, also allow selecting them */}
                      {customAudios.filter((a) => a.isPreset || a.isDefault).length === 0 &&
                        customAudios.map((aud) => (
                          <option key={aud.id} value={aud.id}>
                            ⭐ {aud.name} {aud.duration ? `(${aud.duration} dtk)` : ''} (Kustom)
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {/* Factory Presets */}
                  <optgroup label="🔔 Nada Bawaan Pabrik (13 Melodi Standar)">
                    {PRESET_SOUNDS.map((ps) => {
                      const ov = presetOverrides[ps.id];
                      const label = ov
                        ? `${ps.name} (Diganti Audio Kustom: ${ov.customAudioName || 'Audio Kustom'})`
                        : `${ps.name} (${ps.durationEstimate})`;
                      return (
                        <option key={ps.id} value={ps.id}>
                          {label}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>

                {/* Info Card if custom preset or overridden preset */}
                {customAudios.find((a) => a.id === audioId) ? (
                  <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>
                        Nada Bawaan Kustom:{' '}
                        <strong className="text-white">
                          "{customAudios.find((a) => a.id === audioId)?.name}"
                        </strong>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToAudioTab();
                      }}
                      className="text-xs text-amber-300 hover:text-white underline font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Kelola di Audio
                    </button>
                  </div>
                ) : presetOverrides[audioId] ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <span>
                      ✓ Nada bawaan ini telah diganti dengan:{' '}
                      <strong className="text-white">
                        "{presetOverrides[audioId].customAudioName || 'Audio Kustom'}"
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToAudioTab();
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      Kelola Pengganti
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <p className="line-clamp-1">
                      {PRESET_SOUNDS.find((p) => p.id === audioId)?.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToAudioTab();
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline shrink-0 ml-2 cursor-pointer"
                    >
                      Ganti nada bawaan ini...
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* OPTION 3: TTS SYNTHESIS */}
            {audioType === 'tts' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-slate-400">
                    Teks Pengumuman Suara Berbicara (Bahasa Indonesia):
                  </label>
                  <button
                    type="button"
                    onClick={handleUseTitleAsAnnouncement}
                    className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    Gunakan Keterangan Bel ({title || 'Bel'})
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Contoh: Saatnya jam pelajaran pertama dimulai. Selamat belajar dan raihlah prestasi."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={playChimeBeforeTts}
                    onChange={(e) => setPlayChimeBeforeTts(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  Bunyikan nada lonceng pengantar sebelum suara berbicara
                </label>
              </div>
            )}

            {/* Optional TTS accompaniment for Preset or Custom audio */}
            {audioType !== 'tts' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Pengumuman Suara Tambahan (Opsional setelah bel berbunyi)
                  </label>
                  {title.trim() && !ttsText && (
                    <button
                      type="button"
                      onClick={handleUseTitleAsAnnouncement}
                      className="text-[11px] text-teal-400 hover:text-teal-300 cursor-pointer underline"
                    >
                      Ucapkan Keterangan "{title}"
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Ketik teks yang akan diucapkan setelah nada bel (misal: Saatnya jam ke-1 dimulai)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>
            )}

            {/* Preview Current Setting Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestSound}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isPreviewing
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isPreviewing ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Hentikan Pratinjau
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    Uji Suara Jam Bel Ini
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-500">
                {audioType === 'custom'
                  ? `Memutar audio kustom pilihan Anda`
                  : audioType === 'preset'
                  ? `Memutar nada bel sistem`
                  : `Membacakan teks pengumuman suara`}
              </span>
            </div>
          </div>

          {/* Volume & Pengulangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
            {/* Volume */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Kekuatan Volume Suara</span>
                <span className="font-['JetBrains_Mono',monospace] text-indigo-400">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
            </div>

            {/* Pengulangan Nada & Tambahan Kata */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pengulangan Nada & Tambahan Kata</span>
                </label>
                <span className="text-[11px] text-teal-400 font-semibold">
                  {repeats === 1 ? '1x Putar' : `Diulang ${repeats}x (Nada + Kata)`}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRepeats(r)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      repeats === r
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm shadow-teal-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r === 1 ? '1x Putar' : `${r}x Ulangi`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {ttsText.trim()
                  ? `Nada bel dan tambahan kata pengumuman akan diulang ${repeats}x secara serentak.`
                  : `Nada bel akan dibunyikan sebanyak ${repeats}x.`}
              </p>
            </div>
          </div>

          {/* Status Aktif */}
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">
                Status Jam Bel
              </span>
              <span className="text-[11px] text-slate-400">
                Nonaktifkan jika jam ini sedang libur atau tidak ingin dibunyikan.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {initialItem && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Jadwal Ini
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
              >
                {initialItem ? 'Simpan Perubahan' : 'Tambahkan ke Jadwal'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {initialItem && onDelete && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Hapus Jadwal Jam Bel?"
          message={
            <p>
              Apakah Anda yakin ingin menghapus jadwal{' '}
              <strong className="text-white font-bold">"{initialItem.title}"</strong> ({initialItem.time})?
            </p>
          }
          confirmLabel="Ya, Hapus Jadwal"
          cancelLabel="Batal"
          isDestructive={true}
          onConfirm={() => {
            onDelete(initialItem.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};
