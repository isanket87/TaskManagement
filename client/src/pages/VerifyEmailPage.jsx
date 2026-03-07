import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import useAuthStore from '../store/authStore';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    const { user, fetchMe, resendVerificationEmail } = useAuthStore();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found. Please use the link from your email.');
            return;
        }

        authService.verifyEmail(token)
            .then((res) => {
                setStatus('success');
                setMessage(res.data.message || 'Email verified successfully!');
                fetchMe(); // Refresh user state so the banner disappears instantly
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
            });
    }, [token]);

    const handleResend = async () => {
        setResendLoading(true);
        setResendMessage('');
        if (!user) {
            setResendLoading(false);
            setResendMessage('⚠️ Please log in first, then use the "Resend email" button in the app.');
            return;
        }
        if (user.emailVerified) {
            setResendLoading(false);
            setResendMessage('✅ Your email is already verified!');
            return;
        }
        const result = await resendVerificationEmail();
        setResendLoading(false);
        setResendMessage(result.success
            ? '✅ New verification email sent! Check your inbox for the latest link.'
            : `❌ ${result.error}`);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(79,70,229,0.10)',
                padding: '48px 40px',
                maxWidth: '460px',
                width: '100%',
                textAlign: 'center',
            }}>
                {/* Icon */}
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                    {status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}
                </div>

                {/* Title */}
                <h1 style={{ margin: '0 0 12px', color: '#1f2937', fontSize: '22px', fontWeight: 700 }}>
                    {status === 'loading' && 'Verifying your email…'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Failed'}
                </h1>

                {/* Loading spinner */}
                {status === 'loading' && (
                    <div style={{
                        width: '32px', height: '32px',
                        border: '4px solid #e0e7ff',
                        borderTopColor: '#4f46e5',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '16px auto',
                    }} />
                )}

                {/* Message */}
                {status !== 'loading' && (
                    <p style={{ color: '#6b7280', fontSize: '15px', margin: '0 0 12px', lineHeight: 1.6 }}>
                        {message}
                    </p>
                )}

                {/* Error hint about old links */}
                {status === 'error' && (
                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.5 }}>
                        💡 <strong>Tip:</strong> Only the <strong>most recent</strong> verification link works.
                        Old links are invalidated when a new one is sent.
                    </p>
                )}

                {/* Success CTA */}
                {status === 'success' && (
                    <Link to="/workspaces" style={{
                        display: 'inline-block',
                        backgroundColor: '#4f46e5',
                        color: '#fff',
                        padding: '12px 28px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '15px',
                        marginBottom: '16px',
                    }}>
                        Go to Dashboard →
                    </Link>
                )}

                {/* Error CTAs */}
                {status === 'error' && (
                    <div>
                        <button
                            id="resend-verification-btn"
                            onClick={handleResend}
                            disabled={resendLoading}
                            style={{
                                backgroundColor: '#4f46e5',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: resendLoading ? 'not-allowed' : 'pointer',
                                opacity: resendLoading ? 0.7 : 1,
                                marginBottom: '12px',
                                width: '100%',
                            }}>
                            {resendLoading ? 'Sending…' : '✉️ Send a New Verification Email'}
                        </button>
                        {resendMessage && (
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 12px', lineHeight: 1.5 }}>
                                {resendMessage}
                            </p>
                        )}
                        <p style={{ marginTop: '16px' }}>
                            <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
                                ← Back to Login
                            </Link>
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
