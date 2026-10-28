import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  FileAudio,
  History,
  Music,
  Radio,
  Settings as SettingsIcon,
  Volume2,
} from 'lucide-react';
import { useSchoolBell } from './hooks/useSchoolBell';
import { Header } from './components/Header';
import { ClockBanner } from './components/ClockBanner';
import { ScheduleList } from './components/ScheduleList';
import { ScheduleModal } from './components/ScheduleModal';
import { AudioLibrary } from './components/AudioLibrary';
import { ManualRingModal } from './components/ManualRingModal';
import { FreeAnnouncementTab } from './components/FreeAnnouncementTab';
import { BellLogs } from './components/BellLogs';
import { SettingsTab } from './components/SettingsTab';
import { ShareModal } from './components/ShareModal';
import { ScheduleItem } from './types';
import { DEFAULT_SCHEDULES } from './utils/constants';

export default function App() {
  const {
    currentTime,
    schedules,
    settings,
    logs,
    customAudios,
    presetOverrides,
    isPlaying,
    currentPlayingTitle,
    audioUnlocked,
    wakeLockActive,
    nextBell,
    handleUnlockAudio,
    triggerBell,
    stopPlayback,
    setPresetOverride,
    removePresetOverride,
    resetAllPresetOverrides,
    batchReplaceSoundInSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    duplicateSchedule,
    toggleSchedule,
    uploadCustomAudio,
    toggleCustomAudioAsPreset,
    setCustomAudioAsSchoolDefault,
    applyAudioToAllSchedules,
    deleteCustomAudioItem,
    applyTemplate,
    updateSettings,
    clearLogs,
    exportConfiguration,
    exportPackageAsJsonString,
    importConfiguration,
    getSoundLabel,
    reseedDefaultAudios,
  } = useSchoolBell();

  const [activeTab, setActiveTab] = useState<'schedules' | 'manual' | 'announcements' | 'audio' | 'settings'>(
    'schedules'
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = (item: Omit<ScheduleItem, 'id'> | ScheduleItem) => {
    if ('id' in item && item.id) {
      updateSchedule(item as ScheduleItem);
    } else {
      addSchedule(item);
    }
  };

  const handleResetDefault = () => {
    localStorage.removeItem('bel_sekolah_schedules_v1');
    applyTemplate('standar_smp_sma');
  };

  const overriddenCount = Object.keys(presetOverrides || {}).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddSchedule={handleOpenAddModal}
        onOpenShare={() => setIsShareModalOpen(true)}
        schoolName={settings.schoolName}
        masterVolume={settings.masterVolume}
        onChangeMasterVolume={(vol) => updateSettings({ masterVolume: vol })}
        overriddenCount={overriddenCount}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Main Clock, Scheduler Status, and Countdown */}
        <ClockBanner
          currentTime={currentTime}
          nextBell={nextBell}
          autoBellEnabled={settings.autoBellEnabled}
          onToggleAutoBell={() => updateSettings({ autoBellEnabled: !settings.autoBellEnabled })}
          isPlaying={isPlaying}
          currentPlayingTitle={currentPlayingTitle}
          onStopAudio={stopPlayback}
          audioUnlocked={audioUnlocked}
          onUnlockAudio={handleUnlockAudio}
          wakeLockActive={wakeLockActive}
          onOpenManualRing={() => setActiveTab('manual')}
        />

        {/* Mobile Navigation Segmented Tabs */}
        <div className="md:hidden flex items-center justify-between gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center cursor-pointer ${
              activeTab === 'schedules' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Jadwal Bel
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center cursor-pointer ${
              activeTab === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center cursor-pointer ${
              activeTab === 'announcements' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Pengumuman
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'audio' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <span>Audio</span>
            {overriddenCount > 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center cursor-pointer ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Opsi
          </button>
        </div>

        {/* Dynamic Content Views */}
        <div>
          {activeTab === 'schedules' && (
            <ScheduleList
              schedules={schedules}
              customAudios={customAudios}
              presetOverrides={presetOverrides}
              onOpenAddModal={handleOpenAddModal}
              onEditSchedule={handleOpenEditModal}
              onUpdateSchedule={updateSchedule}
              onUploadAudio={uploadCustomAudio}
              onDuplicateSchedule={duplicateSchedule}
              onDeleteSchedule={deleteSchedule}
              onToggleSchedule={toggleSchedule}
              onTestRing={(item) => triggerBell(item, 'manual')}
              onApplyTemplate={applyTemplate}
              getSoundLabel={getSoundLabel}
            />
          )}

          {activeTab === 'manual' && (
            <ManualRingModal
              customAudios={customAudios}
              presetOverrides={presetOverrides}
              isPlaying={isPlaying}
              onStopAudio={stopPlayback}
              masterVolume={settings.masterVolume}
            />
          )}

          {activeTab === 'announcements' && (
            <FreeAnnouncementTab
              masterVolume={settings.masterVolume}
              isPlaying={isPlaying}
              onStopAudio={stopPlayback}
            />
          )}

          {activeTab === 'audio' && (
            <AudioLibrary
              customAudios={customAudios}
              presetOverrides={presetOverrides}
              defaultPresetId={settings.defaultPresetId}
              onUploadAudio={uploadCustomAudio}
              onDeleteCustomAudio={deleteCustomAudioItem}
              onTogglePreset={toggleCustomAudioAsPreset}
              onSetSchoolDefault={setCustomAudioAsSchoolDefault}
              onApplyToAllSchedules={applyAudioToAllSchedules}
              onReseedDefaultAudios={reseedDefaultAudios}
              onSetPresetOverride={setPresetOverride}
              onRemovePresetOverride={removePresetOverride}
              onResetAllPresetOverrides={resetAllPresetOverrides}
              isPlaying={isPlaying}
              onStopAudio={stopPlayback}
            />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <SettingsTab
                settings={settings}
                customAudios={customAudios}
                onUpdateSettings={updateSettings}
                onSetSchoolDefault={setCustomAudioAsSchoolDefault}
                onReseedDefaultAudios={reseedDefaultAudios}
                onExportConfig={exportConfiguration}
                onImportConfig={importConfiguration}
                onResetDefault={handleResetDefault}
                onOpenShare={() => setIsShareModalOpen(true)}
              />

              <div className="pt-4 border-t border-slate-800">
                <BellLogs logs={logs} onClearLogs={clearLogs} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Create / Edit Modal */}
      {isModalOpen && (
        <ScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
          initialItem={editingItem}
          customAudios={customAudios}
          presetOverrides={presetOverrides}
          defaultPresetId={settings.defaultPresetId}
          onUploadAudio={uploadCustomAudio}
          onNavigateToAudioTab={() => setActiveTab('audio')}
          onDelete={deleteSchedule}
        />
      )}

      {/* Share / Multi-Device Access Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          schoolName={settings.schoolName}
          customAudiosCount={customAudios.length}
          onExportFullPackage={exportConfiguration}
          onExportPackageString={exportPackageAsJsonString}
          onImportPackage={importConfiguration}
        />
      )}

      {/* Clean Footer */}
      <footer className="border-t border-slate-800/60 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Bel Sekolah Otomatis &copy; {new Date().getFullYear()} &middot; {settings.schoolName}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Presisi Waktu Lokal Browser</span>
            <span aria-hidden="true">&middot;</span>
            <span>Web Audio API Synthesizer</span>
            <span aria-hidden="true">&middot;</span>
            <span>Penyimpanan IndexedDB Offline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
