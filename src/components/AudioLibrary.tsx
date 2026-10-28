import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Upload,
  Play,
  Square,
  Trash2,
  Mic,
  RotateCcw,
  Check,
  AlertCircle,
  FileAudio,
  Sparkles,
  StopCircle,
  Volume2,
  Star,
  Crown,
  Repeat,
  Info,
} from 'lucide-react';
import { CustomAudio, PresetOverride } from '../types';
import { schoolAudioEngine, PRESET_SOUNDS } from '../utils/audioEngine';
import { ConfirmModal } from './ConfirmModal';

interface AudioLibraryProps {
  customAudios: CustomAudio[];
  presetOverrides: Record<string, PresetOverride>;
  defaultPresetId?: string;
  onUploadAudio: (
    name: string,
    file: File,
    options?: { asPreset?: boolean; isDefault?: boolean; presetCategory?: string }
  ) => Promise<CustomAudio>;
  onDeleteCustomAudio: (id: string) => Promise<void>;
  onTogglePreset?: (id: string, asPreset?: boolean) => Promise<void>;
  onSetSchoolDefault?: (id: string) => Promise<void>;
  onApplyToAllSchedules?: (audioId: string, audioType?: 'preset' | 'custom') => void;
  onReseedDefaultAudios?: () => Promise<void>;
  onSetPresetOverride: (
    presetId: string,
    override: {
      overrideType: 'custom' | 'preset';
      customAudioId?: string;
      customAudioName?: string;
      alternatePresetId?: string;
    }
  ) => void;
  onRemovePresetOverride: (presetId: string) => void;
  onResetAllPresetOverrides: () => void;
  isPlaying: boolean;
  onStopAudio: () => void;
}

export const AudioLibrary: React.FC<AudioLibraryProps> = ({
  customAudios,
  presetOverrides,
  defaultPresetId,
  onUploadAudio,
  onDeleteCustomAudio,
  onTogglePreset,
  onSetSchoolDefault,
  onApplyToAllSchedules,
  onReseedDefaultAudios,
  onSetPresetOverride,
  onRemovePresetOverride,
  onResetAllPresetOverrides,
  isPlaying,
  onStopAudio,
}) => {
  // Navigation between Nada Bawaan and Audio Saya
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Preview state
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  // Upload Form State
  const [audioName, setAudioName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [markAsPreset, setMarkAsPreset] = useState<boolean>(true); // Default true agar langsung jadi bawaan
  const [markAsDefault, setMarkAsDefault] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMsg, setUploadMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mic Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [micError, setMicError] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Modal to replace a specific factory preset sound
  const [targetPresetId, setTargetPresetId] = useState<string | null>(null);
  const [overrideAudioId, setOverrideAudioId] = useState<string>('');
  const [deletingCustomAudio, setDeletingCustomAudio] = useState<CustomAudio | null>(null);
  const [confirmApplyAllAudio, setConfirmApplyAllAudio] = useState<CustomAudio | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Play a preset sound (factory or overridden)
  const handlePlayPreset = async (presetId: string) => {
    if (activePreviewId === presetId && isPlaying) {
      schoolAudioEngine.stopAll();
      setActivePreviewId(null);
      onStopAudio();
      return;
    }

    setActivePreviewId(presetId);
    try {
      await schoolAudioEngine.playSound({
        audioType: 'preset',
        audioId: presetId,
        repeats: 1,
        volume: 1.0,
        title: `Pratinjau: ${PRESET_SOUNDS.find((p) => p.id === presetId)?.name || presetId}`,
      });
    } finally {
      setActivePreviewId(null);
    }
  };

  // Play a custom audio file
  const handlePlayCustomAudio = async (audio: CustomAudio) => {
    if (activePreviewId === audio.id && isPlaying) {
      schoolAudioEngine.stopAll();
      setActivePreviewId(null);
      onStopAudio();
      return;
    }

    setActivePreviewId(audio.id);
    try {
      await schoolAudioEngine.playSound({
        audioType: 'custom',
        audioId: audio.id,
        repeats: 1,
        volume: 1.0,
        title: `Audio: ${audio.name}`,
      });
    } finally {
      setActivePreviewId(null);
    }
  };

  // Upload file
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const name = audioName.trim() || selectedFile.name.replace(/\.[^/.]+$/, '');
      const saved = await onUploadAudio(name, selectedFile, {
        asPreset: markAsPreset,
        isDefault: markAsDefault,
      });
      const extraMsg = markAsDefault
        ? ' dan ditetapkan sebagai Suara Utama Sekolah!'
        : markAsPreset
        ? ' dan terdaftar sebagai Nada Bawaan Sistem!'
        : '!';
      setUploadMsg(`✓ Berhasil menambahkan "${saved.name}"${extraMsg}`);
      setSelectedFile(null);
      setAudioName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setUploadMsg('Gagal mengunggah file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const name = audioName.trim() || `Rekaman Suara ${new Date().toLocaleTimeString('id-ID')}`;
        const file = new File([blob], `${name}.webm`, { type: 'audio/webm' });
        try {
          setIsUploading(true);
          const saved = await onUploadAudio(name, file, {
            asPreset: markAsPreset,
            isDefault: markAsDefault,
          });
          const extraMsg = markAsDefault
            ? ' dan ditetapkan sebagai Suara Utama Sekolah!'
            : markAsPreset
            ? ' dan terdaftar sebagai Nada Bawaan Sistem!'
            : '!';
          setUploadMsg(`✓ Berhasil menyimpan rekaman "${saved.name}"${extraMsg}`);
          setAudioName('');
          setTimeout(() => setUploadMsg(''), 5000);
        } catch (err) {
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      setMicError('');

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setMicError('Izin mikrofon diperlukan untuk merekam suara.');
      setTimeout(() => setMicError(''), 4000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Apply replacement for factory preset
  const handleConfirmReplace = () => {
    if (!targetPresetId) return;

    if (overrideAudioId) {
      const customItem = customAudios.find((a) => a.id === overrideAudioId);
      onSetPresetOverride(targetPresetId, {
        overrideType: 'custom',
        customAudioId: overrideAudioId,
        customAudioName: customItem?.name || 'Audio Kustom',
      });
    }

    setTargetPresetId(null);
    setOverrideAudioId('');
  };

  const customPresets = customAudios.filter((a) => a.isPreset);
  const overriddenCount = Object.keys(presetOverrides).length;

  return (
    <div className="space-y-6">
      {/* Tab Switcher: Nada Bel Bawaan vs Koleksi Audio Saya */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Nada Bel Bawaan Sistem</span>
            {customPresets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-extrabold flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>{customPresets.length} kustom</span>
              </span>
            )}
            {overriddenCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-bold">
                {overriddenCount} diganti
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Audio Saya ({customAudios.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onReseedDefaultAudios && (
            <button
              type="button"
              onClick={async () => {
                await onReseedDefaultAudios();
                setUploadMsg('✓ Berhasil memasukkan seluruh Audio Bawaan ke Database!');
                setTimeout(() => setUploadMsg(''), 5000);
              }}
              className="px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Masukkan atau pulihkan file audio bawaan ke database IndexedDB"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Masukkan Audio Bawaan ke Database</span>
            </button>
          )}

          {activeTab === 'presets' && overriddenCount > 0 && (
            <button
              onClick={onResetAllPresetOverrides}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan Semua ke Suara Pabrik</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Notification Toast */}
      {uploadMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: NADA BEL BAWAAN & GANTI SUARA                     */}
      {/* ======================================================== */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          {/* SECTION 1: NADA BAWAAN KUSTOM BUATAN ANDA */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-indigo-950/30 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-lg shadow-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Nada Bawaan Kustom Buatan Anda</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      {customPresets.length} Nada Terdaftar
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audio kustom yang Anda buat telah dijadikan nada bawaan dan langsung muncul di pilihan jadwal bel serta bel manual.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Buat / Unggah Audio Kustom</span>
              </button>
            </div>

            {customPresets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {customPresets.map((aud) => {
                  const isPlayingThis = activePreviewId === aud.id;
                  const isDefaultSchool = defaultPresetId === aud.id || aud.isDefault;

                  return (
                    <div
                      key={aud.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isDefaultSchool
                          ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">
                              {aud.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isDefaultSchool ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                                <Crown className="w-2.5 h-2.5 fill-current" />
                                <span>Suara Utama Sekolah</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Bawaan Kustom
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 font-mono">
                          {aud.fileName} · {(aud.size / 1024).toFixed(0)} KB {aud.duration ? `· ${aud.duration} dtk` : ''}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePlayCustomAudio(aud)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isPlayingThis
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isPlayingThis ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                <span>Berhenti</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current text-amber-400" />
                                <span>Dengarkan Nada</span>
                              </>
                            )}
                          </button>

                          {onApplyToAllSchedules && (
                            <button
                              type="button"
                              onClick={() => setConfirmApplyAllAudio(aud)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1"
                              title="Terapkan audio ini ke seluruh jadwal jam bel sekolah"
                            >
                              <Repeat className="w-3 h-3" />
                              <span>Ke Semua Jadwal</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onSetSchoolDefault && !isDefaultSchool && (
                            <button
                              type="button"
                              onClick={() => onSetSchoolDefault(aud.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                              title="Jadikan sebagai nada bawaan utama sekolah"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Jadikan Utama</span>
                            </button>
                          )}

                          {onTogglePreset && (
                            <button
                              type="button"
                              onClick={() => onTogglePreset(aud.id, false)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Keluarkan dari daftar Nada Bawaan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-slate-950/60 rounded-xl border border-dashed border-amber-500/30 text-center space-y-2">
                <Sparkles className="w-7 h-7 text-amber-400 mx-auto" />
                <h4 className="text-xs font-bold text-white">
                  Belum Ada Audio Kustom yang Dijadikan Bawaan
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Anda dapat membuat audio kustom (file MP3 atau rekaman suara) menjadi nada bawaan. Cukup buka tab <strong>"Audio Saya"</strong> dan aktifkan tombol <strong>"Jadikan Nada Bawaan"</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className="mt-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Buka Audio Saya & Jadikan Bawaan</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: NADA BEL BAWAAN PABRIK */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Nada Bel Bawaan Pabrik (13 Nada Standar)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Melodi lonceng sekolah sintetis standar. Anda juga dapat mengganti suara nada pabrik dengan audio MP3 milik Anda sendiri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {PRESET_SOUNDS.map((ps) => {
                const override = presetOverrides[ps.id];
                const isOverridden = !!override;
                const isPlayingThis = activePreviewId === ps.id;

                return (
                  <div
                    key={ps.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isOverridden
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isOverridden
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-indigo-600/20 text-indigo-400'
                            }`}
                          >
                            <Music className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {ps.name}
                          </h4>
                        </div>

                        {isOverridden ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Sudah Diganti
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ps.durationEstimate}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        {ps.description}
                      </p>

                      {/* Status Pengganti */}
                      {isOverridden && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                          <span className="truncate">
                            Diganti dengan: <strong>"{override.customAudioName || 'Audio Kustom'}"</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemovePresetOverride(ps.id)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold shrink-0 ml-2 cursor-pointer"
                          >
                            Kembalikan Asli
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handlePlayPreset(ps.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isPlayingThis
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isPlayingThis ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Berhenti</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current text-indigo-400" />
                            <span>Dengarkan Nada</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTargetPresetId(ps.id);
                          if (override?.customAudioId) {
                            setOverrideAudioId(override.customAudioId);
                          } else if (customAudios.length > 0) {
                            setOverrideAudioId(customAudios[0].id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
                      >
                        {isOverridden ? 'Ubah Pengganti' : 'Ganti Suara Ini'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AUDIO SAYA (UNGGAH FILE MP3 / REKAM SUARA)        */}
      {/* ======================================================== */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          {/* Upload & Mic Recorder Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span>Unggah File Audio atau Rekam Suara Baru</span>
              </h3>
            </div>

            {micError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Audio / Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bel Masuk Sekolah / Mars Sekolah / Suara Guru"
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Pilih File Audio (MP3 / WAV / M4A / OGG)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Checkboxes: Jadikan Bawaan & Suara Utama */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markAsPreset}
                    onChange={(e) => setMarkAsPreset(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Jadikan langsung sebagai Nada Bel Bawaan Sistem</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markAsDefault}
                    onChange={(e) => {
                      setMarkAsDefault(e.target.checked);
                      if (e.target.checked) setMarkAsPreset(true);
                    }}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tetapkan sebagai Suara Utama Sekolah</span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Mic Record Button */}
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isUploading}
                      className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Rekam Suara dari Mikrofon</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer animate-pulse"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Selesai Rekam ({recordingSeconds}s)</span>
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Menyimpan...' : 'Simpan File Audio'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of User's Custom Audio Files */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                File Audio yang Tersimpan ({customAudios.length})
              </h4>
              <span className="text-xs text-slate-400">
                ⭐ {customPresets.length} telah dijadikan Nada Bawaan
              </span>
            </div>

            {customAudios.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <FileAudio className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Belum ada file audio yang diunggah. Silakan unggah file MP3 atau rekam suara Anda di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customAudios.map((aud) => {
                  const isPlayingThis = activePreviewId === aud.id;
                  const isDefaultSchool = defaultPresetId === aud.id || aud.isDefault;

                  return (
                    <div
                      key={aud.id}
                      className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        isDefaultSchool
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : aud.isPreset
                          ? 'bg-slate-950/80 border-amber-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{aud.name}</span>
                          </h5>

                          {/* Status Badges */}
                          {aud.isPreset && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>Nada Bawaan</span>
                            </span>
                          )}

                          {isDefaultSchool && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 fill-current" />
                              <span>Suara Utama Sekolah</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-mono">
                          {aud.fileName} · {(aud.size / 1024).toFixed(0)} KB {aud.duration ? `· ${aud.duration} dtk` : ''}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {/* Play/Stop */}
                        <button
                          type="button"
                          onClick={() => handlePlayCustomAudio(aud)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isPlayingThis
                              ? 'bg-rose-600 text-white'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300'
                          }`}
                        >
                          {isPlayingThis ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Putar</span>
                            </>
                          )}
                        </button>

                        {/* Jadikan Nada Bawaan Toggle */}
                        {onTogglePreset && (
                          <button
                            type="button"
                            onClick={() => onTogglePreset(aud.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              aud.isPreset
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                            title={
                              aud.isPreset
                                ? 'Klik untuk mengeluarkan dari daftar Nada Bawaan'
                                : 'Klik untuk menjadikan audio ini sebagai Nada Bawaan Sistem'
                            }
                          >
                            <Star className={`w-3.5 h-3.5 ${aud.isPreset ? 'fill-current' : ''}`} />
                            <span>{aud.isPreset ? '✓ Nada Bawaan Aktif' : 'Jadikan Nada Bawaan'}</span>
                          </button>
                        )}

                        {/* Jadikan Suara Utama */}
                        {onSetSchoolDefault && !isDefaultSchool && (
                          <button
                            type="button"
                            onClick={() => onSetSchoolDefault(aud.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                            title="Jadikan sebagai nada bel utama sekolah"
                          >
                            <Crown className="w-3 h-3" />
                            <span className="hidden sm:inline">Jadikan Utama</span>
                          </button>
                        )}

                        {/* Terapkan ke Semua Jadwal */}
                        {onApplyToAllSchedules && (
                          <button
                            type="button"
                            onClick={() => setConfirmApplyAllAudio(aud)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                            title="Terapkan audio ini ke seluruh jadwal jam bel aktif"
                          >
                            <Repeat className="w-3 h-3" />
                            <span className="hidden sm:inline">Ke Semua Jadwal</span>
                          </button>
                        )}

                        {/* Hapus file */}
                        <button
                          type="button"
                          onClick={() => setDeletingCustomAudio(aud)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                          title="Hapus file ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PILIH AUDIO PENGGANTI UNTUK NADA TERTENTU         */}
      {/* ======================================================== */}
      {targetPresetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Ganti Nada: {PRESET_SOUNDS.find((p) => p.id === targetPresetId)?.name}
            </h3>
            <p className="text-xs text-slate-400">
              Pilih salah satu file audio MP3/WAV dari koleksi Anda untuk menggantikan nada bawaan pabrik ini.
            </p>

            {customAudios.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {customAudios.map((aud) => {
                  const isSelected = overrideAudioId === aud.id;
                  return (
                    <div
                      key={aud.id}
                      onClick={() => setOverrideAudioId(aud.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold truncate">{aud.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {(aud.size / 1024).toFixed(0)} KB {aud.duration ? `· ${aud.duration}s` : ''}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-400">
                  Anda belum memiliki file audio kustom.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTargetPresetId(null);
                    setActiveTab('custom');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Unggah File Audio Sekarang
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTargetPresetId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={!overrideAudioId}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Terapkan Pengganti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Terapkan ke Semua Jadwal */}
      {confirmApplyAllAudio && (
        <ConfirmModal
          isOpen={true}
          title="Terapkan Audio ke Semua Jadwal Bel?"
          message={
            <div className="space-y-2">
              <p>
                Apakah Anda ingin menerapkan nada{' '}
                <strong className="text-white">"{confirmApplyAllAudio.name}"</strong> ke seluruh jadwal bel yang aktif?
              </p>
              <p className="text-xs text-slate-400">
                Semua jam bel sekolah yang aktif akan otomatis membunyikan nada ini saat jam berbunyi.
              </p>
            </div>
          }
          confirmLabel="Ya, Terapkan ke Semua Jadwal"
          cancelLabel="Batal"
          isDestructive={false}
          onConfirm={() => {
            if (onApplyToAllSchedules) {
              onApplyToAllSchedules(confirmApplyAllAudio.id, 'preset');
            }
            setUploadMsg(`✓ Berhasil menerapkan "${confirmApplyAllAudio.name}" ke semua jadwal bel!`);
            setConfirmApplyAllAudio(null);
            setTimeout(() => setUploadMsg(''), 5000);
          }}
          onCancel={() => setConfirmApplyAllAudio(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingCustomAudio && (
        <ConfirmModal
          isOpen={true}
          title="Hapus File Audio?"
          message={
            <p>
              Apakah Anda yakin ingin menghapus file audio{' '}
              <strong className="text-white">"{deletingCustomAudio.name}"</strong>?
            </p>
          }
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          isDestructive={true}
          onConfirm={async () => {
            await onDeleteCustomAudio(deletingCustomAudio.id);
            setDeletingCustomAudio(null);
          }}
          onCancel={() => setDeletingCustomAudio(null)}
        />
      )}
    </div>
  );
};
