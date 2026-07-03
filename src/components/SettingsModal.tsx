import React, { useState, useEffect, useRef } from 'react';
import { useStreamy } from '../context/StreamyContext';
import { X, Copy, Check, Moon, Sun, Monitor, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';
import { Language } from '../utils/i18n';

interface SettingsModalProps {
  onClose: () => void;
}

const AVATARS = [
  '🦊', '🦁', '🐯', '🐼', '🐨', '🐧', '🦉', '🦄', '🚀', '🛸', '💻', '📱',
  '🐋', '🐝', '🦖', '🐉', '🎨', '🍕', '🍩', '🥑', '🎯', '🎸', '🎮', '🔋'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { 
    currentUser, 
    serverInfo, 
    theme, 
    toggleTheme, 
    updateProfile,
    language,
    setLanguage,
    t
  } = useStreamy();
  const [username, setUsername] = useState(currentUser?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '🦊');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derive the local network share URL
  const shareUrl = serverInfo?.url || window.location.href;

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
      setSelectedAvatar(currentUser.avatar);
    }
  }, [currentUser]);

  // Generate Offline QR Code when shareUrl or theme changes
  useEffect(() => {
    if (canvasRef.current && shareUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        shareUrl,
        {
          width: 160,
          margin: 1,
          color: {
            dark: theme === 'dark' ? '#FFFFFF' : '#0C0C09',
            light: theme === 'dark' ? '#1E1E1C' : '#F4F4F1'
          }
        },
        (error) => {
          if (error) console.error('[Streamy] QR Code render error:', error);
        }
      );
    }
  }, [shareUrl, theme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!username.trim()) return;
    updateProfile(username.trim(), selectedAvatar);
    onClose();
  };

  // Human-crafted translation variables for switch theme buttons
  const getThemeSwitchLabel = () => {
    const isLight = theme === 'light';
    if (language === 'ru') {
      return t('switch_to', { mode: isLight ? 'тёмную' : 'светлую' });
    } else if (language === 'tk') {
      return t('switch_to', { mode: isLight ? 'garaňky' : 'ýagty' });
    }
    return t('switch_to', { mode: isLight ? 'Dark' : 'Light' });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-lg glass-card rounded-3xl overflow-hidden shadow-2xl relative border border-slate-200/50 dark:border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-blue-500 dark:text-cyan-400" />
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
              {t('profile_lan_sharing')}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Profile settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400">
              {t('profile_settings')}
            </h4>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-2 font-sans font-medium">
                {t('select_avatar_label')}
              </label>
              <div className="grid grid-cols-8 gap-1.5 p-2 glass-input rounded-xl">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`text-xl p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                      selectedAvatar === avatar 
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm' 
                        : 'hover:bg-slate-200/50 dark:hover:bg-white/10'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname input */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-2 font-sans font-medium">
                {t('my_nickname_label')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="w-full glass-input text-slate-955 dark:text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-sans font-medium text-sm"
              />
            </div>

            {/* Language Selection inside settings */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-2 font-sans font-medium">
                {t('language_label')}
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-1 rounded-xl">
                {(['ru', 'tk', 'en'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-2 rounded-lg font-display font-bold text-xs transition-all cursor-pointer ${
                      language === lang
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'ru' ? t('language_ru') : lang === 'tk' ? t('language_tk') : t('language_en')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400">
              {t('design_theme_label')}
            </h4>
            <div className="flex items-center justify-between bg-slate-100/30 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-white/10">
              <span className="text-xs font-sans text-slate-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                {theme === 'light' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-400" />}
                {theme === 'light' ? t('light_mode_active') : t('dark_mode_active')}
              </span>
              <button
                onClick={toggleTheme}
                className="px-4 py-2 glass-button-ghost text-slate-700 dark:text-white rounded-lg text-xs font-sans font-bold transition-all duration-200 cursor-pointer"
              >
                {getThemeSwitchLabel()}
              </button>
            </div>
          </div>

          {/* Local network info */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400">
              {t('connect_other_devices')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              
              {/* QR Code Canvas */}
              <div className="flex flex-col items-center justify-center bg-slate-100/30 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-white/10 h-[210px]">
                <canvas ref={canvasRef} className="rounded-lg shadow-sm bg-white dark:bg-[#141622]" />
                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 mt-2 text-center">
                  {t('scan_to_join')}
                </span>
              </div>

              {/* Direct Link and instructions */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono font-bold block uppercase">
                    {t('direct_connection_link')}
                  </span>
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 glass-input text-slate-600 dark:text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white active:scale-95 rounded-lg transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-cyan-400 text-xs font-sans">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {t('lan_warning_details')}
                  </p>
                </div>
              </div>

            </div>
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/5">
          <button
            onClick={onClose}
            className="px-6 py-2.5 glass-button-ghost text-slate-700 dark:text-gray-300 rounded-xl font-sans font-bold text-xs cursor-pointer transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-sans font-bold text-xs cursor-pointer shadow-md shadow-blue-500/20 transition-all"
          >
            {t('save_changes')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
