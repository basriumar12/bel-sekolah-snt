import React, { useRef, useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  Volume2,
  BellRing,
  RotateCcw,
  Check,
  Building,
  ShieldCheck,
  Share2,
  Globe,
  Copy,
  Star,
  Crown,
  Music,
  Sparkles,
} from 'lucide-react';
import { CustomAudio, SchoolSettings } from '../types';
import { PRESET_SOUNDS } from '../utils/audioEngine';
import { ConfirmModal } from './ConfirmModal';

interface SettingsTabProps {
  settings: SchoolSettings;
  customAudios?: CustomAudio[];
  onUpdateSettings: (partial: Partial<SchoolSettings>) => void;
  onSetSchoolDefault?: (id: string) => Promise<void>;
  onReseedDefaultAudios?: () => Promise<void>;
  onExportConfig: () => void | Promise<any>;
  onImportConfig: (
    jsonString: string
  ) => Promise<{ success: boolean; audioCount: number; message: string }> | boolean | Promise<any>;
  onResetDefault: () => void;
  onOpenShare?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  customAudios = [],
  onUpdateSettings,
  onSetSchoolDefault,
  onReseedDefaultAudios,
  onExportConfig,
  onImportConfig,
  onResetDefault,
  onOpenShare,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const res = await onImportConfig(content);
        if (typeof res === 'object' && res !== null && 'message' in res) {
          setImportStatus(res.message);
        } else if (res) {
          setImportStatus('Data jadwal dan audio kustom berhasil dipulihkan!');
        } else {
          setImportStatus('Gagal memulihkan: Format file JSON tidak valid.');
        }
      } catch (err) {
        setImportStatus('Gagal memproses file konfigurasi.');
      }
      setTimeout(() => setImportStatus(''), 5000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* School Profile */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Identitas Sekolah & Satuan Pendidikan
            </h3>
            <p className="text-xs text-slate-400">
              Nama sekolah yang akan ditampilkan pada sistem dan kepala pengumuman.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Nama Sekolah / Lembaga
            </label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => onUpdateSettings({ schoolName: e.target.value })}
              placeholder="Contoh: SMP NEGERI 1 INDONESIA"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Tahun Ajaran / Semester
            </label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={(e) => onUpdateSettings({ academicYear: e.target.value })}
              placeholder="Contoh: 2026/2027 - Semester Ganjil"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Audio & Notifications Settings */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Pengaturan Suara & Notifikasi Layar
            </h3>
            <p className="text-xs text-slate-400">
              Kendali volume master amplifier dan notifikasi pop-up desktop.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Master Volume */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Volume Master Sistem Bel
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-xs font-bold text-indigo-400 tabular-nums">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
            />
            <p className="text-[11px] text-slate-500">
              Volume ini berlaku sebagai pengali utama ke seluruh nada bel dan pengeras suara sound system sekolah.
            </p>
          </div>

          {/* Nada Bel Bawaan Utama Sekolah */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nada Bel Bawaan Utama Sekolah</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Nada standar yang akan otomatis dipilih saat membuat jam bel baru atau membunyikan bel manual.
                </p>
              </div>
            </div>

            <select
              value={settings.defaultPresetId || 'westminster_8'}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const isCustom = customAudios.some((a) => a.id === selectedVal);
                if (isCustom && onSetSchoolDefault) {
                  onSetSchoolDefault(selectedVal);
                } else {
                  onUpdateSettings({
                    defaultPresetId: selectedVal,
                    defaultCustomAudioId: undefined,
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {customAudios.length > 0 && (
                <optgroup label="⭐ Nada Bawaan Kustom Buatan Anda">
                  {customAudios.map((aud) => (
                    <option key={aud.id} value={aud.id}>
                      ⭐ {aud.name} ({aud.duration ? `${aud.duration} dtk` : 'Kustom'}) {aud.isPreset ? '· [Bawaan]' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="🔔 Nada Bawaan Pabrik">
                {PRESET_SOUNDS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category} - {p.durationEstimate})
                  </option>
                ))}
              </optgroup>
            </select>

            {onReseedDefaultAudios && (
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {customAudios.length} nada tersimpan di database lokal sistem.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await onReseedDefaultAudios();
                    setImportStatus('✓ Berhasil memasukkan seluruh nada bawaan ke database!');
                    setTimeout(() => setImportStatus(''), 4000);
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>+ Masukkan / Sinkronkan Audio Bawaan</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <BellRing className="w-3.5 h-3.5 text-indigo-400" />
                Notifikasi Layar Komputer (Desktop Notifications)
              </span>
              <p className="text-[11px] text-slate-400">
                Tampilkan notifikasi pop-up di layar saat jam bel tiba meskipun browser diminimalkan.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => {
                  onUpdateSettings({ notificationsEnabled: e.target.checked });
                  if (e.target.checked && 'Notification' in window) {
                    Notification.requestPermission();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Bagikan Aplikasi & Akses Multi-Perangkat */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Bagikan Aplikasi & Akses Multi-Perangkat
              </h3>
              <p className="text-xs text-slate-400">
                Kirim tautan atau QR code agar guru piket, TU, dan pimpinan sekolah dapat membuka bel online.
              </p>
            </div>
          </div>
          {onOpenShare && (
            <button
              type="button"
              onClick={onOpenShare}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-teal-600/20 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Link / Scan QR</span>
            </button>
          )}
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Cadangkan & Pulihkan Jadwal (Backup & Restore)
            </h3>
            <p className="text-xs text-slate-400">
              Simpan seluruh jadwal sekolah ke file JSON atau pindahkan ke komputer sekolah lain dengan mudah.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Ekspor Paket Bel Lengkap</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30">
                  + Audio Kustom
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Unduh file paket berisi seluruh jam bel, pengaturan, dan seluruh file audio MP3/WAV kustom Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportConfig}
              className="w-full py-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Paket Bel Lengkap (.json)
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white">
                Pulihkan Paket Jadwal & Audio
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Muat file paket cadangan di laptop atau HP lain untuk memulihkan jadwal sekaligus file audio kustom.
              </p>
            </div>
            <div>
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                <Upload className="w-3.5 h-3.5" />
                Pilih File Paket (.json)
              </button>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 bg-slate-800 rounded-lg text-xs font-medium text-indigo-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Danger Zone / Factory Reset */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-rose-300">
            Kembalikan ke Jadwal Bawaan Pabrik
          </h4>
          <p className="text-[11px] text-rose-400/80">
            Mengembalikan seluruh jam bel ke daftar awal standar sekolah Indonesia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset ke Bawaan
        </button>
      </div>

      {/* Confirm Reset to Defaults */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Kembalikan ke Jadwal Standar Pabrik?"
        message="Apakah Anda yakin ingin mereset seluruh jadwal dan konfigurasi ke pengaturan standar awal? Jadwal kustom yang telah Anda buat akan digantikan dengan template standar SMP/SMA."
        confirmLabel="Ya, Reset Jadwal"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          onResetDefault();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
