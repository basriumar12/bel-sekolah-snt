import React from 'react';
import { Bell, Plus, Volume2, Share2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'schedules' | 'manual' | 'announcements' | 'audio' | 'settings';
  onSelectTab: (tab: 'schedules' | 'manual' | 'announcements' | 'audio' | 'settings') => void;
  onOpenAddSchedule: () => void;
  onOpenShare?: () => void;
  schoolName: string;
  masterVolume: number;
  onChangeMasterVolume: (vol: number) => void;
  overriddenCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddSchedule,
  onOpenShare,
  schoolName,
  masterVolume,
  onChangeMasterVolume,
  overriddenCount = 0,
}) => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single brand wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/20">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white leading-tight">
            Bel Sekolah Otomatis
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-xs">
            {schoolName || 'Sistem Bel & Suara'}
          </span>
        </div>
      </div>

      {/* Zone 2: Clean text navigation links / tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onSelectTab('schedules')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'schedules'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Jadwal Bel
        </button>

        <button
          onClick={() => onSelectTab('manual')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Bel Manual
        </button>

        <button
          onClick={() => onSelectTab('announcements')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Pengumuman Suara
        </button>

        <button
          onClick={() => onSelectTab('audio')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Audio & Nada Bel</span>
          {overriddenCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'audio'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {overriddenCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Pengaturan
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Master Volume quick slider */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-300 text-xs">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onChangeMasterVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            title={`Volume Master: ${Math.round(masterVolume * 100)}%`}
          />
          <span className="font-['JetBrains_Mono',monospace] text-[11px] text-slate-400 w-7 text-right tabular-nums">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {onOpenShare && (
          <button
            onClick={onOpenShare}
            title="Bagikan Tautan Aplikasi Bel ke Orang Lain"
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Bagikan</span>
          </button>
        )}

        <button
          onClick={onOpenAddSchedule}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tambah Jam Bel</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>
    </header>
  );
};
