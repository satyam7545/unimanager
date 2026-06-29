import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Upload,
  Bell,
  Database,
  Check,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();

  // Local storage client preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sound_enabled') !== 'false';
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('push_enabled') === 'true';
  });

  // Backup file inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [importState, setImportState] = useState<'idle' | 'loading' | 'success'>('idle');

  // Mutations
  const importMutation = useMutation({
    mutationFn: async (backup: any) => {
      return api.post('/backup/import', { backup });
    },
    onSuccess: () => {
      setImportState('success');
      // Invalidate all cache queries to refresh subjects, note lists, habits, planner, etc.
      queryClient.invalidateQueries();
      setSelectedFile(null);
      setParsedBackupData(null);
      setShowConfirmModal(false);
      setTimeout(() => setImportState('idle'), 2000);
    },
    onError: (err: any) => {
      setImportState('idle');
      setErrorMessage(err.response?.data?.message || err.message || 'Import failed.');
    },
  });

  const handleExportBackup = async () => {
    setExportState('loading');
    setErrorMessage(null);
    try {
      const res = await api.get('/backup/export');
      const backupObj = res.data.data.backup;

      // Force direct download of JSON file in client browser
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `unimanager_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    } catch (err: any) {
      setExportState('idle');
      setErrorMessage('Export failed. Make sure backend service is active.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed.version || !parsed.data) {
            throw new Error('Unsupported JSON database template schema.');
          }
          setParsedBackupData(parsed);
        } catch (err: any) {
          setErrorMessage('Invalid file contents. Select a valid unimanager_backup.json file.');
          setSelectedFile(null);
          setParsedBackupData(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerImportAction = () => {
    if (!parsedBackupData) return;
    setImportState('loading');
    importMutation.mutate(parsedBackupData);
  };

  // Sync preferences to localStorage
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('sound_enabled', String(next));
  };

  const handleTogglePush = async () => {
    const next = !pushEnabled;
    if (next && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission was blocked by the browser. Please reset site permissions to enable push warnings.');
        return;
      }
    }
    setPushEnabled(next);
    localStorage.setItem('push_enabled', String(next));
  };

  return (
    <div className="space-y-8 select-text max-w-4xl mx-auto pb-12">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-serif">Workspace Settings</h2>
        <p className="text-sm text-zinc-400 mt-1">Configure your student operating system, manage backups, and toggle alerts.</p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2 select-text">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Settings layout stack */}
      <div className="space-y-6">
          
          {/* Notification Controls */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm text-white">System Notifications & Audio</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-200 block">Desktop Push Reminders</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Trigger browser popups for upcoming exams and deadlines.</span>
                </div>
                <button
                  onClick={handleTogglePush}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 outline-none ${
                    pushEnabled ? 'bg-primary' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      pushEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-200 block">Sound alert effects</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">Play study alarms when focus sessions complete or checks occur.</span>
                </div>
                <button
                  onClick={handleToggleSound}
                  className="p-2 border border-white/5 bg-white/[0.01] hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Database Backup Importer/Exporter */}
          <GlassCard hoverEffect={false} className="border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm text-white">Workspace Backups (JSON)</h4>
            </div>

            <div className="space-y-6">
              <p className="text-[11px] text-zinc-500 leading-normal">
                UniManager allows you to download a complete backup file containing subjects, custom notes, planner logs, calendar events, and projects. You can upload this backup on any device to restore your exact workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                {/* Export Card */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center flex flex-col justify-between h-36">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Export Database</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">Download local records as a JSON file.</span>
                  </div>
                  <button
                    disabled={exportState !== 'idle'}
                    onClick={handleExportBackup}
                    className="w-full h-9 rounded-lg bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {exportState === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : exportState === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{exportState === 'loading' ? 'Exporting...' : exportState === 'success' ? 'Exported!' : 'Export JSON'}</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center flex flex-col justify-between h-36 relative">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Import Database</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">Upload a JSON backup file to overwrite local state.</span>
                  </div>
                  
                  {parsedBackupData ? (
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Confirm Restore</span>
                    </button>
                  ) : (
                    <div className="border border-dashed border-white/10 hover:border-white/20 p-2 rounded-lg text-center cursor-pointer transition-colors relative h-9 flex items-center justify-center">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-400 font-semibold truncate px-2">
                        {selectedFile ? selectedFile.name : 'Select JSON backup...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
      </div>

      {/* Warning confirmation overlay modal for imports */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative shadow-2xl border border-orange-500/20">
            <div className="flex items-center gap-2 text-orange-500 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white leading-none">Database Restore Confirmation</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6 select-text">
              Caution! Proceeding with restoring this backup file will completely clear your active course subjects, notes, planner tasks, events, and projects. 
              <br /><br />
              This action is <code className="text-orange-500 font-bold">destructive</code> and cannot be undone. Are you sure you want to overwrite your workspace?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setParsedBackupData(null);
                  setShowConfirmModal(false);
                }}
                className="flex-1 h-9 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importState === 'loading'}
                onClick={triggerImportAction}
                className="flex-1 h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {importState === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{importState === 'loading' ? 'Importing...' : 'Yes, Overwrite'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
