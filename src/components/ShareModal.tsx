import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Smartphone,
  Globe,
  MessageCircle,
  Send,
  Users,
  Edit2,
  RotateCcw,
  CheckCircle2,
  Download,
  Upload,
  Music,
  Package,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  customAudiosCount?: number;
  onExportFullPackage?: () => Promise<number>;
  onExportPackageString?: () => Promise<string>;
  onImportPackage?: (
    jsonString: string
  ) => Promise<{ success: boolean; audioCount: number; message: string }>;
}

const DEFAULT_AI_STUDIO_URL = 'https://remix-bel-sekolah-otomatis-6689.ai.studio';
const STORAGE_CUSTOM_URL_KEY = 'bel_sekolah_custom_share_url_v1';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  schoolName = 'Bel Sekolah Otomatis',
  customAudiosCount = 0,
  onExportFullPackage,
  onExportPackageString,
  onImportPackage,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopyingJson, setIsCopyingJson] = useState<boolean>(false);
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pastedJson, setPastedJson] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const importPackageInputRef = React.useRef<HTMLInputElement>(null);
  const [customUrl, setCustomUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_URL_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AI_STUDIO_URL;
  });

  const activeShareUrl = customUrl.trim() || DEFAULT_AI_STUDIO_URL;
  const shareMessage = `Halo Bapak/Ibu Guru dan Staf Sekolah, berikut tautan aplikasi Bel Sekolah Otomatis (${schoolName}) yang dapat langsung diakses melalui HP, Tablet, atau Laptop: ${activeShareUrl}

*Catatan Audio Kustom:* Jika sekolah kita menggunakan audio suara khusus, buka menu "Bagikan" atau "Pengaturan" di aplikasi lalu klik "Muat Paket Jadwal & Audio" menggunakan file yang kami bagikan.`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(activeShareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = activeShareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleExportPackage = async () => {
    if (!onExportFullPackage) return;
    setIsExporting(true);
    try {
      await onExportFullPackage();
      setImportStatus('Paket lengkap (jadwal + audio) berhasil diunduh!');
    } catch (err) {
      setImportStatus('Gagal mengunduh paket audio.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setImportStatus(''), 4500);
    }
  };

  const handleCopyJsonString = async () => {
    if (!onExportPackageString) return;
    setIsCopyingJson(true);
    try {
      const jsonStr = await onExportPackageString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonStr);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = jsonStr;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setImportStatus('Teks JSON paket berhasil disalin! Siap dipaste ke pesan WhatsApp.');
    } catch (err) {
      setImportStatus('Gagal menyalin teks paket.');
    } finally {
      setIsCopyingJson(false);
      setTimeout(() => setImportStatus(''), 5000);
    }
  };

  const handleApplyPastedJson = async () => {
    if (!pastedJson.trim() || !onImportPackage) return;
    try {
      const res = await onImportPackage(pastedJson.trim());
      if (res && res.message) {
        setImportStatus(res.message);
      } else {
        setImportStatus('Paket audio & jadwal berhasil dipulihkan!');
      }
      setPastedJson('');
      setShowPasteBox(false);
    } catch (err) {
      setImportStatus('Gagal membaca teks JSON yang ditempel.');
    }
    setTimeout(() => setImportStatus(''), 5000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportPackage) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const res = await onImportPackage(content);
        if (res && res.message) {
          setImportStatus(res.message);
        } else {
          setImportStatus('Paket audio berhasil dipulihkan di perangkat ini!');
        }
      } catch (err) {
        setImportStatus('Gagal memproses file paket.');
      }
      setTimeout(() => setImportStatus(''), 5000);
    };
    reader.readAsText(file);
  };

  const handleSaveCustomUrl = (newUrl: string) => {
    setCustomUrl(newUrl);
    try {
      localStorage.setItem(STORAGE_CUSTOM_URL_KEY, newUrl.trim());
    } catch (e) {
      console.error(e);
    }
    setIsEditing(false);
  };

  const handleResetToDefault = () => {
    setCustomUrl(DEFAULT_AI_STUDIO_URL);
    try {
      localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
    } catch (e) {
      console.error(e);
    }
    setIsEditing(false);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    activeShareUrl
  )}&bgcolor=0f172a&color=ffffff&margin=1`;

  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const teleUrl = `https://t.me/share/url?url=${encodeURIComponent(
      activeShareUrl
    )}&text=${encodeURIComponent(`Aplikasi Bel Sekolah Otomatis - ${schoolName}`)}`;
    window.open(teleUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Bagikan Aplikasi Bel Sekolah
              </h3>
              <p className="text-xs text-slate-400">
                Link publik siap akses untuk HP Android, iPhone, Tablet, & Laptop
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

        {/* Info box: Why .ai.studio works while run.app is restricted */}
        <div className="p-3 bg-teal-950/30 border border-teal-500/30 rounded-xl space-y-1 text-xs text-teal-200">
          <div className="flex items-center gap-2 font-bold text-teal-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Link Resmi Publik (.ai.studio)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            Tautan dengan format <strong>.ai.studio</strong> dapat dibuka langsung oleh siapa saja tanpa akun developer dan tidak diblokir di HP maupun Tablet.
          </p>
        </div>

        {/* Link Share Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Tautan Siap Bagikan:
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kembalikan Default</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Sesuaikan URL</span>
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://remix-bel-sekolah-otomatis-6689.ai.studio"
                className="w-full bg-slate-950 border border-teal-500 rounded-xl px-3 py-2 text-xs font-['JetBrains_Mono',monospace] text-white focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomUrl(customUrl)}
                  className="px-3.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Tautan
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-['JetBrains_Mono',monospace] text-teal-300 select-all overflow-x-auto whitespace-nowrap font-medium">
                {activeShareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Quick Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Kirim ke WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleShareTelegram}
            className="p-2.5 rounded-xl bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span>Kirim ke Telegram</span>
          </button>
        </div>

        {/* Custom Audio Package Section */}
        <div className="p-4 bg-slate-950/80 border border-teal-500/40 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Bagikan Disertai Audio Kustom Saya</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30 font-semibold">
                    {customAudiosCount} File Tersimpan
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sertakan seluruh file audio MP3/WAV kustom Anda ke dalam paket
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Download package */}
            <button
              type="button"
              onClick={handleExportPackage}
              disabled={isExporting || !onExportFullPackage}
              className="p-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{isExporting ? 'Menyiapkan...' : '1. Unduh Paket (.json)'}</span>
            </button>

            {/* Import package */}
            <div>
              <input
                ref={importPackageInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importPackageInputRef.current?.click()}
                disabled={!onImportPackage}
                className="w-full p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>2. Muat Paket di HP / Laptop</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
            <button
              type="button"
              onClick={handleCopyJsonString}
              disabled={isCopyingJson || !onExportPackageString}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopyingJson ? 'Menyalin...' : 'Salin Teks JSON Paket'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{showPasteBox ? 'Tutup Kotak Tempel' : 'Tempel Teks JSON'}</span>
            </button>

            <a
              href="/contoh_paket_jadwal_audio.json"
              download="contoh_paket_jadwal_audio.json"
              className="text-slate-400 hover:text-slate-200 underline"
            >
              Unduh File Contoh (.json)
            </a>
          </div>

          {showPasteBox && (
            <div className="space-y-2 p-3 bg-slate-900 rounded-xl border border-indigo-500/30">
              <label className="block text-[11px] font-semibold text-indigo-200">
                Tempelkan Teks JSON Paket yang Dikirimkan Rekan:
              </label>
              <textarea
                rows={3}
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Tempel teks JSON di sini (diawali {"version":"2.0", ...})...'
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-['JetBrains_Mono',monospace] text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyPastedJson}
                  disabled={!pastedJson.trim()}
                  className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  Terapkan Paket Ini
                </button>
              </div>
            </div>
          )}

          {importStatus && (
            <div className="p-2.5 bg-slate-900 border border-teal-500/40 rounded-xl text-xs text-teal-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            💡 <strong>Cara Membagikan Audio Kustom:</strong> Klik <em>“1. Unduh Paket”</em> untuk mengemas jadwal beserta seluruh file suara kustom Anda menjadi 1 file. Kirim file tersebut ke guru piket via WhatsApp bersama link web. Di HP mereka, mereka cukup membuka link web lalu klik <em>“2. Muat Paket”</em> agar seluruh rekaman & lagu bel sekolah langsung tersedia.
          </p>
        </div>

        {/* QR Code Section */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>Scan QR Code (Buka di HP / Tablet Sekarang)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
            >
              {showQr ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>

          {showQr && (
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl shrink-0 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR Code Aplikasi Bel Sekolah"
                  className="w-32 h-32 rounded-lg"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 text-center sm:text-left">
                <p className="font-semibold text-slate-200">
                  Cara Buka di Ponsel / Tablet:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                  <li>Buka kamera smartphone atau pemindai QR.</li>
                  <li>Arahkan kamera ke gambar QR code di samping.</li>
                  <li>Ketuk tautan untuk membuka aplikasi bel tanpa hambatan.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Publish instructions from AI Studio */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Globe className="w-4 h-4 shrink-0 text-teal-400" />
            <span>Cara Membagikan / Mempublikasikan dari Google AI Studio:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <li>Di halaman utama <strong>Google AI Studio Build</strong> (tempat Anda mengedit), lihat ke pojok kanan atas layar.</li>
            <li>Klik tombol <strong>"Share"</strong> atau <strong>"Publish"</strong>.</li>
            <li>Pilih opsi <strong>"Public"</strong> (atau siapa saja yang memiliki link).</li>
            <li>Link resmi <strong>https://remix-bel-sekolah-otomatis-6689.ai.studio</strong> akan aktif dan dapat diakses publik oleh seluruh guru dan murid sekolah.</li>
          </ol>
        </div>

        {/* Close Button */}
        <div className="pt-2 flex items-center justify-between">
          <a
            href={activeShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Link Langsung</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

