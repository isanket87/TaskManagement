import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Slack, Bell, BellOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../store/workspaceStore';

const Toggle = ({ value, onChange, label, description }) => (
    <div className="flex items-start justify-between py-3">
        <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <button onClick={() => onChange(!value)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const NotificationPreferencesSettings = () => {
    const [prefs, setPrefs] = useState(null);
    const [saving, setSaving] = useState(false);
    const [slackTestStatus, setSlackTestStatus] = useState(null);
    const [emailTestStatus, setEmailTestStatus] = useState(null);
    const workspace = useWorkspaceStore(s => s.workspace);

    const { isLoading } = useQuery({
        queryKey: ['notification-prefs', workspace?.slug],
        queryFn: async () => {
            const res = await api.get('/notification-preferences');
            setPrefs(res.data.data.prefs);
            return res.data.data.prefs;
        },
    });

    const updatePref = (key, value) => setPrefs(p => ({ ...p, [key]: value }));

    const saveMutation = useMutation({
        mutationFn: async () => {
            await api.put('/notification-preferences', prefs);
        },
        onSuccess: () => toast.success('Preferences saved'),
        onError: () => toast.error('Failed to save'),
    });

    const testSlack = async () => {
        setSlackTestStatus('loading');
        try {
            await api.post('/notification-preferences/test-slack', { slackWebhookUrl: prefs.slackWebhookUrl });
            setSlackTestStatus('success');
        } catch { setSlackTestStatus('error'); }
    };

    const testEmail = async () => {
        setEmailTestStatus('loading');
        try {
            await api.post('/notification-preferences/test-email');
            setEmailTestStatus('success');
        } catch { setEmailTestStatus('error'); }
    };

    if (isLoading || !prefs) {
        return <div className="p-6 text-gray-400 text-center">Loading…</div>;
    }

    const Section = ({ title, icon: Icon, children }) => (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <Icon size={18} className="text-primary-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <div className="px-6 divide-y divide-gray-50 dark:divide-gray-700/50">{children}</div>
        </div>
    );

    const StatusIcon = ({ status }) => {
        if (status === 'loading') return <Loader2 size={16} className="animate-spin text-primary-500" />;
        if (status === 'success') return <CheckCircle size={16} className="text-green-500" />;
        if (status === 'error') return <AlertCircle size={16} className="text-red-500" />;
        return null;
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Email */}
            <Section title="Email Notifications" icon={Mail}>
                <Toggle value={prefs.emailEnabled} onChange={v => updatePref('emailEnabled', v)} label="Email Notifications" description="Receive notifications via email" />
                {prefs.emailEnabled && <>
                    <Toggle value={prefs.taskAssigned} onChange={v => updatePref('taskAssigned', v)} label="Task Assigned" description="When someone assigns a task to you" />
                    <Toggle value={prefs.taskDueSoon} onChange={v => updatePref('taskDueSoon', v)} label="Due Soon Reminders" description="24h before task deadline" />
                    <Toggle value={prefs.taskOverdue} onChange={v => updatePref('taskOverdue', v)} label="Overdue Alerts" description="When a task passes its due date" />
                    <Toggle value={prefs.commentAdded} onChange={v => updatePref('commentAdded', v)} label="Comments & Mentions" description="When someone mentions you in a comment" />
                    <Toggle value={prefs.digestEnabled} onChange={v => updatePref('digestEnabled', v)} label="Daily Digest" description="Daily summary email at 8:00 AM UTC" />
                    <div className="py-3">
                        <button onClick={testEmail} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                            <StatusIcon status={emailTestStatus} />
                            Send test email
                        </button>
                    </div>
                </>}
            </Section>

            {/* Slack */}
            <Section title="Slack Notifications" icon={Slack}>
                <Toggle value={prefs.slackEnabled} onChange={v => updatePref('slackEnabled', v)} label="Slack Notifications" description="Send notifications to a Slack channel" />
                {prefs.slackEnabled && <>
                    <div className="py-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook URL</label>
                        <input value={prefs.slackWebhookUrl || ''} onChange={e => updatePref('slackWebhookUrl', e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
                        <button onClick={testSlack} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                            <StatusIcon status={slackTestStatus} />
                            Send test message
                        </button>
                    </div>
                    <Toggle value={prefs.taskAssigned} onChange={v => updatePref('taskAssigned', v)} label="Task Assigned" />
                    <Toggle value={prefs.taskOverdue} onChange={v => updatePref('taskOverdue', v)} label="Overdue Alerts" />
                    <Toggle value={prefs.commentAdded} onChange={v => updatePref('commentAdded', v)} label="Comments & Mentions" />
                </>}
            </Section>

            {/* In-App */}
            <Section title="In-App Notifications" icon={Bell}>
                <Toggle value={prefs.mentionedInChat} onChange={v => updatePref('mentionedInChat', v)} label="Chat Mentions" description="@mentions in channels" />
                <Toggle value={prefs.projectUpdates} onChange={v => updatePref('projectUpdates', v)} label="Project Updates" description="Status changes and member joins" />
            </Section>

            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isLoading}
                className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                {saveMutation.isLoading ? 'Saving…' : 'Save Preferences'}
            </button>
        </div>
    );
};

export default NotificationPreferencesSettings;
