import React, { useState } from 'react';
import {
  Volume2,
  Square,
  AlertTriangle,
  Play,
  Music,
  Radio,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { CustomAudio, PresetOverride } from '../types';
import { schoolAudioEngine, PRESET_SOUNDS } from '../utils/audioEngine';

interface ManualRingModalProps {
  customAudios: CustomAudio[];
  presetOverrides?: Record<string, PresetOverride>;
  isPlaying: boolean;
  onStopAudio: () => void;
  masterVolume: number;
}

export const ManualRingModal: React.FC<ManualRingModalProps> = ({
  customAudios,
  presetOverrides = {},
  isPlaying,
  onStopAudio,
  masterVolume,
}) => {
  const [selectedType, setSelectedType] = useState<'preset' | 'custom' | 'tts'>('preset');
  const [selectedId, setSelectedId] = useState<string>('westminster_8');
  const [customText, setCustomText] = useState<string>('');
  const [repeats, setRepeats] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1.0);

  const handleTriggerManual = async (title: string, type = selectedType, id = selectedId, text = customText) => {
    await schoolAudioEngine.playSound({
      audioType: type,
      audioId: id,
      ttsText: text,
      playChimeBeforeTts: true,
      repeats,
      volume,
      masterVolume,
      title: `[Manual] ${title}`,
    });
  };

  const quickPresets = [
    {
      title: 'Masuk Kelas / Masuk Jam Ke-1',
      type: 'preset' as const,
      id: 'westminster_8',
      text: 'Perhatian, seluruh siswa diharapkan segera memasuki ruang kelas masing-masing.',
      color: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
      title: 'Pergantian Jam Pelajaran',
      type: 'preset' as const,
      id: 'westminster_4',
      text: 'Saatnya pergantian jam pelajaran dimulai.',
      color: 'bg-blue-600 hover:bg-blue-500',
    },
    {
      title: 'Waktu Istirahat',
      type: 'preset' as const,
      id: 'modern_chime_3',
      text: 'Saatnya istirahat. Selamat beristirahat.',
      color: 'bg-amber-600 hover:bg-amber-500',
    },
    {
      title: 'Masuk Setelah Istirahat',
      type: 'preset' as const,
      id: 'westminster_8',
      text: 'Waktu istirahat telah selesai. Seluruh siswa segera masuk kembali ke kelas.',
      color: 'bg-indigo-600 hover:bg-indigo-500',
    },
    {
      title: 'Bel Pulang Sekolah',
      type: 'preset' as const,
      id: 'westminster_8',
      text: 'Kegiatan belajar mengajar telah selesai. Selamat pulang dan hati-hati di jalan.',
      color: 'bg-purple-600 hover:bg-purple-500',
    },
    {
      title: 'Sirene Simulasi Darurat / Evakuasi',
      type: 'preset' as const,
      id: 'siren_alert',
      text: 'Perhatian! Ini adalah latihan evakuasi darurat. Seluruh penghuni sekolah harap segera menuju titik kumpul dengan tenang.',
      color: 'bg-rose-600 hover:bg-rose-500',
    },
  ];

  // Custom audio that is set as school default or first custom preset
  const defaultCustomAudio = customAudios.find((a) => a.isDefault) || customAudios.find((a) => a.isPreset);

  return (
    <div className="space-y-6">
      {/* Active playing indicator */}
      {isPlaying && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-sm font-bold text-white">
              Bel sedang berbunyi di speaker sekolah...
            </p>
          </div>
          <button
            onClick={onStopAudio}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Hentikan Pemutaran Sekarang
          </button>
        </div>
      )}

      {/* Quick 1-Click Ring Buttons */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            Tombol Cepat Bunyikan Bel (1-Klik)
          </h3>
          <p className="text-xs text-slate-400">
            Klik salah satu tombol di bawah untuk langsung membunyikan bel seketika melalui pengeras suara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Featured Custom Audio Preset Button if available */}
          {defaultCustomAudio && (
            <button
              onClick={() =>
                handleTriggerManual(
                  `Bel Kustom: ${defaultCustomAudio.name}`,
                  'preset',
                  defaultCustomAudio.id,
                  ''
                )
              }
              className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-900/30 cursor-pointer flex flex-col justify-between min-h-[105px] border border-amber-400/40 col-span-1 sm:col-span-2 lg:col-span-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                  <span>⭐ Bel Bawaan Kustom Sekolah</span>
                  {defaultCustomAudio.isDefault && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold">
                      👑 Suara Utama
                    </span>
                  )}
                </span>
                <Volume2 className="w-5 h-5 text-amber-200" />
              </div>
              <div className="space-y-0.5 mt-2">
                <p className="text-base font-bold leading-tight text-white">
                  Bunyikan "{defaultCustomAudio.name}"
                </p>
                <p className="text-xs text-amber-100/90 font-mono">
                  Audio Kustom Bawaan {defaultCustomAudio.duration ? `· ${defaultCustomAudio.duration} detik` : ''} · Klik untuk membunyikan langsung ke speaker
                </p>
              </div>
            </button>
          )}

          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleTriggerManual(preset.title, preset.type, preset.id, preset.text)}
              className={`${preset.color} text-white p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md cursor-pointer flex flex-col justify-between min-h-[105px]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Bunyikan Sekarang
                </span>
                <Volume2 className="w-4 h-4 opacity-90" />
              </div>
              <p className="text-sm font-bold leading-tight">
                {preset.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Manual Ring Trigger Configurator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            Bunyikan Bel Kustom
          </h3>
          <p className="text-xs text-slate-400">
            Pilih nada atau audio kustom apa saja, atur pengumuman khusus, dan bunyikan kapan saja.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          {/* Audio Source Picker */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedType('preset')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === 'preset'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Nada Bawaan
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === 'custom'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Audio Unggahan ({customAudios.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('tts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === 'tts'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Suara Pengumuman
              </button>
            </div>

            {selectedType === 'preset' && (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {/* Custom audios marked as preset */}
                {customAudios.filter((a) => a.isPreset || a.isDefault).length > 0 && (
                  <optgroup label="⭐ Nada Bawaan Kustom Anda">
                    {customAudios
                      .filter((a) => a.isPreset || a.isDefault)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          ⭐ {a.name} ({a.duration ? `${a.duration}s` : 'Kustom'}) {a.isDefault ? '👑 [Utama Sekolah]' : ''}
                        </option>
                      ))}
                  </optgroup>
                )}

                {/* Factory Presets */}
                <optgroup label="🔔 Nada Bawaan Pabrik">
                  {PRESET_SOUNDS.map((p) => {
                    const ov = presetOverrides[p.id];
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {ov ? `(Diganti: ${ov.customAudioName || 'Audio Kustom'})` : `(${p.category})`}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            )}

            {selectedType === 'custom' && (
              <div>
                {customAudios.length > 0 ? (
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {customAudios.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.duration ? `${a.duration}s` : 'Audio'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-400 p-2 bg-slate-950 rounded-lg border border-slate-800">
                    Belum ada audio kustom. Silakan unggah di tab "Audio & Suara".
                  </p>
                )}
              </div>
            )}

            {/* Volume & Repeats */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Volume:</span>
                  <span className="font-['JetBrains_Mono',monospace]">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-300">
                  Pengulangan (Nada & Tambahan Kata):
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRepeats(r)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                        repeats === r
                          ? 'bg-teal-600 text-white border-teal-500 shadow-sm shadow-teal-600/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r === 1 ? '1x Putar' : `${r}x Ulangi`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Announcement text and trigger button */}
          <div className="lg:col-span-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400">
                Teks Pengumuman Suara Tambahan (Opsional)
              </label>
              <textarea
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ketik teks pengumuman yang akan dibacakan setelah bel berbunyi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTriggerManual('Bel Manual Kustom')}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Volume2 className="w-4 h-4" />
                Bunyikan Bel Sekarang
              </button>

              {isPlaying && (
                <button
                  onClick={onStopAudio}
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
