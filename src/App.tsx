import React, { useState } from 'react';
import { StreamyProvider, useStreamy } from './context/StreamyContext';
import { RegistrationScreen } from './components/RegistrationScreen';
import { CircularRadar } from './components/CircularRadar';
import { SendModal } from './components/SendModal';
import { TransfersList } from './components/TransfersList';
import { SettingsModal } from './components/SettingsModal';
import { User, FileTransfer } from './types';
import { Settings, Share2, Check, X, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedLogo } from './components/AnimatedLogo';
import { Language } from './utils/i18n';

function AppContent() {
  const { 
    currentUser, 
    onlineUsers, 
    transfers, 
    serverInfo, 
    isConnected,
    language,
    setLanguage,
    t,
    acceptRequest,
    declineRequest
  } = useStreamy();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Filter out any incoming transfer requests that are in 'pending' status
  const pendingIncomingRequests = transfers.filter(
    (t) => t.type === 'receive' && t.status === 'pending'
  );

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // If the user has not registered yet, display the register/intro screen
  if (!currentUser) {
    return <RegistrationScreen />;
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#0A0C14] text-slate-800 dark:text-white transition-colors duration-300 font-sans pb-12 flex flex-col overflow-hidden">
      
      {/* Floating glowing background blur balls */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute top-[40%] left-[30%] w-[25%] h-[25%] rounded-full bg-cyan-400/5 dark:bg-cyan-400/10 blur-[85px]"></div>
      </div>

      {/* Top status bar */}
      <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 relative z-20"></div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/40 dark:bg-[#0A0C14]/40 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 px-4 sm:px-6 py-4 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Network Status */}
          <div className="flex items-center gap-3">
            <AnimatedLogo size={42} />
            <div>
              <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Streamy
              </h1>
              {/* Dynamic Connection Status badge */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-ping' : 'bg-warning animate-pulse'}`}></span>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400">
                  {isConnected ? 'ONLINE • LAN GATEWAY' : t('establishing_connection')}
                </span>
              </div>
            </div>
          </div>

          {/* User profile capsule & settings */}
          <div className="flex items-center gap-1.5 min-[380px]:gap-2">
            {/* Sleek inline language switcher */}
            <div className="flex items-center bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl p-0.5 shadow-sm text-xs mr-1 min-[380px]:mr-2">
              {(['ru', 'tk', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-1.5 min-[380px]:px-2.5 py-1 min-[380px]:py-1.5 rounded-lg font-display font-bold transition-all cursor-pointer ${
                    language === lang
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 min-[380px]:gap-2 px-2 min-[380px]:px-3.5 py-1.5 min-[380px]:py-2 glass-button-ghost rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm group font-medium"
            >
              <span className="text-xl shrink-0">{currentUser.avatar}</span>
              <span className="text-xs font-sans font-bold text-slate-700 dark:text-white hidden sm:inline max-w-[100px] truncate">
                {currentUser.username}
              </span>
              <Settings size={14} className="text-slate-400 dark:text-gray-400 group-hover:rotate-45 transition-transform duration-300 ml-0.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Column: Visual Radar scanner (takes 5 columns on desktop) */}
        <section className="lg:col-span-5 flex flex-col items-center glass-card p-6 rounded-3xl shadow-lg">
          <div className="text-center mb-6">
            <h2 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
              {t('device_discovery_radar')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              {t('devices_same_wifi_radar_sub')}
            </p>
          </div>

          <CircularRadar onSelectUser={(user) => setSelectedUser(user)} />
        </section>

        {/* Right Column: Connection Info & Transfer Progress list (takes 7 columns) */}
        <section className="lg:col-span-7 space-y-8">
          
          {/* Quick LAN sharing instruction card */}
          <div className="glass-card p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 bg-gradient-to-tr from-blue-500 to-cyan-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Share2 size={28} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-display font-extrabold text-sm text-slate-900 dark:text-white mb-1">
                {t('how_to_transfer')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                {t('how_to_transfer_instructions')}
              </p>
              
              {/* URL Display card */}
              <div className="mt-3 flex items-center justify-center md:justify-start gap-2">
                <span className="text-[11px] font-mono font-bold glass-input px-3 py-1.5 rounded-lg border text-indigo-600 dark:text-indigo-300 select-all shadow-sm">
                  {serverInfo?.url || window.location.origin}
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-[10px] font-sans font-bold text-blue-500 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t('show_qr_code')}
                </button>
              </div>
            </div>
          </div>

          {/* Transfers tracking list */}
          <TransfersList />

        </section>

      </main>

      {/* Modals & Dialogs overlays (rendered conditionally) */}
      <AnimatePresence>
        
        {/* File Send Selector Modal */}
        {selectedUser && (
          <SendModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}

        {/* Settings, custom name, theme change, and QR generator modal */}
        {isSettingsOpen && (
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
          />
        )}

        {/* Incoming Transfer Request Drawer Alert */}
        {pendingIncomingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-none"
          >
            {/* Take first pending transfer request */}
            {(() => {
              const req = pendingIncomingRequests[0];
              return (
                <div className="w-full max-w-md glass-card backdrop-blur-2xl shadow-2xl rounded-3xl p-5 flex flex-col gap-4 pointer-events-auto border border-white/20 dark:border-white/10">
                  <div className="flex items-start gap-4">
                    {/* Sender profile bubble */}
                    <div className="h-12 w-12 bg-white/20 dark:bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-3xl shrink-0">
                      {req.peerAvatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-blue-500 dark:text-cyan-400 block uppercase mb-1">
                        {t('incoming_file_request')}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {req.peerName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate font-sans">
                        {t('wants_to_send', { fileName: req.fileName, fileSize: formatBytes(req.fileSize) })}
                      </p>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex gap-2.5 mt-1">
                    <button
                      onClick={() => declineRequest(req.id)}
                      className="flex-1 bg-white/50 hover:bg-red-500/10 hover:text-red-600 dark:bg-white/5 dark:hover:bg-red-500/15 dark:text-gray-300 dark:hover:text-red-400 border border-slate-200 dark:border-white/10 py-2.5 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <X size={14} />
                      {t('decline')}
                    </button>
                    <button
                      onClick={() => acceptRequest(req.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 py-2.5 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20 transition-all"
                    >
                      <Check size={14} />
                      {t('accept_file')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Network offline reminder when server gets disconnected */}
      {!isConnected && (
        <div className="fixed bottom-6 left-6 z-40 bg-amber-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-sans font-bold animate-bounce border border-amber-400">
          <WifiOff size={14} className="shrink-0" />
          {t('offline_reconnecting')}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StreamyProvider>
      <AppContent />
    </StreamyProvider>
  );
}
