import React from 'react';
import {
  Volume2,
  Square,
  Play,
  VolumeX,
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { CATEGORY_CONFIG } from '../utils/constants';

interface ClockBannerProps {
  currentTime: Date;
  nextBell: {
    schedule: ScheduleItem;
    countdownStr: string;
    secondsRemaining: number;
  } | null;
  autoBellEnabled: boolean;
  onToggleAutoBell: () => void;
  isPlaying: boolean;
  currentPlayingTitle: string;
  onStopAudio: () => void;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
  onOpenManualRing: () => void;
  wakeLockActive?: boolean;
}

export const ClockBanner: React.FC<ClockBannerProps> = ({
  currentTime,
  nextBell,
  autoBellEnabled,
  onToggleAutoBell,
  isPlaying,
  currentPlayingTitle,
  onStopAudio,
  audioUnlocked,
  onUnlockAudio,
  onOpenManualRing,
  wakeLockActive,
}) => {
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const dayName = indonesianDays[currentTime.getDay()];
  const dateNum = currentTime.getDate();
  const monthName = indonesianMonths[currentTime.getMonth()];
  const yearNum = currentTime.getFullYear();
  const formattedDate = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;

  return (
    <div className="space-y-4">
      {/* Active playing indicator banner */}
      {isPlaying && (
        <div className="space-y-2">
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1 h-6">
                <span className="w-1 bg-emerald-400 h-3 animate-[bounce_0.8s_infinite]"></span>
                <span className="w-1 bg-emerald-400 h-6 animate-[bounce_0.6s_infinite_0.1s]"></span>
                <span className="w-1 bg-emerald-400 h-4 animate-[bounce_0.7s_infinite_0.2s]"></span>
                <span className="w-1 bg-emerald-400 h-5 animate-[bounce_0.5s_infinite_0.3s]"></span>
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Bel Sedang Berbunyi
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {currentPlayingTitle || 'Pemutaran Audio'}
                </p>
              </div>
            </div>
            <button
              onClick={onStopAudio}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Hentikan Suara
            </button>
          </div>

          {!audioUnlocked && (
            <button
              onClick={onUnlockAudio}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 animate-bounce cursor-pointer shadow-lg transition-all"
            >
              <Volume2 className="w-4 h-4 fill-current shrink-0" />
              <span>⚠️ Suara Tertahan Browser Tablet! KETUK DI SINI SEKARANG agar suara langsung keluar</span>
            </button>
          )}
        </div>
      )}

      {/* Touch to unlock audio notice for mobile / tablet devices */}
      {!audioUnlocked && !isPlaying && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">
                Sentuh Sekali untuk Mengaktifkan Suara Bel
              </p>
              <p className="text-[11px] text-amber-300/80">
                Browser pada tablet/HP memerlukan 1x sentuhan agar bel otomatis dapat berbunyi nyaring.
              </p>
            </div>
          </div>
          <button
            onClick={onUnlockAudio}
            className="w-full sm:w-auto px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow"
          >
            <Volume2 className="w-3.5 h-3.5 fill-current" />
            <span>Aktifkan & Tes Suara Bel</span>
          </button>
        </div>
      )}

      {/* Main Clock & Next Bell Card Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Digital Clock Box */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                Waktu Nyata Sekolah (WIB / Waktu Lokal)
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${
                    autoBellEnabled
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                  title={wakeLockActive ? 'Screen Wake Lock Aktif: Perangkat tidak otomatis sleep saat bel aktif' : undefined}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      autoBellEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{autoBellEnabled ? 'Otomatis Aktif' : 'Otomatis Jeda'}</span>
                  {autoBellEnabled && wakeLockActive && (
                    <span className="text-[10px] text-indigo-300 font-semibold border-l border-emerald-500/40 pl-1.5">
                      Anti-Sleep
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Time display */}
            <div className="flex items-baseline gap-1 my-2">
              <span className="font-['JetBrains_Mono',monospace] text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white tabular-nums">
                {hours}:{minutes}
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-2xl sm:text-3xl md:text-4xl font-semibold text-indigo-400 tabular-nums">
                :{seconds}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-300 mt-1">
              {formattedDate}
            </p>
          </div>

          {/* Quick controls on clock bottom */}
          <div className="pt-5 mt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            <button
              onClick={onToggleAutoBell}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                autoBellEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {autoBellEnabled ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" /> Jeda Jadwal Otomatis
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Aktifkan Bel Otomatis
                </>
              )}
            </button>

            <button
              onClick={onOpenManualRing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Bunyikan Bel Manual Sekarang
            </button>
          </div>
        </div>

        {/* Next Bell Card */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Jadwal Bel Berikutnya Hari Ini
              </span>
              {nextBell && (
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${
                    CATEGORY_CONFIG[nextBell.schedule.category].bg
                  } ${CATEGORY_CONFIG[nextBell.schedule.category].border} ${
                    CATEGORY_CONFIG[nextBell.schedule.category].color
                  }`}
                >
                  {CATEGORY_CONFIG[nextBell.schedule.category].label}
                </span>
              )}
            </div>

            {nextBell ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {nextBell.schedule.title}
                  </h3>
                  <span className="font-['JetBrains_Mono',monospace] text-2xl font-bold text-indigo-400 tabular-nums">
                    {nextBell.schedule.time}
                  </span>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Hitung Mundur:</span>
                    <span className="font-['JetBrains_Mono',monospace] font-bold text-emerald-400 tabular-nums">
                      {nextBell.countdownStr}
                    </span>
                  </div>
                  {/* Progress bar visual indicator */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.min(
                            100,
                            100 - (nextBell.secondsRemaining / (45 * 60)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {nextBell.schedule.ttsText && (
                  <p className="text-xs text-slate-400 line-clamp-2 italic">
                    "{nextBell.schedule.ttsText}"
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <p className="text-sm font-medium text-slate-300 mb-1">
                  {autoBellEnabled
                    ? 'Tidak ada jadwal tersisa hari ini'
                    : 'Bel Otomatis Sedang Dijeda'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {autoBellEnabled
                    ? 'Semua jadwal bel untuk hari ini telah selesai atau belum ada jadwal pada hari ini.'
                    : 'Nyalakan kembali bel otomatis agar jadwal dapat berbunyi tepat waktu.'}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Sistem Audio Web</span>
            <button
              onClick={onUnlockAudio}
              className="flex items-center gap-1.5 font-medium hover:text-white transition-colors cursor-pointer"
              title={audioUnlocked ? 'Sistem audio aktif & siap bunyi' : 'Sentuh untuk mengaktifkan izin suara browser'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  audioUnlocked ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className={audioUnlocked ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-bold underline'}>
                {audioUnlocked ? 'Siap Bunyi (Aktif)' : 'Sentuh untuk Aktifkan'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
