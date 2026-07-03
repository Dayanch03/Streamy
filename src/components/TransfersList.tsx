import React from 'react';
import { useStreamy } from '../context/StreamyContext';
import { FileTransfer } from '../types';
import { Play, X, Check, AlertCircle, RefreshCw, Trash2, ShieldCheck, Database, File, Image, Music, Video, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TransfersList: React.FC = () => {
  const { transfers, cancelTransfer, clearCompletedTransfers, t } = useStreamy();

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to format transfer speed
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to format ETA
  const formatETA = (seconds: number) => {
    if (seconds <= 0) return '...';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Helper to get file icons
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={18} className="text-secondary" />;
    if (fileType.startsWith('audio/')) return <Music size={18} className="text-success" />;
    if (fileType.startsWith('video/')) return <Video size={18} className="text-warning" />;
    return <File size={18} className="text-gray-500" />;
  };

  // Check if there are any transfers to show
  const hasTransfers = transfers.length > 0;
  const hasCompletable = transfers.some((t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed');

  return (
    <div className="w-full glass-card rounded-3xl shadow-lg p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
            {t('active_transfers')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-sans">
            {t('realtime_connection_list')}
          </p>
        </div>
        
        {hasCompletable && (
          <button
            onClick={clearCompletedTransfers}
            title={t('clear_completed')}
            className="flex items-center gap-1.5 px-3 py-1.5 glass-button-ghost text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 border rounded-lg text-xs font-mono transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            {t('clear_completed')}
          </button>
        )}
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {hasTransfers ? (
            transfers.map((transfer) => {
              const isSend = transfer.type === 'send';
              const isCompleted = transfer.status === 'completed';
              const isFailed = transfer.status === 'failed';
              const isCancelled = transfer.status === 'cancelled';
              const isPending = transfer.status === 'pending';
              const isConnecting = transfer.status === 'connecting';
              const isTransferring = transfer.status === 'transferring';

              return (
                <motion.div
                  key={transfer.id}
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Card Header Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* File Icon circle */}
                      <div className="h-10 w-10 shrink-0 bg-white/90 dark:bg-[#141622] border border-slate-200/50 dark:border-white/10 rounded-lg flex items-center justify-center shadow-sm">
                        {getFileIcon(transfer.fileType)}
                      </div>
                      
                      {/* Name and size details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-gray-300">
                            {isSend ? t('sending') : t('receiving')}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-gray-400 truncate max-w-[100px] font-sans">
                            {isSend ? `${t('to')} ${transfer.peerName}` : `${t('from')} ${transfer.peerName}`}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans mt-0.5 max-w-[180px] md:max-w-xs">
                          {transfer.fileName}
                        </h4>
                      </div>
                    </div>

                    {/* Progress Percent or Status Indicator */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                        {isPending ? t('pending') : `${transfer.progress}%`}
                      </span>

                      {/* Connection Type badge (P2P vs Server Fallback) */}
                      {!isPending && !isCompleted && !isFailed && !isCancelled && (
                        <div className={`flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          transfer.method === 'webrtc' 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {transfer.method === 'webrtc' ? <ShieldCheck size={10} /> : <Database size={10} />}
                          {transfer.method === 'webrtc' ? 'P2P WebRTC' : 'LAN Fallback'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  {!isPending && !isCompleted && !isFailed && !isCancelled && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      {/* Visual bar */}
                      <div className="w-full bg-slate-200/60 dark:bg-white/5 h-2.5 rounded-full overflow-hidden p-[1px] border border-slate-100 dark:border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${transfer.progress}%` }}
                          transition={{ duration: 0.1 }}
                          className={`h-full rounded-full ${
                            transfer.method === 'webrtc' 
                              ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400' 
                              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400'
                          }`}
                        ></motion.div>
                      </div>

                      {/* Speed, Transferred size, ETA details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-[11px] font-sans font-medium mt-0.5 px-0.5">
                        {isConnecting ? (
                          <div className="flex items-center gap-1.5 text-blue-500 dark:text-cyan-400 animate-pulse font-bold">
                            <RefreshCw size={11} className="animate-spin" />
                            {t('establishing_connection')}
                          </div>
                        ) : (
                          <>
                            {/* Left: Speed */}
                            <div className="flex items-center justify-between sm:justify-start gap-1 text-slate-700 dark:text-gray-300 font-mono w-full sm:w-auto border-b border-slate-100 dark:border-white/5 pb-1 sm:pb-0 sm:border-0">
                              <span className="text-slate-400 dark:text-gray-500 text-[10px] font-sans font-bold uppercase tracking-tight">
                                {t('speed_label')}:
                              </span>
                              <span className="font-extrabold text-blue-600 dark:text-cyan-400">
                                {formatSpeed(transfer.speed)}
                              </span>
                            </div>

                            {/* Center: Fraction of transferred bytes */}
                            <div className="text-slate-500 dark:text-gray-400 font-mono text-[10px] tracking-tight w-full sm:w-auto flex justify-between sm:justify-start gap-1 border-b border-slate-100 dark:border-white/5 pb-1 sm:pb-0 sm:border-0">
                              <span className="text-slate-400 dark:text-gray-500 text-[10px] font-sans font-bold uppercase tracking-tight sm:hidden">
                                {t('receiving') === 'RECEIVING' ? 'Progress' : 'Передано'}:
                              </span>
                              <span>
                                {formatBytes(Math.round((transfer.progress / 100) * transfer.fileSize))}
                                <span className="text-slate-300 dark:text-gray-600 px-0.5">/</span>
                                {formatBytes(transfer.fileSize)}
                              </span>
                            </div>

                            {/* Right: ETA with Clock */}
                            <div className="flex items-center justify-between sm:justify-end gap-1 text-slate-700 dark:text-gray-300 font-mono w-full sm:w-auto">
                              <span className="text-slate-400 dark:text-gray-500 text-[10px] font-sans font-bold uppercase tracking-tight sm:hidden flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                {t('remaining_label') === 'remaining' ? 'Time' : 'Осталось'}:
                              </span>
                              <span className="font-bold flex items-center gap-1">
                                <Clock size={11} className="text-slate-400 dark:text-gray-500 shrink-0 hidden sm:inline" />
                                {transfer.eta > 0 ? (
                                  <span>
                                    {formatETA(transfer.eta)} <span className="text-slate-400 dark:text-gray-500 font-sans text-[10px] font-normal sm:inline hidden">{t('remaining_label')}</span>
                                  </span>
                                ) : (
                                  <span>--</span>
                                )}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completed State Display */}
                  {isCompleted && (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-sans font-bold">
                      <Check size={14} className="shrink-0" />
                      <span>{t('transfer_completed')} • {formatBytes(transfer.fileSize)}</span>
                    </div>
                  )}

                  {/* Cancelled/Failed States */}
                  {(isCancelled || isFailed) && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-sans font-bold">
                      <AlertCircle size={14} className="shrink-0" />
                      <span className="truncate">
                        {transfer.error ? (
                          transfer.error === 'Interrupted by page reload' ? t('interrupted_by_reload') : transfer.error
                        ) : (
                          isCancelled ? t('cancelled_by_peer') : t('connection_lost')
                        )}
                      </span>
                    </div>
                  )}

                  {/* Cancel Button */}
                  {!isCompleted && !isFailed && !isCancelled && (
                    <button
                      onClick={() => cancelTransfer(transfer.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors cursor-pointer"
                      title={t('cancel')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-gray-500 font-sans">
              <div className="h-10 w-10 rounded-full border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center mb-2">
                <RefreshCw size={16} className="text-slate-300 dark:text-gray-700" />
              </div>
              <p className="text-xs font-bold">{t('no_active_transfers')}</p>
              <p className="text-[10px] mt-0.5">{t('select_device_radar_hint')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
