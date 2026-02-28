import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Last updated: March 1, 2026</p>
                    </div>

                    <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Introduction</h2>
                            <p>Brioright ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our Service at <strong>brioright.online</strong>.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Information We Collect</h2>
                            <p className="mb-3"><strong className="text-gray-900 dark:text-white">Information you provide:</strong></p>
                            <ul className="list-disc pl-5 space-y-1 mb-4">
                                <li>Name, email address, and password on registration</li>
                                <li>Profile photo (optional)</li>
                                <li>Workspace names, project data, tasks, messages, and time entries you create</li>
                                <li>Files and attachments you upload</li>
                            </ul>
                            <p className="mb-3"><strong className="text-gray-900 dark:text-white">Information collected automatically:</strong></p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>IP address and browser type for security purposes</li>
                                <li>Session cookies for authentication</li>
                                <li>Server access logs (retained for 30 days)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. How We Use Your Information</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>To provide, operate, and improve the Service</li>
                                <li>To authenticate your identity and maintain your session</li>
                                <li>To send transactional emails (welcome, password reset, invitations)</li>
                                <li>To send notification digests you have subscribed to</li>
                                <li>To diagnose bugs and improve performance</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Data Sharing</h2>
                            <p>We do <strong>not</strong> sell your personal data. We share data only with:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li><strong className="text-gray-900 dark:text-white">Resend</strong> — transactional email delivery</li>
                                <li><strong className="text-gray-900 dark:text-white">Cloudflare R2</strong> — file storage for uploads</li>
                                <li><strong className="text-gray-900 dark:text-white">Google OAuth</strong> — if you choose to sign in with Google</li>
                            </ul>
                            <p className="mt-3">All third-party services are bound by their own privacy policies and are used solely to provide the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Cookies</h2>
                            <p>We use HTTP-only cookies solely for session authentication (access token and refresh token). We do not use analytics cookies or advertising trackers. You can clear cookies through your browser settings, which will log you out of the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Data Retention</h2>
                            <p>Your data is retained as long as your account is active. When you delete your account, your personal data is permanently deleted within 30 days. Workspace data shared with other members may be retained until the workspace is deleted by the owner.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Data Security</h2>
                            <p>We implement industry-standard security measures including HTTPS encryption, hashed passwords (bcrypt), and HTTP-only secure cookies. However, no method of transmission over the internet is 100% secure.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Your Rights</h2>
                            <p>Depending on your location, you may have the right to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Access the personal data we hold about you</li>
                                <li>Request correction of inaccurate data</li>
                                <li>Request deletion of your account and data</li>
                                <li>Export your data</li>
                            </ul>
                            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:info@brioright.online" className="text-indigo-600 hover:underline">info@brioright.online</a>.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Children's Privacy</h2>
                            <p>The Service is not directed to children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us personal information, please contact us.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Changes to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">11. Contact Us</h2>
                            <p>For privacy-related questions or requests, contact us at:<br />
                                <a href="mailto:info@brioright.online" className="text-indigo-600 hover:underline">info@brioright.online</a>
                            </p>
                        </section>
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
                        <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
                        <Link to="/register" className="text-indigo-600 hover:underline">Create an account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
