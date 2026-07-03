import React, { useMemo } from 'react';
import { User } from '../types';
import { useStreamy } from '../context/StreamyContext';
import { Laptop, Phone, Radio } from 'lucide-react';
import { motion } from 'motion/react';

interface CircularRadarProps {
  onSelectUser: (user: User) => void;
}

export const CircularRadar: React.FC<CircularRadarProps> = ({ onSelectUser }) => {
  const { currentUser, onlineUsers, t } = useStreamy();

  // Distribute active peers evenly in a circle around the center
  const plottedUsers = useMemo(() => {
    return onlineUsers.map((user, index) => {
      // Calculate coordinates on a circle
      const total = onlineUsers.length;
      const angle = (index * (2 * Math.PI)) / total - Math.PI / 2; // Offset by -90deg to start from top
      
      // Determine radius/distance: stagger them across different rings
      const ringIndex = (index % 3) + 1; // Rings 1, 2, or 3
      const radiusPercent = ringIndex === 1 ? 25 : ringIndex === 2 ? 50 : 75; // percentage from center
      
      const x = 50 + Math.cos(angle) * (radiusPercent * 0.45); // Limit coordinates to 5%-95% area
      const y = 50 + Math.sin(angle) * (radiusPercent * 0.45);

      return {
        ...user,
        x,
        y,
        ringIndex
      };
    });
  }, [onlineUsers]);

  if (!currentUser) return null;

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Visual Radar Container */}
      <div className="relative w-full aspect-square max-w-[340px] md:max-w-[400px] flex items-center justify-center rounded-full glass-card overflow-hidden shadow-inner p-4">
        
        {/* Pulsing radiating waves */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-full h-full rounded-full border border-dashed border-slate-200/40 dark:border-white/5 scale-100"></div>
          <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-slate-200/40 dark:border-white/5"></div>
          <div className="absolute w-[50%] h-[50%] rounded-full border border-dashed border-slate-200/40 dark:border-white/5"></div>
          <div className="absolute w-[20%] h-[20%] rounded-full border border-dashed border-slate-200/40 dark:border-white/5"></div>
          
          {/* Scanning Sweep Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-transparent animate-spin duration-[4000ms] rounded-full"></div>
        </div>

        {/* Center Node (Current User) */}
        <div className="absolute z-10 flex flex-col items-center">
          <motion.div 
            animate={{ 
              boxShadow: [
                '0 0 0 0px rgba(59, 130, 246, 0.3)', 
                '0 0 0 15px rgba(59, 130, 246, 0.15)', 
                '0 0 0 30px rgba(59, 130, 246, 0)'
              ] 
            }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 border-4 border-white dark:border-[#0A0C14] shadow-xl flex items-center justify-center text-3xl md:text-4xl"
          >
            {currentUser.avatar}
          </motion.div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-gray-400 mt-2 bg-white/90 dark:bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm border border-slate-200/50 dark:border-white/15">
            {t('current_user_badge')}
          </span>
        </div>

        {/* Discovery Nodes (Other Online Users) */}
        {plottedUsers.map((user) => (
          <motion.button
            key={user.id}
            onClick={() => onSelectUser(user)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.15 }}
            style={{ left: `${user.x}%`, top: `${user.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
          >
            {/* User Avatar Circle */}
            <div className="relative h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/90 dark:bg-slate-900/95 border-2 border-blue-500 hover:border-cyan-400 shadow-md flex items-center justify-center text-2xl transition-all duration-200">
              {user.avatar}
              
              {/* Pulsing indicator */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
              </span>

              {/* Device Category Badge */}
              <span className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-blue-500 to-cyan-400 text-white p-1 rounded-full text-[9px] shadow-sm">
                {user.deviceType === 'desktop' ? <Laptop size={10} /> : <Phone size={10} />}
              </span>
            </div>

            {/* User Name Tooltip */}
            <div className="mt-1 flex flex-col items-center">
              <span className="text-xs font-sans font-bold text-slate-800 dark:text-white bg-white/95 dark:bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/10 shadow-sm max-w-[100px] truncate">
                {user.username}
              </span>
            </div>
          </motion.button>
        ))}

        {/* Floating pulse waves for "no peers" state */}
        {onlineUsers.length === 0 && (
          <div className="absolute bottom-8 flex flex-col items-center text-center pointer-events-none px-4">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-gray-500">
              <Radio size={14} className="animate-pulse text-blue-500 dark:text-cyan-400" />
              {t('scanning_devices')}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
              {t('devices_same_network_hint')}
            </span>
          </div>
        )}
      </div>

      {/* Discover Count banner */}
      <div className="mt-4 text-center">
        {onlineUsers.length > 0 ? (
          <div className="text-sm font-sans text-slate-600 dark:text-gray-400 flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success animate-pulse"></span>
            {t('found_devices_count', { count: onlineUsers.length })}
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500 dark:text-gray-500 bg-slate-100/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-white/10">
            {t('waiting_for_devices')}
          </div>
        )}
      </div>
    </div>
  );
};
