import React from 'react';
import { motion } from 'motion/react';

export const AnimatedLogo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <div 
      className="relative flex items-center justify-center select-none" 
      style={{ width: size, height: size }}
    >
      {/* Glow aura */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 blur-md"
      />

      {/* Main Container */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 rounded-xl flex items-center justify-center overflow-hidden border border-white/20 shadow-lg shadow-blue-500/20">
        
        {/* Decorative background grid of lines */}
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M 6 0 L 0 0 0 6" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Orbit Rings and waves */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full p-1.5 relative z-10 text-white"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Inner orbit ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ originX: '50px', originY: '50px' }}
          />

          {/* Outer orbit ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="32"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="16 12 8 12"
            animate={{ rotate: -360 }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ originX: '50px', originY: '50px' }}
          />

          {/* Pulse Signal Waves emanating from the center */}
          <motion.circle
            cx="50"
            cy="50"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            animate={{
              r: [10, 42],
              opacity: [1, 0],
              strokeWidth: [2.5, 0.5]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />

          <motion.circle
            cx="50"
            cy="50"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            animate={{
              r: [10, 42],
              opacity: [1, 0],
              strokeWidth: [2.5, 0.5]
            }}
            transition={{
              duration: 2.2,
              delay: 1.1,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />

          {/* Center core glowing node */}
          <motion.circle
            cx="50"
            cy="50"
            r="7"
            fill="currentColor"
            animate={{
              scale: [0.9, 1.25, 0.9],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* A small orbiting satellite element */}
          <motion.circle
            cx="50"
            cy="18"
            r="3.5"
            fill="currentColor"
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ originX: '50px', originY: '50px' }}
          />
        </svg>
      </div>
    </div>
  );
};
