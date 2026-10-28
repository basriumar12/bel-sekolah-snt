import React, { useState, useRef } from 'react';
import {
  Plus,
  Play,
  Copy,
  Edit2,
  Trash2,
  Search,
  BookOpen,
  Volume2,
  Filter,
  CheckCircle2,
  Clock,
  Music,
  Upload,
  Mic,
  Sparkles,
  X,
  Square,
  Check,
} from 'lucide-react';
import {
  CustomAudio,
  DayOfWeek,
  PresetOverride,
  ScheduleItem,
} from '../types';
import { CATEGORY_CONFIG, DAYS_CONFIG, SCHEDULE_TEMPLATES } from '../utils/constants';
import { PRESET_SOUNDS, schoolAudioEngine } from '../utils/audioEngine';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleListProps {
  schedules: ScheduleItem[];
  customAudios: CustomAudio[];
  presetOverrides?: Record<string, PresetOverride>;
  onOpenAddModal: () => void;
  onEditSchedule: (item: ScheduleItem) => void;
  onUpdateSchedule?: (item: ScheduleItem) => void;
  onUploadAudio?: (name: string, file: File) => Promise<CustomAudio>;
  onDuplicateSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleSchedule: (id: string) => void;
  onTestRing: (item: ScheduleItem) => void;
  onApplyTemplate: (templateId: string) => void;
  getSoundLabel: (type: string, id: string) => string;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  customAudios,
  presetOverrides = {},
  onOpenAddModal,
  onEditSchedule,
  onUpdateSchedule,
  onUploadAudio,
  onDuplicateSchedule,
  onDeleteSchedule,
  onToggleSchedule,
  onTestRing,
  onApplyTemplate,
  getSoundLabel,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');
  const [soundFilter, setSoundFilter] = useState<'all' | 'custom' | 'preset' | 'tts'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateConfirm, setShowTemplateConfirm] = useState<boolean>(false);
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleItem | null>(null);

  // Quick Change Audio Modal state
  const [quickAudioSchedule, setQuickAudioSchedule] = useState<ScheduleItem | null>(null);
  const [quickAudioType, setQuickAudioType] = useState<'preset' | 'custom' | 'tts'>('custom');
  const [quickAudioId, setQuickAudioId] = useState<string>('');
  const [quickTtsText, setQuickTtsText] = useState<string>('');
  const [quickRepeats, setQuickRepeats] = useState<number>(1);
  const [quickIsPreviewing, setQuickIsPreviewing] = useState<boolean>(false);
  const [quickUploadMsg, setQuickUploadMsg] = useState<string>('');
  const [quickIsUploading, setQuickIsUploading] = useState<boolean>(false);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Open Quick Audio modal
  const handleOpenQuickAudio = (item: ScheduleItem) => {
    setQuickAudioSchedule(item);
    setQuickAudioType(item.audioType);
    setQuickAudioId(item.audioId);
    setQuickTtsText(item.ttsText || '');
    setQuickRepeats(item.repeats || 1);
    setQuickUploadMsg('');
  };

  const handleCloseQuickAudio = () => {
    if (quickIsPreviewing) {
      schoolAudioEngine.stopAll();
      setQuickIsPreviewing(false);
    }
    setQuickAudioSchedule(null);
  };

  // Preview quick audio sound
  const handleTestQuickSound = async () => {
    if (!quickAudioSchedule) return;
    if (quickIsPreviewing) {
      schoolAudioEngine.stopAll();
      setQuickIsPreviewing(false);
      return;
    }

    setQuickIsPreviewing(true);
    await schoolAudioEngine.playSound({
      audioType: quickAudioType,
      audioId: quickAudioId,
      ttsText: quickTtsText,
      repeats: quickRepeats,
      volume: quickAudioSchedule.volume,
      title: `Tes Audio: ${quickAudioSchedule.title}`,
    });
    setQuickIsPreviewing(false);
  };

  // Upload file inside quick audio modal
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAudio || !quickAudioSchedule) return;

    setQuickIsUploading(true);
    try {
      const name = `Audio ${quickAudioSchedule.time} - ${quickAudioSchedule.title}`;
      const saved = await onUploadAudio(name, file);
      setQuickAudioType('custom');
      setQuickAudioId(saved.id);
      setQuickUploadMsg(`✓ Audio "${saved.name}" berhasil diunggah dan dipilih!`);
      setTimeout(() => setQuickUploadMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setQuickUploadMsg('Gagal mengunggah file.');
    } finally {
      setQuickIsUploading(false);
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  // Save quick audio changes
  const handleSaveQuickAudio = () => {
    if (!quickAudioSchedule || !onUpdateSchedule) return;
    const updated: ScheduleItem = {
      ...quickAudioSchedule,
      audioType: quickAudioType,
      audioId: quickAudioType === 'custom' && !quickAudioId && customAudios.length > 0 ? customAudios[0].id : quickAudioId,
      ttsText: quickTtsText,
      repeats: quickRepeats,
    };
    onUpdateSchedule(updated);
    handleCloseQuickAudio();
  };

  // Filter schedules
  const filtered = schedules.filter((item) => {
    // day filter
    if (selectedDay !== 'all') {
      if (!item.days.includes(selectedDay)) return false;
    }
    // sound filter
    if (soundFilter !== 'all') {
      if (item.audioType !== soundFilter) return false;
    }
    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTime = item.time.includes(q);
      const matchCategory = CATEGORY_CONFIG[item.category]?.label.toLowerCase().includes(q);
      const matchSound = getSoundLabel(item.audioType, item.audioId).toLowerCase().includes(q);
      return matchTitle || matchTime || matchCategory || matchSound;
    }
    return true;
  });

  const customAudioScheduleCount = schedules.filter((s) => s.audioType === 'custom').length;

  const handleTemplateApply = () => {
    if (!selectedTemplate) return;
    onApplyTemplate(selectedTemplate);
    setShowTemplateConfirm(false);
    setSelectedTemplate('');
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Day Selector Segmented Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedDay === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Semua Hari ({schedules.length})
            </button>
            {DAYS_CONFIG.map((d) => {
              const count = schedules.filter((s) => s.days.includes(d.value)).length;
              return (
                <button
                  key={d.value}
                  onClick={() => setSelectedDay(d.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedDay === d.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {d.name} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Template Selector dropdown */}
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  if (e.target.value) {
                    setShowTemplateConfirm(true);
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Muat Template Jadwal...</option>
                {SCHEDULE_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenAddModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Bel Baru</span>
            </button>
          </div>
        </div>

        {/* Filter by Sound Type & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* Sound Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Filter Nada:</span>
            <button
              onClick={() => setSoundFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                soundFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSoundFilter('custom')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                soundFilter === 'custom'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Audio Kustom Saya ({customAudioScheduleCount})</span>
            </button>
            <button
              onClick={() => setSoundFilter('preset')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                soundFilter === 'preset'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nada Bawaan
            </button>
            <button
              onClick={() => setSoundFilter('tts')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                soundFilter === 'tts'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-400 hover:bg-teal-950/40'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Suara TTS</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari jam, keterangan, atau nada..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Schedule Items List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">
            {searchQuery ? 'Tidak ada jadwal yang cocok' : 'Belum ada jadwal jam bel'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Coba gunakan kata kunci pencarian yang berbeda.'
              : 'Tambahkan jam bel baru atau gunakan tombol "Muat Template Jadwal" di atas untuk mengisi jam masuk, istirahat, dan pulang otomatis.'}
          </p>
          {!searchQuery && (
            <div className="pt-2">
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Jam Bel Sekarang
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.khusus;
            const soundName = getSoundLabel(item.audioType, item.audioId);
            const isCustom = item.audioType === 'custom';
            const isOverriddenPreset = item.audioType === 'preset' && presetOverrides[item.audioId];

            return (
              <div
                key={item.id}
                className={`bg-slate-900/80 hover:bg-slate-900 border rounded-2xl p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  item.enabled
                    ? 'border-slate-800 hover:border-slate-700 shadow-sm'
                    : 'border-slate-800/50 opacity-60 bg-slate-950/40'
                }`}
              >
                {/* Left: Time and Details */}
                <div className="flex items-start sm:items-center gap-4">
                  {/* Time Badge */}
                  <div
                    className={`font-['JetBrains_Mono',monospace] text-xl font-bold tracking-tight px-3 py-1.5 rounded-xl border shrink-0 text-center select-none ${
                      item.enabled
                        ? 'bg-slate-950 border-slate-800 text-indigo-400 shadow-inner'
                        : 'bg-slate-950/50 border-slate-900 text-slate-600'
                    }`}
                  >
                    {item.time}
                  </div>

                  {/* Keterangan & Audio Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate max-w-sm">
                        {item.title}
                      </h4>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border font-medium ${cat.bg} ${cat.border} ${cat.color}`}
                      >
                        {cat.label}
                      </span>
                      {item.repeats > 1 && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.repeats}x putar
                        </span>
                      )}
                    </div>

                    {/* Sound and days metadata */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                      {/* Audio Badge */}
                      {isCustom ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                          <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[200px]">Audio Saya: {soundName}</span>
                        </span>
                      ) : isOverriddenPreset ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                          <Music className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[200px]">Diganti: {presetOverrides[item.audioId].customAudioName || soundName}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-300 text-[11px]">
                          <Music className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{soundName}</span>
                        </span>
                      )}

                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="font-['JetBrains_Mono',monospace]">{Math.round(item.volume * 100)}%</span>
                      </span>

                      <span aria-hidden="true" className="text-slate-600">·</span>
                      {/* Active Days */}
                      <div className="flex items-center gap-1">
                        {DAYS_CONFIG.map((d) => (
                          <span
                            key={d.value}
                            className={`text-[10px] font-medium px-1 rounded ${
                              !item.days.includes(d.value)
                                ? 'text-slate-600'
                                : 'text-indigo-300 bg-indigo-950/60 font-semibold'
                            }`}
                          >
                            {d.short}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Optional TTS Text snippet */}
                    {item.ttsText && (
                      <div className="flex items-center gap-1.5 text-xs text-teal-300/90 italic truncate max-w-xl">
                        <Sparkles className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className="truncate">"{item.ttsText}"</span>
                        <span className="not-italic text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                          {item.repeats && item.repeats > 1 ? `Diulang ${item.repeats}x (Nada + Kata)` : '1x Putar'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                  {/* Quick Change Audio Button */}
                  <button
                    onClick={() => handleOpenQuickAudio(item)}
                    title="Ganti Audio/Suara Khusus untuk Jam Ini"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Ganti Audio</span>
                  </button>

                  {/* Test Ring Button */}
                  <button
                    onClick={() => onTestRing(item)}
                    title="Uji Bunyikan Bel Ini Sekarang"
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tes Bel</span>
                  </button>

                  {/* On / Off Toggle */}
                  <button
                    onClick={() => onToggleSchedule(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      item.enabled
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {item.enabled ? 'Aktif' : 'Nonaktif'}
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => onDuplicateSchedule(item.id)}
                    title="Duplikasi Jadwal"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEditSchedule(item)}
                    title="Ubah Jadwal Selengkapnya"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingSchedule(item);
                    }}
                    title="Hapus Jadwal Ini"
                    aria-label={`Hapus jadwal ${item.title}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK CHANGE AUDIO MODAL */}
      {quickAudioSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ganti Suara / Audio Bel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Untuk jam <span className="text-indigo-400 font-bold">{quickAudioSchedule.time}</span> - "{quickAudioSchedule.title}"
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseQuickAudio}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Upload Notification */}
            {quickUploadMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{quickUploadMsg}</span>
              </div>
            )}

            {/* Source Segmented Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setQuickAudioType('custom')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  quickAudioType === 'custom'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio Saya ({customAudios.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickAudioType('preset')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  quickAudioType === 'preset'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nada Bawaan
              </button>
              <button
                type="button"
                onClick={() => setQuickAudioType('tts')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  quickAudioType === 'tts'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Suara TTS</span>
              </button>
            </div>

            {/* Content for Custom Audio */}
            {quickAudioType === 'custom' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Pilih File Audio Saya:</span>
                  <input
                    ref={quickFileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleQuickUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => quickFileInputRef.current?.click()}
                    disabled={quickIsUploading}
                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{quickIsUploading ? 'Mengunggah...' : '+ Unggah File Baru'}</span>
                  </button>
                </div>

                {customAudios.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {customAudios.map((aud) => {
                      const isSelected = quickAudioId === aud.id;
                      return (
                        <div
                          key={aud.id}
                          onClick={() => setQuickAudioId(aud.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold truncate">{aud.name}</p>
                            <p className="text-[11px] text-slate-400 font-['JetBrains_Mono',monospace]">
                              {aud.fileName} · {(aud.size / 1024).toFixed(0)} KB {aud.duration ? `· ${aud.duration}s` : ''}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
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
                      Belum ada file audio di koleksi Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => quickFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Pilih & Unggah File MP3 Sekarang
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content for Preset Sound */}
            {quickAudioType === 'preset' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Pilih Nada Bawaan Sistem:
                </label>
                <select
                  value={quickAudioId}
                  onChange={(e) => setQuickAudioId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {customAudios.filter((a) => a.isPreset || a.isDefault).length > 0 && (
                    <optgroup label="⭐ Nada Bawaan Kustom">
                      {customAudios
                        .filter((a) => a.isPreset || a.isDefault)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            ⭐ {a.name} ({a.duration ? `${a.duration}s` : 'Kustom'}) {a.isDefault ? '👑 [Utama Sekolah]' : ''}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <optgroup label="🔔 Nada Bawaan Pabrik">
                    {PRESET_SOUNDS.map((ps) => {
                      const ov = presetOverrides[ps.id];
                      return (
                        <option key={ps.id} value={ps.id}>
                          {ps.name} {ov ? `(Diganti Audio Kustom: ${ov.customAudioName || 'Kustom'})` : `(${ps.durationEstimate})`}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Content for TTS */}
            {quickAudioType === 'tts' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Teks Pengumuman Suara Berbicara:
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickTtsText(`Perhatian kepada seluruh siswa, saatnya ${quickAudioSchedule.title} dimulai.`)}
                    className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    Gunakan Keterangan Jadwal
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={quickTtsText}
                  onChange={(e) => setQuickTtsText(e.target.value)}
                  placeholder="Ketik teks yang akan diucapkan..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Pengulangan Nada & Tambahan Kata */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pengulangan Nada & Tambahan Kata</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  {quickTtsText.trim()
                    ? `Nada dan kalimat pengumuman diulang ${quickRepeats}x serentak`
                    : `Nada bel dibunyikan ${quickRepeats}x`}
                </p>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQuickRepeats(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      quickRepeats === r
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm shadow-teal-600/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r === 1 ? '1x Putar' : `${r}x Ulangi`}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestQuickSound}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {quickIsPreviewing ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                    <span>Hentikan</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                    <span>Dengarkan Nada Ini</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseQuickAudio}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickAudio}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  Terapkan Audio Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Schedule Confirm Modal */}
      {deletingSchedule && (
        <ConfirmModal
          isOpen={true}
          title="Hapus Jadwal Jam Bel?"
          message={
            <p>
              Apakah Anda yakin ingin menghapus jadwal{' '}
              <strong className="text-white font-bold">"{deletingSchedule.title}"</strong> ({deletingSchedule.time})?
            </p>
          }
          confirmLabel="Ya, Hapus Jadwal"
          cancelLabel="Batal"
          isDestructive={true}
          onConfirm={() => {
            onDeleteSchedule(deletingSchedule.id);
            setDeletingSchedule(null);
          }}
          onCancel={() => setDeletingSchedule(null)}
        />
      )}

      {/* Template Apply Confirmation Modal */}
      <ConfirmModal
        isOpen={showTemplateConfirm}
        title="Terapkan Template Jadwal Sekolah?"
        message={
          <p>
            Menerapkan template akan mengganti atau melengkapi daftar jam bel saat ini dengan susunan
            jam standar sekolah. Anda tetap dapat mengubah atau menghapus jadwal tersebut nanti.
          </p>
        }
        confirmLabel="Ya, Terapkan Template"
        cancelLabel="Batal"
        onConfirm={handleTemplateApply}
        onCancel={() => {
          setShowTemplateConfirm(false);
          setSelectedTemplate('');
        }}
      />
    </div>
  );
};
