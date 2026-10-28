import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Play,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Volume2,
  Check,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { schoolAudioEngine } from '../utils/audioEngine';

interface QuickAnnouncement {
  id: string;
  title: string;
  text: string;
  withChime: boolean;
}

const DEFAULT_ANNOUNCEMENTS: QuickAnnouncement[] = [
  {
    id: 'ann_upacara',
    title: 'Persiapan Upacara Bendera',
    text: 'Perhatian kepada seluruh siswa dan dewan guru, diharapkan segera menuju ke lapangan upacara untuk mengikuti upacara bendera.',
    withChime: true,
  },
  {
    id: 'ann_rapat_guru',
    title: 'Panggilan Seluruh Dewan Guru',
    text: 'Diberitahukan kepada bapak dan ibu guru, dimohon menghadiri rapat dinas singkat di ruang guru sekarang juga. Terima kasih.',
    withChime: true,
  },
  {
    id: 'ann_perwakilan_kelas',
    title: 'Panggilan Ketua Kelas / Perwakilan',
    text: 'Panggilan kepada seluruh ketua kelas atau perwakilan kelas, dimohon segera menuju ke ruang piket sekarang juga.',
    withChime: true,
  },
  {
    id: 'ann_kebersihan',
    title: 'Waktu Operasi Semut & Kebersihan',
    text: 'Sebelum kegiatan berakhir, seluruh siswa dimohon memeriksa dan membersihkan sampah di sekitar meja dan ruang kelas masing-masing.',
    withChime: true,
  },
  {
    id: 'ann_pulang_awal',
    title: 'Pemberitahuan Pulang Lebih Awal',
    text: 'Diberitahukan kepada seluruh siswa, berhubung ada kegiatan dewan guru, proses belajar mengajar hari ini selesai lebih awal. Selamat siang dan hati-hati di jalan.',
    withChime: true,
  },
  {
    id: 'ann_ibadah',
    title: 'Persiapan Ibadah / Sholat Berjamaah',
    text: 'Saatnya istirahat dan ibadah telah tiba. Seluruh siswa muslim dimohon mengambil air wudhu dan bersiap di musholla sekolah.',
    withChime: true,
  },
];

const STORAGE_KEY = 'bel_sekolah_custom_announcements_v1';

interface FreeAnnouncementTabProps {
  masterVolume: number;
  isPlaying: boolean;
  onStopAudio: () => void;
}

export const FreeAnnouncementTab: React.FC<FreeAnnouncementTabProps> = ({
  masterVolume,
  isPlaying,
  onStopAudio,
}) => {
  // Live Broadcast State
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [withIntroChime, setWithIntroChime] = useState<boolean>(true);
  const [broadcastRepeats, setBroadcastRepeats] = useState<number>(1);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [speechVolume, setSpeechVolume] = useState<number>(1.0);

  // Saved Custom Announcements
  const [announcements, setAnnouncements] = useState<QuickAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ANNOUNCEMENTS;
  });

  // Modal / Form to add new saved announcement
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newText, setNewText] = useState<string>('');
  const [newWithChime, setNewWithChime] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
    } catch (e) {
      console.error(e);
    }
  }, [announcements]);

  const handlePlayAnnouncement = async (text: string, playChime: boolean, labelTitle?: string) => {
    if (!text.trim()) return;

    if (isBroadcasting || isPlaying) {
      schoolAudioEngine.stopAll();
      setIsBroadcasting(false);
      onStopAudio();
      return;
    }

    setIsBroadcasting(true);
    try {
      await schoolAudioEngine.playSound({
        audioType: 'tts',
        audioId: 'chime_3',
        ttsText: text.trim(),
        playChimeBeforeTts: playChime,
        repeats: broadcastRepeats,
        volume: speechVolume,
        title: labelTitle || 'Pengumuman Suara Bebas',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleAddCustomAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    const newItem: QuickAnnouncement = {
      id: `ann_custom_${Date.now()}`,
      title: newTitle.trim(),
      text: newText.trim(),
      withChime: newWithChime,
    };

    setAnnouncements([newItem, ...announcements]);
    setNewTitle('');
    setNewText('');
    setShowAddForm(false);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const handleResetToDefaults = () => {
    if (confirm('Kembalikan daftar contoh pengumuman ke bawaan?')) {
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: SIARAN PENGUMUMAN SUARA LANGSUNG (LIVE BROADCAST) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Siarkan Pengumuman Suara Bebas
              </h2>
              <p className="text-xs text-slate-400">
                Ketik kalimat pengumuman apa saja untuk langsung diucapkan melalui speaker sekolah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer select-none bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={withIntroChime}
                onChange={(e) => setWithIntroChime(e.target.checked)}
                className="accent-teal-500 rounded"
              />
              <span>Bunyikan Nada Lonceng Pengantar (Ting-Tung)</span>
            </label>
          </div>
        </div>

        {/* Textarea Input */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Ketik teks pengumuman bebas di sini... Contoh: Perhatian kepada seluruh siswa kelas 7 dan 8, jam pelajaran olahraga hari ini dipindahkan ke aula serbaguna."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Quick volume slider and repetition selector */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Volume:</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={speechVolume}
                  onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                  className="w-20 accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="font-['JetBrains_Mono',monospace] text-white">
                  {Math.round(speechVolume * 100)}%
                </span>
              </div>

              {/* Pengulangan Suara Tambahan */}
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-slate-300 font-semibold">Pengulangan Suara:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBroadcastRepeats(r)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        broadcastRepeats === r
                          ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r === 1 ? '1x' : `${r}x`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast action button */}
            <div className="flex items-center gap-2">
              {broadcastText.trim() && (
                <button
                  type="button"
                  onClick={() => setBroadcastText('')}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Bersihkan Teks
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePlayAnnouncement(broadcastText, withIntroChime, 'Siaran Pengumuman Bebas')}
                disabled={!broadcastText.trim() && !isBroadcasting}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isBroadcasting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                    : 'bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-teal-600/20'
                }`}
              >
                {isBroadcasting ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Hentikan Siaran Suara</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>Siarkan Pengumuman Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: KOLEKSI PENGUMUMAN BEBAS YANG DAPAT DISIMPAN */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Daftar Pengumuman Cepat & Favorit</span>
            </h3>
            <p className="text-xs text-slate-400">
              Simpan pengumuman yang sering digunakan agar petugas piket atau guru bisa langsung memutarnya dengan 1-klik.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Kembalikan contoh pengumuman standar"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Contoh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Tutup Form' : 'Tambah Pengumuman Bebas'}</span>
            </button>
          </div>
        </div>

        {/* Form to Add New Free Announcement */}
        {showAddForm && (
          <form
            onSubmit={handleAddCustomAnnouncement}
            className="p-4 bg-slate-950 border border-teal-500/30 rounded-xl space-y-3"
          >
            <h4 className="text-xs font-bold text-teal-300">
              Buat Pengumuman Bebas Baru untuk Disimpan
            </h4>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Judul / Kategori Pengumuman
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Panggilan Siswa Tertentu / Pengumuman Ujian"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Isi Kalimat Pengumuman (Bahasa Indonesia)
              </label>
              <textarea
                rows={2}
                required
                placeholder="Ketik kalimat pengumuman lengkap yang akan dibacakan oleh sistem..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newWithChime}
                  onChange={(e) => setNewWithChime(e.target.checked)}
                  className="accent-teal-500 rounded"
                />
                <span>Bunyikan nada lonceng pengantar</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Pengumuman
                </button>
              </div>
            </div>
          </form>
        )}

        {/* List of Saved Announcements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                    <span>{item.title}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    title="Hapus dari daftar simpanan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "{item.text}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastText(item.text);
                    setWithIntroChime(item.withChime);
                  }}
                  className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  title="Salin ke kotak siaran di atas untuk diedit"
                >
                  Salin ke Kotak Siaran
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayAnnouncement(item.text, item.withChime, item.title)}
                  className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Siarkan Sekarang</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
