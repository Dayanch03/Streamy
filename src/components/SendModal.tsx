import React, { useState, useRef } from 'react';
import { User } from '../types';
import { useStreamy } from '../context/StreamyContext';
import { X, Upload, File as FileIcon, Image, Music, Video, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SendModalProps {
  user: User | null;
  onClose: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({ user, onClose }) => {
  const { sendRequest, t } = useStreamy();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleSend = () => {
    if (!selectedFile) return;
    sendRequest(user.id, selectedFile);
    onClose();
  };

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to get file icons
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={32} className="text-secondary" />;
    if (fileType.startsWith('audio/')) return <Music size={32} className="text-success" />;
    if (fileType.startsWith('video/')) return <Video size={32} className="text-warning" />;
    return <FileIcon size={32} className="text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md glass-card rounded-3xl overflow-hidden shadow-2xl relative border border-slate-200/50 dark:border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{user.avatar}</span>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                {t('send_files_to', { username: user.username })}
              </h3>
              <p className="text-[10px] font-mono text-blue-500 dark:text-cyan-400 uppercase tracking-wider">
                {t('direct_p2p_link')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleSelectClick}
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                : 'border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-cyan-400 hover:bg-slate-100/30 dark:hover:bg-white/5'
            }`}
          >
            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-gray-500 mb-3 border border-slate-200/50 dark:border-white/10">
              <Upload size={20} className={isDragActive ? 'animate-bounce text-blue-500' : ''} />
            </div>
            
            <p className="text-sm font-sans font-bold text-slate-900 dark:text-white mb-1">
              {t('drag_drop_file')}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {t('browse_local_files')}
            </p>
          </div>

          {/* Selected File Details */}
          <AnimatePresence mode="wait">
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-100/30 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-white/10 flex items-center gap-4"
              >
                <div className="h-14 w-14 bg-white dark:bg-[#141622] border border-slate-200/50 dark:border-white/10 rounded-lg flex items-center justify-center shadow-sm">
                  {getFileIcon(selectedFile.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate font-sans">
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      {formatBytes(selectedFile.size)}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-gray-400 px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-white/10">
                      {selectedFile.name.split('.').pop() || 'File'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LAN Connection Status Advice */}
          <div className="flex gap-2 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-sans">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              {t('webrtc_speed_eta_advice')}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
          <button
            onClick={onClose}
            className="flex-1 glass-button-ghost py-3 rounded-xl font-sans font-bold text-sm cursor-pointer transition-colors text-slate-700 dark:text-gray-300"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedFile}
            className={`flex-1 py-3 px-4 rounded-xl font-sans font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all duration-200 ${
              selectedFile
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-600 cursor-not-allowed shadow-none'
            }`}
          >
            <Sparkles size={16} />
            {t('send')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
