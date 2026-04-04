import React from 'react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-transparent">
            {/* Left Section - Graphic/Landing Visual (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between bg-white/5 dark:bg-slate-950/20 backdrop-blur-md border-r border-white/10 p-12 relative overflow-hidden">
                {/* Overlay Logo Top Left */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" />
                        </svg>
                    </div>
                    <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        Brioright
                    </span>
                </div>

                {/* Abstract Text & Illustration */}
                <div className="relative z-10 flex flex-col mt-auto mb-20 max-w-sm">
                    <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                        <span className="hero-gradient-text italic font-serif font-light">From scattered</span><br/>
                        to sorted.
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        Your team's tasks, chat, time & files. <br/>Finally connected in one workspace.
                    </p>

                    <div className="mt-10 p-6 glass-premium rounded-3xl border-white/20 shadow-ultra group hover:scale-[1.02] transition-all duration-500">
                        <div className="flex items-center gap-5">
                             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl font-bold">✓</div>
                             <div>
                                 <div className="text-base font-bold text-slate-900 dark:text-white">Workspace ready</div>
                                 <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Setup takes just 2 minutes</div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Background Decor - Restored & Improved */}
                <div className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute top-20 -right-20 w-[24rem] h-[24rem] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            {/* Right Section - Form Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white/40 dark:bg-slate-950/40 backdrop-blur-[60px]">
                {/* Mobile Logo Only */}
                <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Brioright
                    </span>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm mt-16 lg:mt-0"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
