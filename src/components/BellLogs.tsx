import React, { useState } from 'react';
import { History, Trash2, CheckCircle2, Radio, Clock } from 'lucide-react';
import { BellLog } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface BellLogsProps {
  logs: BellLog[];
  onClearLogs: () => void;
}

export const BellLogs: React.FC<BellLogsProps> = ({ logs, onClearLogs }) => {
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Riwayat Aktivitas Bel Sekolah
            </h3>
            <p className="text-xs text-slate-400">
              Catatan pemutaran bel otomatis maupun manual yang telah berbunyi.
            </p>
          </div>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Bersihkan Riwayat
          </button>
        )}
      </div>

      {logs.length > 0 ? (
        <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
          {logs.map((log) => {
            const isAuto = log.triggerType === 'otomatis';
            return (
              <div
                key={log.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`font-['JetBrains_Mono',monospace] font-bold px-2.5 py-1 rounded-lg border tabular-nums shrink-0 ${
                      isAuto
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    {log.timeFormatted}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {log.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log.soundName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isAuto
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}
                  >
                    {isAuto ? 'Otomatis' : 'Manual'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center text-slate-400 space-y-1">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">
            Belum Ada Riwayat Pemutaran Bel
          </p>
          <p className="text-xs text-slate-500">
            Ketika jadwal otomatis mencapai waktunya atau Anda membunyikan bel manual, catatannya akan muncul di sini.
          </p>
        </div>
      )}

      {/* Confirm Clear Logs */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Bersihkan Semua Riwayat Bel?"
        message="Apakah Anda yakin ingin menghapus seluruh catatan pemutaran bel sekolah? Data riwayat yang sudah dihapus tidak dapat dipulihkan."
        confirmLabel="Ya, Bersihkan Riwayat"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          onClearLogs();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
