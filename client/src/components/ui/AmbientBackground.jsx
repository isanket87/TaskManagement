import React from 'react';
import { motion } from 'framer-motion';

const AmbientBackground = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-slate-50 dark:bg-[#020617] transition-colors duration-700">
            {/* Top Right Blob */}
            <motion.div 
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-[120px]"
            />

            {/* Bottom Left Blob */}
            <motion.div 
                animate={{
                    x: [0, -80, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute -bottom-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-100/30 dark:bg-emerald-500/10 blur-[140px]"
            />

            {/* Center Floating Accent */}
            <motion.div 
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.8, 1.1, 0.8],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-1/4 left-1/3 w-[40%] h-[40%] rounded-full bg-violet-100/20 dark:bg-violet-500/10 blur-[100px]"
            />

            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
            />
        </div>
    );
};

export default AmbientBackground;
