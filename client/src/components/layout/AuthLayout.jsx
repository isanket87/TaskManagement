import React from 'react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Left Section - Graphic/Landing Visual (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between bg-primary-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-12 relative overflow-hidden">
                {/* Overlay Logo Top Left */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="#F7F4EF" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Brioright
                    </span>
                </div>

                {/* Abstract Text & Illustration */}
                <div className="relative z-10 flex flex-col mt-auto mb-20 max-w-md">
                    <h2 className="text-4xl font-serif text-gray-900 dark:text-gray-100 italic mb-4 leading-tight">
                        From scattered to sorted — in one workspace.
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Your team's tasks, chat, time & files. Finally connected.
                    </p>

                    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl shadow-primary-900/5 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">✓</div>
                             <div>
                                 <div className="text-sm font-medium text-gray-900 dark:text-white">Workspace ready</div>
                                 <div className="text-xs text-gray-500 dark:text-gray-400">Setup takes just 2 minutes</div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] bg-orange-200/40 dark:bg-orange-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />
                <div className="absolute top-20 -right-20 w-[24rem] h-[24rem] bg-amber-200/40 dark:bg-amber-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70" />
            </div>

            {/* Right Section - Form Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-gray-950">
                {/* Mobile Logo Only */}
                <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="#F7F4EF" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Brioright
                    </span>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md mt-16 lg:mt-0"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
