import React, { useState } from 'react';
import { useStreamy } from '../context/StreamyContext';
import { Shuffle, ArrowRight, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedLogo } from './AnimatedLogo';
import { Language } from '../utils/i18n';

const RANDOM_ADJECTIVES = [
  'Volt', 'Pixel', 'Neon', 'Quantum', 'Slick', 'Cyber', 'Aero', 'Lunar', 
  'Solar', 'Turbo', 'Cosmic', 'Astro', 'Digital', 'Hyper', 'Sonic', 'Crypto'
];

const RANDOM_ANIMALS = [
  'Panda', 'Cheetah', 'Owl', 'Lion', 'Falcon', 'Dolphin', 'Fox', 'Koala', 
  'Bear', 'Tiger', 'Eagle', 'Orca', 'Wolf', 'Leopard', 'Hawk', 'Rabbit'
];

const AVATARS = [
  '🦊', '🦁', '🐯', '🐼', '🐨', '🐧', '🦉', '🦄', '🚀', '🛸', '💻', '📱',
  '🐋', '🐝', '🦖', '🐉', '🎨', '🍕', '🍩', '🥑', '🎯', '🎸', '🎮', '🔋'
];

export const RegistrationScreen: React.FC = () => {
  const { registerUser, language, setLanguage, t } = useStreamy();
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');

  const handleRandomize = () => {
    const adj = RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
    const anim = RANDOM_ANIMALS[Math.floor(Math.random() * RANDOM_ANIMALS.length)];
    setUsername(`${adj} ${anim}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    registerUser(username.trim(), selectedAvatar);
  };

  // Set initial random name on render
  React.useEffect(() => {
    handleRandomize();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#0A0C14] flex flex-col items-center justify-center p-6 text-slate-800 dark:text-white transition-colors duration-300 overflow-hidden">
      
      {/* Floating glowing background blur balls */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[5%] w-[50%] h-[50%] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '9s' }}></div>
        <div className="absolute bottom-[5%] right-[5%] w-[40%] h-[40%] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '11s' }}></div>
      </div>

      {/* Wave Logo Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 relative z-20"></div>

      {/* Language Quick Selector in top right corner */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-1 bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 p-1 rounded-2xl shadow-lg">
        <Globe size={14} className="text-slate-400 dark:text-gray-400 ml-2 mr-1" />
        {(['ru', 'tk', 'en'] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1.5 rounded-xl font-display font-semibold text-xs transition-all cursor-pointer ${
              language === lang
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            {lang === 'ru' ? 'RU' : lang === 'tk' ? 'TK' : 'EN'}
          </button>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md glass-card p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <AnimatedLogo size={70} />
          <h1 className="text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white mt-4">
            Streamy
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 text-center max-w-xs font-sans">
            {t('webrtc_speed_eta_advice')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-display font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400 mb-3">
              {t('choose_avatar')}
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 glass-input rounded-xl">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-2xl p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                    selectedAvatar === avatar 
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' 
                      : 'hover:bg-slate-200/50 dark:hover:bg-white/10'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname Field */}
          <div>
            <label className="block text-xs font-display font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400 mb-3">
              {t('nickname')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('enter_nickname')}
                maxLength={20}
                required
                className="flex-1 glass-input text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-sans font-medium text-base"
              />
              <button
                type="button"
                onClick={handleRandomize}
                title={t('randomize')}
                className="px-4 glass-button-ghost text-slate-700 dark:text-gray-300 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                <Shuffle size={18} />
              </button>
            </div>
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            className="w-full mt-4 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white active:scale-98 py-4 px-6 rounded-xl font-display font-bold tracking-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 transition-all duration-200"
          >
            {t('connect_to_network')}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-gray-500 font-mono">
          <span className="h-2 w-2 rounded-full bg-success animate-ping"></span>
          {t('no_internet_required')}
        </div>
      </motion.div>
    </div>
  );
};
