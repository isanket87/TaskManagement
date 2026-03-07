import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

/**
 * A dismissible yellow banner that appears for email-unverified users.
 * Shown inside the authenticated app shell only.
 */
export default function EmailVerificationBanner() {
    const { user, resendVerificationEmail } = useAuthStore();
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(false);

    // Only show if logged in and email is not verified
    if (!user || user.emailVerified || dismissed) return null;

    const handleResend = async () => {
        setLoading(true);
        const result = await resendVerificationEmail();
        setLoading(false);
        if (result.success) {
            toast.success('Verification email sent! Check your inbox.');
        } else {
            toast.error(result.error || 'Failed to resend email.');
        }
    };

    return (
        <div
            id="email-verification-banner"
            style={{
                position: 'sticky',
                top: 0,
                background: 'linear-gradient(90deg, #fffbeb, #fef3c7)',
                borderBottom: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 24px',
                gap: '12px',
                flexWrap: 'wrap',
                zIndex: 9999,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span style={{ color: '#92400e', fontSize: '14px', fontWeight: 500 }}>
                    Please verify your email address. Check your inbox for a verification link.
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <button
                    id="resend-verification-banner-btn"
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                        background: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {loading ? 'Sending…' : 'Resend email'}
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#92400e',
                        fontSize: '18px',
                        lineHeight: 1,
                        padding: '2px',
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
