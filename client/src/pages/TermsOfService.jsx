import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Back link */}
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Brioright
                </Link>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-10">
                    {/* Header */}
                    <div className="mb-10 pb-8 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" />
                                </svg>
                            </div>
                            <span className="font-bold text-xl text-gray-900 dark:text-white">Brioright</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Last updated: March 1, 2026</p>
                    </div>

                    <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
                            <p>By creating an account or using Brioright ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
                            <p>Brioright is a project management and team collaboration platform that provides workspaces, task management, time tracking, messaging, and file management tools for individuals and teams.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. User Accounts</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>You must provide accurate and complete information when creating an account.</li>
                                <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                                <li>You must be at least 16 years old to use the Service.</li>
                                <li>You may not share your account with others or create accounts on behalf of others without permission.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Acceptable Use</h2>
                            <p>You agree not to use the Service to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Violate any laws or regulations</li>
                                <li>Upload malicious code or content</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Attempt to gain unauthorized access to any systems</li>
                                <li>Scrape, crawl, or extract data without permission</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Your Content</h2>
                            <p>You retain ownership of all content you create or upload ("User Content"). By using the Service, you grant Brioright a limited license to store and display your User Content solely to provide the Service. We do not sell or share your data with third parties for advertising.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Intellectual Property</h2>
                            <p>Brioright and its original content, features, and functionality are owned by Brioright and protected by applicable intellectual property laws. You may not copy, modify, or redistribute any part of the Service without prior written consent.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Termination</h2>
                            <p>We may suspend or terminate your account at our discretion if you violate these Terms. You may delete your account at any time from your account settings. Upon termination, your right to use the Service ceases immediately.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Disclaimer of Warranties</h2>
                            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free access to the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Limitation of Liability</h2>
                            <p>To the fullest extent permitted by law, Brioright shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Changes to Terms</h2>
                            <p>We reserve the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">11. Contact</h2>
                            <p>For questions about these Terms, contact us at <a href="mailto:info@brioright.online" className="text-indigo-600 hover:underline">info@brioright.online</a>.</p>
                        </section>
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
                        <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
                        <Link to="/register" className="text-indigo-600 hover:underline">Create an account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
