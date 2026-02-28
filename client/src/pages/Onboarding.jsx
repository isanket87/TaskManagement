import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    CheckCircle2, XCircle, Loader2, Building2, Users,
    FolderKanban, Rocket, Plus, X, ArrowRight, ChevronRight
} from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import debounce from 'lodash.debounce';

// ── Step config ───────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Workspace', icon: Building2 },
    { id: 2, label: 'Team', icon: Users },
    { id: 3, label: 'Project', icon: FolderKanban },
    { id: 4, label: 'Launch', icon: Rocket },
];

// ── Animations ────────────────────────────────────────────────────────────────
const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ── Main component ────────────────────────────────────────────────────────────
const Onboarding = () => {
    const navigate = useNavigate();
    const { fetchMe, user } = useAuthStore();
    const { setWorkspace } = useWorkspaceStore();

    const [step, setStep] = useState(1);
    const [dir, setDir] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1 — Workspace
    const [wsName, setWsName] = useState('');
    const [wsSlug, setWsSlug] = useState('');
    const [wsDesc, setWsDesc] = useState('');
    const [slugAvailable, setSlugAvail] = useState(null);
    const [checkingSlug, setCheckingSlug] = useState(false);

    // Step 2 — Team
    const [emails, setEmails] = useState(['', '', '']);

    // Step 3 — Project
    const [projectName, setProjectName] = useState('');

    // Created workspace (needed for steps 2, 3)
    const [workspace, setWs] = useState(null);

    // ── Navigation helpers ─────────────────────────────────────────────────
    const goTo = (next) => {
        setDir(next > step ? 1 : -1);
        setStep(next);
    };

    // ── Slug logic ────────────────────────────────────────────────────────
    const generateSlug = (text) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const handleWsNameChange = (e) => {
        const val = e.target.value;
        setWsName(val);
        if (!wsSlug || wsSlug === generateSlug(wsName)) {
            const s = generateSlug(val);
            setWsSlug(s);
            if (s) checkSlug(s);
        }
    };

    const handleSlugChange = (e) => {
        const s = generateSlug(e.target.value);
        setWsSlug(s);
        if (s) checkSlug(s);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const checkSlug = useCallback(
        debounce(async (s) => {
            if (!s || s.length < 3) { setSlugAvail(null); return; }
            setCheckingSlug(true);
            try {
                const res = await api.get(`/workspaces/check-slug?slug=${s}`);
                setSlugAvail(res.data.data.available);
            } catch { setSlugAvail(null); }
            finally { setCheckingSlug(false); }
        }, 500),
        []
    );

    // ── Step 1: Create workspace ──────────────────────────────────────────
    const submitWorkspace = async () => {
        if (!wsName || !wsSlug || slugAvailable === false) return;
        setLoading(true);
        try {
            const res = await api.post('/workspaces', { name: wsName, slug: wsSlug, description: wsDesc });
            const ws = res.data.data;
            setWs(ws);
            setWorkspace(ws, 'owner');
            await fetchMe();
            goTo(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create workspace');
        } finally { setLoading(false); }
    };

    // ── Step 2: Invite team (optional) ────────────────────────────────────
    const submitInvites = async () => {
        const valid = emails.filter(e => e.trim() && e.includes('@'));
        if (!valid.length) { goTo(3); return; }
        setLoading(true);
        try {
            await Promise.allSettled(
                valid.map(email => api.post(`/workspaces/${workspace.slug}/members`, { email, role: 'member' }))
            );
            toast.success(`Invite${valid.length > 1 ? 's' : ''} sent!`);
        } catch { /* ignore individual failures */ }
        finally { setLoading(false); goTo(3); }
    };

    // ── Step 3: Create first project + sample tasks ───────────────────────
    const submitProject = async () => {
        const name = projectName.trim() || 'My First Project';
        setLoading(true);
        try {
            const pRes = await api.post(`/workspaces/${workspace.slug}/projects`, {
                name,
                description: 'Created during onboarding',
                color: '#6366f1',
            });
            const project = pRes.data.data.project;

            // Auto-create sample tasks
            const sampleTasks = [
                { title: '👋 Welcome to Brioright! Explore the dashboard', priority: 'low' },
                { title: '✅ Create your first real task', priority: 'medium' },
                { title: '🤝 Invite your teammates', priority: 'medium' },
            ];
            await Promise.allSettled(
                sampleTasks.map(t => api.post(`/workspaces/${workspace.slug}/projects/${project.id}/tasks`, {
                    title: t.title,
                    priority: t.priority,
                    status: 'todo',
                }))
            );
            goTo(4);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        } finally { setLoading(false); }
    };

    // ── Step 4: Go to dashboard ───────────────────────────────────────────
    const finish = () => {
        navigate(`/workspace/${workspace.slug}/dashboard`);
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex flex-col items-center justify-center px-4 py-12">

            {/* Logo */}
            <div className="flex items-center gap-2 mb-10">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M4 3h9c3 0 5.5 2.2 5.5 5S16 13 13 13H4V3zm0 10h10c3.3 0 6 2.4 6 5.5S17.3 24 14 24H4V13z" fill="white" />
                    </svg>
                </div>
                <span className="font-bold text-xl text-gray-900 dark:text-white">Brioright</span>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mb-8">
                <div className="flex items-center justify-between mb-3">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = step > s.id;
                        const active = step === s.id;
                        return (
                            <div key={s.id} className="flex items-center flex-1">
                                <div className={`flex flex-col items-center gap-1 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${done ? 'bg-indigo-600 border-indigo-600' :
                                        active ? 'bg-white dark:bg-gray-900 border-indigo-600 shadow-md shadow-indigo-100' :
                                            'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                        }`}>
                                        {done
                                            ? <CheckCircle2 className="w-5 h-5 text-white" />
                                            : <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        }
                                    </div>
                                    <span className={`text-xs font-medium hidden sm:block ${active ? 'text-indigo-600' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`h-0.5 flex-1 mx-2 mb-4 rounded transition-all duration-500 ${done ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                        key={step}
                        custom={dir}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="p-8"
                    >

                        {/* ── STEP 1 — Workspace ── */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4">
                                        <Building2 className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your workspace</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">This is home base for your team's projects and tasks.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace name</label>
                                        <input
                                            type="text"
                                            value={wsName}
                                            onChange={handleWsNameChange}
                                            placeholder="Acme Corp"
                                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workspace URL</label>
                                        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                            <span className="flex items-center px-3 bg-gray-50 dark:bg-gray-800 text-gray-400 text-sm border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                                                brioright.online/
                                            </span>
                                            <input
                                                type="text"
                                                value={wsSlug}
                                                onChange={handleSlugChange}
                                                className="flex-1 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="mt-1.5 text-xs flex items-center gap-1">
                                            {checkingSlug ? (
                                                <span className="text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>
                                            ) : wsSlug.length > 0 && wsSlug.length < 3 ? (
                                                <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> At least 3 characters</span>
                                            ) : slugAvailable === true ? (
                                                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available!</span>
                                            ) : slugAvailable === false ? (
                                                <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Already taken</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Description <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={wsDesc}
                                            onChange={(e) => setWsDesc(e.target.value)}
                                            placeholder="What does your team work on?"
                                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={submitWorkspace}
                                    disabled={loading || !wsName || !wsSlug || wsSlug.length < 3 || slugAvailable === false || checkingSlug}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2 — Invite team ── */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-4">
                                        <Users className="w-6 h-6 text-violet-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invite your team</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Add up to 3 teammates. You can always invite more later.</p>
                                </div>

                                <div className="space-y-3">
                                    {emails.map((email, i) => (
                                        <div key={i} className="relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    const next = [...emails];
                                                    next[i] = e.target.value;
                                                    setEmails(next);
                                                }}
                                                placeholder={`teammate${i + 1}@company.com`}
                                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                                            />
                                            {email && (
                                                <button
                                                    onClick={() => { const next = [...emails]; next[i] = ''; setEmails(next); }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={submitInvites}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
                                    >
                                        {loading
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : emails.some(e => e.trim())
                                                ? <><Plus className="w-4 h-4" /> Send Invites</>
                                                : <>Continue <ArrowRight className="w-4 h-4" /></>
                                        }
                                    </button>
                                    <button
                                        onClick={() => goTo(3)}
                                        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-1 transition"
                                    >
                                        Skip for now
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3 — First project ── */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                                        <FolderKanban className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your first project</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">We'll add a few starter tasks so you're not staring at a blank board.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project name</label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="My First Project"
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                    />
                                </div>

                                {/* Preview of what will be created */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Sample tasks we'll create</p>
                                    {['👋 Welcome to Brioright! Explore the dashboard', '✅ Create your first real task', '🤝 Invite your teammates'].map((t, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                                            {t}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={submitProject}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FolderKanban className="w-4 h-4" /> Create Project</>}
                                    </button>
                                    <button
                                        onClick={() => goTo(4)}
                                        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-1 transition"
                                    >
                                        Skip for now
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 4 — Launch ── */}
                        {step === 4 && (
                            <div className="text-center space-y-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
                                        <Rocket className="w-10 h-10 text-white" />
                                    </div>
                                    {/* Decorative rings */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-28 h-28 rounded-full border-2 border-indigo-200 dark:border-indigo-800 animate-ping opacity-30" />
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        You're all set, {user?.name?.split(' ')[0] || 'there'}! 🎉
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs mx-auto">
                                        Your workspace <strong className="text-gray-700 dark:text-gray-300">{workspace?.name}</strong> is ready. Time to ship some projects. 🚀
                                    </p>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-left space-y-2">
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">What's waiting for you</p>
                                    {[
                                        'Your workspace dashboard with live stats',
                                        'Kanban board with sample tasks to get started',
                                        'Team messaging & file sharing',
                                        'Time tracker for your projects',
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={finish}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
                                >
                                    Go to Dashboard <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Step counter */}
            <p className="text-xs text-gray-400 mt-6">Step {step} of {STEPS.length}</p>
        </div>
    );
};

export default Onboarding;
