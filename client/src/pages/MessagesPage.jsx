import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Hash, Plus, MessageSquare, Send, Smile, Paperclip, 
    MoreVertical, Reply, Edit2, Trash2, X, Users, Lock, 
    ChevronRight, Bell, Search, Info, AtSign, Settings,
    Layout, Sidebar as SidebarIcon, Sparkles, Image as ImageIcon,
    Mic, Video, Phone, Globe, CheckSquare, CheckCircle2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import * as chatService from '../services/chatService';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../store/workspaceStore';
import { formatDistanceToNow, format } from 'date-fns';
import { useSocket } from '../hooks/useSocket';
import Avatar from '../components/ui/Avatar';
import { cn, getInitials } from '../utils/helpers';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import PageWrapper from '../components/layout/PageWrapper';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils/constants';

// ── Presence dot ──────────────────────────────────────────────────────────────
const PresenceDot = ({ status, className }) => {
    const colors = { online: 'bg-emerald-500', away: 'bg-amber-400', offline: 'bg-slate-400' };
    return <span className={cn("inline-block w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm", colors[status] || colors.offline, className)} />;
};

// ── MessageToTaskModal ────────────────────────────────────────────────────────
const MessageToTaskModal = ({ isOpen, onClose, message, workspaceSlug }) => {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [projectId, setProjectId] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('medium');

    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspaceSlug],
        queryFn: () => projectService.getAll(),
        enabled: isOpen,
    });

    const projects = projectsData?.data?.data?.projects || [];

    useEffect(() => {
        if (message) {
            setTitle(message.content.slice(0, 100));
        }
    }, [message]);

    const createMutation = useMutation({
        mutationFn: (data) => taskService.create(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks', projectId]);
            toast.success('Task created from message');
            onClose();
        },
        onError: () => toast.error('Failed to create task'),
    });

    const handleCreate = () => {
        if (!projectId) return toast.error('Please select a project');
        createMutation.mutate({ title, status, priority, description: `Created from message: ${message.content}` });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Convert Message to Task">
            <div className="space-y-4">
                <Input label="Task Title" value={title} onChange={e => setTitle(e.target.value)} />
                
                <div>
                    <label className="label">Project</label>
                    <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                        <option value="">Select a project...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Status</label>
                        <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Priority</label>
                        <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Message Content</p>
                    <p className="text-xs text-slate-500 italic line-clamp-3">{message?.content}</p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button isLoading={createMutation.isPending} onClick={handleCreate} disabled={!title || !projectId}>Create Task</Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ typingUsers }) => {
    if (!typingUsers?.length) return <div className="h-6" />;
    const names = typingUsers.map(u => u.userName).join(', ');
    return (
        <div className="flex items-center gap-2 px-6 py-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium italic animate-in fade-in slide-in-from-bottom-1">
            <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                    <motion.span key={i} className="w-1 h-1 rounded-full bg-indigo-500"
                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
                ))}
            </span>
            <span>{names} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
        </div>
    );
};

// ── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ message, onReply, onReact, onEdit, onDelete, onCreateTask, currentUserId, showAvatar = true, channelMembers = [], channelLastRead = {} }) => {
    const [showActions, setShowActions] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    if (message.deletedAt) {
        return (
            <div className="px-6 py-1 flex justify-center">
                <span className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">This message was deleted</span>
            </div>
        );
    }

    const isOwn = message.authorId === currentUserId;
    const reactionMap = {};
    message.reactions?.forEach(r => {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
        reactionMap[r.emoji].push(r.userId);
    });

    // Calculate Read Status
    const seenByCount = Object.entries(channelLastRead).filter(([uid, time]) => 
        uid !== message.authorId && new Date(time) >= new Date(message.createdAt)
    ).length;

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (editContent.trim()) { onEdit(message.id, editContent); setEditing(false); }
    };

    return (
        <div className={cn(
            "group/msg relative flex gap-3 px-4 sm:px-6 py-1 transition-all duration-200",
            isOwn ? "flex-row-reverse" : "flex-row",
            showAvatar ? "mt-4" : "mt-0.5"
        )}
            onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
            
            {!isOwn && (
                <div className="w-8 shrink-0 flex items-end mb-1">
                    {showAvatar ? (
                        <Avatar user={message.author} size="xs" className="rounded-lg shadow-sm ring-1 ring-slate-100 dark:ring-white/5" />
                    ) : (
                        <div className="w-8" />
                    )}
                </div>
            )}

            <div className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[75%]",
                isOwn ? "items-end" : "items-start"
            )}>
                {showAvatar && !isOwn && (
                    <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{message.author?.name}</span>
                )}
                
                <div className="relative group">
                    {editing ? (
                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border-2 border-indigo-500 shadow-2xl min-w-[240px] z-20">
                            <textarea 
                                value={editContent} 
                                onChange={e => setEditContent(e.target.value)}
                                rows={3}
                                className="w-full text-sm p-2 bg-transparent text-slate-900 dark:text-slate-100 outline-none resize-none" 
                                autoFocus 
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditing(false)} className="text-[10px] font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-all">Save</button>
                            </div>
                        </form>
                    ) : (
                        <div className={cn(
                            "px-4 py-2.5 text-sm leading-relaxed break-words",
                            isOwn 
                                ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[20px] rounded-tr-none shadow-lg shadow-indigo-200 dark:shadow-none" 
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[20px] rounded-tl-none shadow-sm border border-slate-100 dark:border-white/5"
                        )}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {showActions && !editing && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 5 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                className={cn(
                                    "absolute -top-10 flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1 z-10",
                                    isOwn ? "right-0" : "left-0"
                                )}
                            >
                                {['👍', '❤️', '🔥'].map(emoji => (
                                    <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm transition-all active:scale-125">{emoji}</button>
                                ))}
                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <button onClick={() => onReply(message)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors" title="Reply"><Reply size={14} /></button>
                                <button onClick={() => onCreateTask(message)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors" title="Convert to Task"><CheckSquare size={14} /></button>
                                {isOwn && <>
                                    <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors" title="Edit"><Edit2 size={14} /></button>
                                    <button onClick={() => onDelete(message.id)} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                </>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {Object.entries(reactionMap).length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-1.5", isOwn ? "justify-end" : "justify-start")}>
                        {Object.entries(reactionMap).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                                    users.includes(currentUserId) 
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                                )}>
                                <span>{emoji}</span> 
                                <span>{users.length}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className={cn("flex items-center gap-2 mt-1 uppercase tracking-widest opacity-70 text-[9px] font-black", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-slate-400">
                        {format(new Date(message.createdAt), 'h:mm a')}
                        {message.editedAt && " • EDITED"}
                    </span>
                    {isOwn && seenByCount > 0 && (
                        <span className="text-emerald-500 flex items-center gap-0.5">
                            <CheckCircle2 size={10} />
                            {seenByCount === (channelMembers.length - 1) ? 'SEEN' : `SEEN BY ${seenByCount}`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Add Member Modal ─────────────────────────────────────────────────────────
const AddMemberModal = ({ isOpen, onClose, onAdd, currentMembers = [] }) => {
    const { workspace } = useWorkspaceStore();
    const [search, setSearch] = useState('');
    
    const { data: membersData, isLoading } = useQuery({
        queryKey: ['workspace-members-all', workspace?.slug, search],
        queryFn: () => chatService.getWorkspaceMembers(search),
        enabled: isOpen && !!workspace?.slug
    });

    const members = (membersData?.data?.data?.members || [])
        .filter(m => !currentMembers.find(cm => cm.userId === m.user.id));

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-white/20 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Add to Channel</h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                        </div>
                        
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search members..." 
                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 mb-6 transition-all font-medium"
                            autoFocus
                        />

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                            {isLoading ? (
                                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-2xl mb-2" />)
                            ) : members.length > 0 ? (
                                members.map(m => (
                                    <button 
                                        key={m.user.id}
                                        onClick={() => onAdd(m.user.id)}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
                                    >
                                        <Avatar user={m.user} size="sm" className="rounded-xl" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{m.user.name}</p>
                                            <p className="text-xs text-slate-500 truncate font-medium">{m.user.email}</p>
                                        </div>
                                        <Plus size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center text-slate-400 font-bold">No members to add</div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── New DM Modal ─────────────────────────────────────────────────────────────
const NewDirectMessageModal = ({ isOpen, onClose, onSelect, currentUserId }) => {
    const { workspace } = useWorkspaceStore();
    const [search, setSearch] = useState('');
    
    const { data: membersData, isLoading } = useQuery({
        queryKey: ['workspace-members', workspace?.slug, search],
        queryFn: () => chatService.getWorkspaceMembers(search),
        enabled: isOpen && !!workspace?.slug
    });

    const members = (membersData?.data?.data?.members || [])
        .filter(m => m.user.id !== currentUserId);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-white/20 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">New Message</h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
                        </div>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search members..." 
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                            {isLoading ? (
                                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-2xl mb-2" />)
                            ) : members.length > 0 ? (
                                members.map(m => (
                                    <button 
                                        key={m.user.id}
                                        onClick={() => onSelect(m.user.id)}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
                                    >
                                        <Avatar user={m.user} size="md" className="rounded-xl shadow-sm border border-white dark:border-slate-800" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{m.user.name}</p>
                                            <p className="text-xs text-slate-500 truncate font-medium">{m.user.email}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                            <ChevronRight size={18} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-slate-400 font-bold">No members found.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── Main MessagesPage ─────────────────────────────────────────────────────────
const MessagesPage = () => {
    const { user } = useAuthStore();
    const { channels, setChannels, activeChannelId, setActiveChannel, messages, setMessages, appendMessage,
        updateMessage, removeMessage, unreadCounts, setUnreadCounts, clearUnread, typingUsers, setTyping, setPresence, onlineUsers, 
        threadMessageId, setThreadMessage, lastRead, setLastRead } = useChatStore();
    const socket = useSocket();
    const queryClient = useQueryClient();
    const { workspace, workspaces, switchWorkspace } = useWorkspaceStore();

    const [newMessage, setNewMessage] = useState('');
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [isSuggestingResponse, setIsSuggestingResponse] = useState(false);
    const [showMessageToTask, setShowMessageToTask] = useState(false);
    const [selectedMessageForTask, setSelectedMessageForTask] = useState(null);
    
    const feedRef = useRef(null);
    const typingTimerRef = useRef(null);

    // ... (keep previous queries)

    const handleAddMember = async (targetUserId) => {
        try {
            await chatService.addMember(activeChannelId, { userId: targetUserId });
            // Refresh channel data to show new member
            const res = await chatService.getChannel(activeChannelId);
            const updatedChannel = res.data.data.channel;
            setChannels(channels.map(c => c.id === activeChannelId ? updatedChannel : c));
            setShowAddMember(false);
            toast.success('Member added to channel');
            socket?.emit('channel:member:added', { channelId: activeChannelId, userId: targetUserId });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (targetUserId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await chatService.removeMember(activeChannelId, targetUserId);
            const res = await chatService.getChannel(activeChannelId);
            const updatedChannel = res.data.data.channel;
            setChannels(channels.map(c => c.id === activeChannelId ? updatedChannel : c));
            toast.success('Member removed');
        } catch (err) {
            toast.error('Failed to remove member');
        }
    };

    const { isLoading } = useQuery({
        queryKey: ['channels', workspace?.slug],
        queryFn: async () => {
            const res = await chatService.getChannels();
            setChannels(res.data.data.channels);
            return res.data.data.channels;
        },
    });

    useQuery({
        queryKey: ['unread-counts', workspace?.slug],
        queryFn: async () => {
            const res = await chatService.getUnreadCounts();
            setUnreadCounts(res.data.data.counts);
        },
        refetchInterval: 30000,
    });

    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (!activeChannelId) return;
        setHasMore(false);
        setNextCursor(null);
        
        chatService.getMessages(activeChannelId).then(res => {
            setMessages(activeChannelId, res.data.data.messages);
            setNextCursor(res.data.data.nextCursor);
            setHasMore(!!res.data.data.nextCursor);
            
            setTimeout(() => {
                if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }, 50);
        });
        chatService.markRead(activeChannelId).catch(() => { });
        clearUnread(activeChannelId);
    }, [activeChannelId]);

    const loadMore = async () => {
        if (!nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const res = await chatService.getMessages(activeChannelId, nextCursor);
            const olderMessages = res.data.data.messages;
            
            // Prepend older messages to the store
            const currentMessages = messages[activeChannelId] || [];
            setMessages(activeChannelId, [...olderMessages, ...currentMessages]);
            
            setNextCursor(res.data.data.nextCursor);
            setHasMore(!!res.data.data.nextCursor);
            
            // Maintain scroll position roughly
            if (feedRef.current) {
                const el = feedRef.current;
                const prevHeight = el.scrollHeight;
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight - prevHeight;
                }, 0);
            }
        } catch (err) {
            toast.error('Failed to load more messages');
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        if (feedRef.current && !nextCursor) { // Only snap to bottom on first load or new message
            const el = feedRef.current;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages[activeChannelId]?.length]);

    useEffect(() => {
        if (!socket || !activeChannelId) return;
        
        // Mark channel as read locally and via socket
        socket.emit('channel:read', { channelId: activeChannelId, userId: user.id });
        
        const onNew = ({ message }) => {
            if (message.channelId === activeChannelId) {
                appendMessage(activeChannelId, message);
                // Auto-mark as read if we're looking at it
                socket.emit('channel:read', { channelId: activeChannelId, userId: user.id });
            }
        };
        const onUpdated = ({ message }) => {
            if (message.channelId === activeChannelId) updateMessage(activeChannelId, message);
        };
        const onDeleted = ({ messageId, channelId }) => {
            if (channelId === activeChannelId) removeMessage(activeChannelId, messageId);
        };
        const onTypingStart = ({ userId, userName, channelId }) => {
            if (channelId === activeChannelId) setTyping(channelId, userId, userName, true);
        };
        const onTypingStop = ({ userId, channelId }) => {
            if (channelId === activeChannelId) setTyping(channelId, userId, null, false);
        };
        const onPresence = ({ userId, status }) => setPresence(userId, status);

        const onReactionsUpdated = ({ messageId, reactions }) => {
            const msgs = messages[activeChannelId] || [];
            const msg = msgs.find(m => m.id === messageId);
            if (msg) updateMessage(activeChannelId, { ...msg, reactions });
        };

        const onMessageSeen = ({ channelId, userId, lastReadAt }) => {
            setLastRead(channelId, userId, lastReadAt);
        };

        socket.on('message:new', onNew);
        socket.on('message:updated', onUpdated);
        socket.on('message:deleted', onDeleted);
        socket.on('message:reactions:updated', onReactionsUpdated);
        socket.on('message:seen', onMessageSeen);
        socket.on('typing:start', onTypingStart);
        socket.on('typing:stop', onTypingStop);
        socket.on('presence:update', onPresence);

        return () => {
            socket.off('message:new', onNew);
            socket.off('message:updated', onUpdated);
            socket.off('message:deleted', onDeleted);
            socket.off('message:reactions:updated', onReactionsUpdated);
            socket.off('message:seen', onMessageSeen);
            socket.off('typing:start', onTypingStart);
            socket.off('typing:stop', onTypingStop);
            socket.off('presence:update', onPresence);
            socket.emit('leave:channel', activeChannelId);
        };
    }, [socket, activeChannelId, user.id]);

    const sendMsg = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannelId) return;
        try {
            const res = await chatService.sendMessage(activeChannelId, { content: newMessage });
            const msg = res.data.data.message;
            appendMessage(activeChannelId, msg);
            socket?.emit('message:broadcast', { channelId: activeChannelId, message: msg });
            setNewMessage('');
            socket?.emit('typing:stop', { channelId: activeChannelId, userId: user.id });
        } catch { toast.error('Failed to send'); }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!socket || !activeChannelId) return;
        socket.emit('typing:start', { channelId: activeChannelId, userId: user.id, userName: user.name });
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            socket.emit('typing:stop', { channelId: activeChannelId, userId: user.id });
        }, 2000);
    };

    const handleSuggestResponse = async () => {
        const lastMessages = (messages[activeChannelId] || []).slice(-5);
        if (!lastMessages.length) return;
        setIsSuggestingResponse(true);
        try {
            const prompt = lastMessages.map(m => `${m.author?.name}: ${m.content}`).join('\n');
            const res = await taskService.suggestPriority({ title: "Draft a reply to:", description: prompt });
            setNewMessage(prev => prev + (prev ? ' ' : '') + `Replying with: ${res.data?.data?.priority}...`);
        } catch { toast.error('AI draft failed'); } finally { setIsSuggestingResponse(false); }
    };

    const handleReact = async (msgId, emoji) => {
        try {
            const res = await chatService.addReaction(activeChannelId, msgId, emoji);
            const msgs = messages[activeChannelId] || [];
            const msg = msgs.find(m => m.id === msgId);
            if (!msg) return;
            const updated = {
                ...msg,
                reactions: res.data.data.action === 'removed'
                    ? msg.reactions?.filter(r => !(r.emoji === emoji && r.userId === user.id))
                    : [...(msg.reactions || []), { emoji, userId: user.id, user }],
            };
            updateMessage(activeChannelId, updated);
        } catch { }
    };

    const handleEdit = async (msgId, content) => {
        try {
            const res = await chatService.editMessage(activeChannelId, msgId, { content });
            updateMessage(activeChannelId, res.data.data.message);
            socket?.emit('message:updated:broadcast', { channelId: activeChannelId, message: res.data.data.message });
        } catch { toast.error('Failed to edit'); }
    };

    const handleDelete = async (msgId) => {
        try {
            await chatService.deleteMessage(activeChannelId, msgId);
            removeMessage(activeChannelId, msgId);
            socket?.emit('message:deleted:broadcast', { channelId: activeChannelId, messageId: msgId });
        } catch { toast.error('Failed to delete'); }
    };

    const createChannel = async (e) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;
        try {
            const res = await chatService.createChannel({ name: newChannelName });
            setChannels([...channels, res.data.data.channel]);
            setActiveChannel(res.data.data.channel.id);
            setNewChannelName('');
            setShowNewChannel(false);
            toast.success('Channel created');
        } catch { toast.error('Failed to create channel'); }
    };

    const startDirectMessage = async (targetUserId) => {
        try {
            const res = await chatService.getOrCreateDM(targetUserId);
            const dmChannel = res.data.data.channel;
            if (!channels.find(c => c.id === dmChannel.id)) setChannels([dmChannel, ...channels]);
            setActiveChannel(dmChannel.id);
            setShowNewDM(false);
        } catch { toast.error('Failed to start conversation'); }
    };

    const activeChannel = channels.find(c => c.id === activeChannelId);
    const directOther = activeChannel?.type === 'direct' ? activeChannel.members?.find(m => m.userId !== user.id)?.user : null;

    return (
        <PageWrapper title="Messages">
            <div className="h-full flex bg-[#f1f5f9] dark:bg-gray-950 overflow-hidden font-sans p-0 sm:p-2 gap-0 sm:gap-2">
                <NewDirectMessageModal 
                    isOpen={showNewDM} 
                    onClose={() => setShowNewDM(false)} 
                    onSelect={startDirectMessage}
                    currentUserId={user.id}
                />
                
                {/* ── Pane 1: Navigator ─────────────────── */}
                <div className="w-20 sm:w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col shrink-0 sm:rounded-[24px] border-r sm:border border-white/20 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all duration-500">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                                <MessageSquare size={18} />
                            </div>
                            <h2 className="hidden sm:block font-black text-slate-900 dark:text-white tracking-tight truncate uppercase tracking-widest text-[11px]">Conversations</h2>
                        </div>
                        <button onClick={() => setShowNewDM(true)} className="p-1.5 bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6 no-scrollbar scroll-smooth">
                        <div className="px-4 hidden sm:block">
                            <div className="relative group">
                                <Search className="absolute left-4 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                <input placeholder="Search..." className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold" />
                            </div>
                        </div>

                        <div className="px-3">
                            <div className="flex items-center justify-between px-4 mb-3">
                                <span className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Channels</span>
                            </div>
                            <div className="space-y-0.5">
                                {channels.filter(c => c.type !== 'direct').map(ch => (
                                    <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                        className={cn(
                                            "w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:px-4 py-2.5 rounded-[16px] text-sm font-bold transition-all duration-200 group",
                                            activeChannelId === ch.id ? "bg-indigo-600 text-white shadow-xl" : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5"
                                        )}>
                                        <Hash size={18} className={cn("shrink-0", activeChannelId === ch.id ? "text-indigo-200" : "text-slate-300 dark:text-slate-600")} />
                                        <span className="hidden sm:block flex-1 truncate">{ch.name}</span>
                                        {unreadCounts[ch.id] > 0 && (
                                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black min-w-[20px] text-center", activeChannelId === ch.id ? "bg-white text-indigo-600" : "bg-indigo-600 text-white shadow-lg")}>
                                                {unreadCounts[ch.id]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-3">
                            <div className="flex items-center justify-between px-4 mb-3">
                                <span className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Direct</span>
                            </div>
                            <div className="space-y-0.5">
                                {channels.filter(c => c.type === 'direct').map(ch => {
                                    const other = ch.members?.find(m => m.userId !== user.id)?.user;
                                    const status = onlineUsers[other?.id] || 'offline';
                                    return (
                                        <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                            className={cn(
                                                "w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:px-4 py-2.5 rounded-[16px] text-sm font-bold transition-all duration-200 group",
                                                activeChannelId === ch.id ? "bg-indigo-600 text-white shadow-xl" : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5"
                                            )}>
                                            <div className="relative shrink-0">
                                                <Avatar user={other} size="xs" className={cn("rounded-xl shadow-sm", activeChannelId === ch.id ? "ring-2 ring-white/50" : "ring-1 ring-slate-100 dark:ring-white/5")} />
                                                <PresenceDot status={status} className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900" />
                                            </div>
                                            <span className="hidden sm:block flex-1 truncate">{other?.name}</span>
                                            {unreadCounts[ch.id] > 0 && (
                                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black min-w-[20px] text-center", activeChannelId === ch.id ? "bg-white text-indigo-600" : "bg-indigo-600 text-white")}>
                                                    {unreadCounts[ch.id]}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Pane 2: Chat Area ─────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 sm:rounded-[24px] border border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden">
                    {activeChannelId ? (
                        <>
                            <div className="h-16 flex items-center gap-4 px-6 border-b border-slate-100 dark:border-white/5 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-20">
                                {activeChannel?.type === 'direct' ? (
                                    <>
                                        <div className="relative group cursor-pointer">
                                            <Avatar user={directOther} size="sm" className="rounded-xl shadow-md transition-transform group-hover:scale-105" />
                                            <PresenceDot status={onlineUsers[directOther?.id] || 'offline'} className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-900 dark:text-white text-[15px] truncate tracking-tight">{directOther?.name}</h3>
                                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.15em]">Online Now</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner ring-1 ring-indigo-100 dark:ring-white/5">
                                            <Hash size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-900 dark:text-white text-[15px] truncate tracking-tight">#{activeChannel?.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{activeChannel?.members?.length} Members</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl text-slate-400 transition-all hover:text-indigo-600 shadow-sm"><Phone size={18} /></button>
                                    <button className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl text-slate-400 transition-all hover:text-indigo-600 shadow-sm"><Video size={18} /></button>
                                    <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={cn("p-2.5 rounded-xl transition-all shadow-sm", showInfoPanel ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-white dark:hover:bg-white/10")}><Info size={18} /></button>
                                </div>
                            </div>

                            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/30 dark:bg-transparent">
                                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05] dark:opacity-[0.08]">
                                    <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
                                    <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-violet-500 rounded-full blur-[150px]" />
                                </div>

                                <div ref={feedRef} className="flex-1 overflow-y-auto px-4 sm:px-10 pt-8 pb-4 flex flex-col gap-1 no-scrollbar scroll-smooth z-10">
                                    <div className="flex-1" />
                                    
                                    {hasMore && (
                                        <div className="flex justify-center py-4">
                                            <button 
                                                onClick={loadMore}
                                                disabled={isLoadingMore}
                                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:shadow-lg transition-all disabled:opacity-50"
                                            >
                                                {isLoadingMore ? 'Loading older messages...' : 'Load Previous Messages'}
                                            </button>
                                        </div>
                                    )}

                                    {(messages[activeChannelId] || []).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 border border-slate-100 dark:border-white/5"><Sparkles size={32} /></div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">The start of something great</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] font-medium leading-relaxed">Send your first message to {activeChannel?.type === 'direct' ? directOther?.name : '#' + activeChannel?.name}.</p>
                                        </div>
                                    ) : (
                                        (messages[activeChannelId] || []).map((msg, i, arr) => {
                                            const prevMsg = arr[i - 1];
                                            const isSameAuthor = prevMsg && prevMsg.authorId === msg.authorId;
                                            const isRecent = prevMsg && (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;
                                            const showAvatar = !isSameAuthor || !isRecent;
                                            return (
                                                <MessageBubble 
                                                    key={msg.id} 
                                                    message={msg} 
                                                    currentUserId={user.id} 
                                                    showAvatar={showAvatar} 
                                                    onReply={setThreadMessage} 
                                                    onReact={handleReact} 
                                                    onEdit={handleEdit} 
                                                    onDelete={handleDelete}
                                                    onCreateTask={(msg) => {
                                                        setSelectedMessageForTask(msg);
                                                        setShowMessageToTask(true);
                                                    }}
                                                    channelMembers={activeChannel?.members || []}
                                                    channelLastRead={lastRead[activeChannelId] || {}}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                <TypingIndicator typingUsers={typingUsers[activeChannelId]} />
                                <form onSubmit={sendMsg} className="relative">
                                    <div className="group bg-slate-50 dark:bg-gray-950 rounded-[24px] border-2 border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-gray-950 shadow-sm transition-all duration-500">
                                        <textarea value={newMessage} onChange={handleTyping} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); } }} placeholder={`Message ${activeChannel?.type === 'direct' ? directOther?.name : '#' + activeChannel?.name}...`} className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none p-5 resize-none max-h-40 font-bold leading-relaxed" rows={1} />
                                        <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-1">
                                                <button type="button" className="p-2.5 hover:bg-white dark:hover:bg-white/5 rounded-[14px] text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><Paperclip size={18} /></button>
                                                <button type="button" className="p-2.5 hover:bg-white dark:hover:bg-white/5 rounded-[14px] text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><Smile size={18} /></button>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2" />
                                                <button type="button" onClick={handleSuggestResponse} disabled={isSuggestingResponse} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-white dark:hover:bg-white/10 transition-all disabled:opacity-50 shadow-sm"><Sparkles size={14} className={cn(isSuggestingResponse && "animate-pulse")} />AI Draft</button>
                                            </div>
                                            <button type="submit" disabled={!newMessage.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-[14px] font-black shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 disabled:opacity-30 disabled:shadow-none transition-all flex items-center gap-2"><span className="hidden sm:inline text-xs">Send</span><Send size={16} /></button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20 dark:bg-slate-900/20 relative">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[150px]" />
                                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 rounded-full blur-[150px]" />
                            </div>
                            <div className="z-10 flex flex-col items-center max-w-lg">
                                <div className="w-32 h-32 rounded-[48px] bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-10 transform -rotate-6 hover:rotate-0 transition-transform duration-700 cursor-pointer group border-4 border-white dark:border-slate-700"><div className="w-20 h-20 rounded-[32px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={48} /></div></div>
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-tight">Focus on<br />communication.</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed font-bold mb-10 opacity-80">Choose a channel or team member from the sidebar to start collaborating.</p>
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                    <button onClick={() => setShowNewChannel(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[20px] font-black shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all hover:translate-y-[-4px] active:translate-y-0 text-[11px] tracking-widest uppercase">Create Channel</button>
                                    <button onClick={() => setShowNewDM(true)} className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-[20px] font-black shadow-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:translate-y-[-4px] border border-slate-100 dark:border-white/5 text-[11px] tracking-widest uppercase">Direct Message</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Pane 3: Info Panel ─────────────────── */}
                <AnimatePresence>
                    {showInfoPanel && activeChannelId && (
                        <motion.div initial={{ width: 0, opacity: 0, x: 20 }} animate={{ width: 360, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: 20 }} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[24px] shrink-0 overflow-hidden hidden 2xl:flex flex-col shadow-2xl">
                            <div className="h-16 flex items-center justify-between px-8 border-b border-slate-100 dark:border-white/5 shrink-0"><h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[9px]">Information</h3><button onClick={() => setShowInfoPanel(false)} className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl text-slate-400 transition-all shadow-sm"><X size={16} /></button></div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                                <div className="flex flex-col items-center text-center mb-10">
                                    {activeChannel?.type === 'direct' ? (
                                        <><div className="relative mb-6"><Avatar user={directOther} size="xl" className="rounded-[40px] shadow-2xl border-4 border-white dark:border-slate-800" /><PresenceDot status={onlineUsers[directOther?.id] || 'offline'} className="absolute -bottom-1 -right-1 border-[6px] border-white dark:border-slate-900 w-8 h-8 shadow-lg" /></div><h4 className="font-black text-2xl text-slate-900 dark:text-white mb-1 tracking-tighter">{directOther?.name}</h4><p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-8 uppercase tracking-widest">{directOther?.email}</p><div className="w-full grid grid-cols-2 gap-4"><button className="flex flex-col items-center gap-2 p-5 rounded-[24px] bg-slate-50 dark:bg-white/5 border-2 border-transparent hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-100 dark:hover:shadow-none"><div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all"><Bell size={20} /></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Mute</span></button><button className="flex flex-col items-center gap-2 p-5 rounded-[24px] bg-slate-50 dark:bg-white/5 border-2 border-transparent hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-indigo-100 dark:hover:shadow-none"><div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all"><Globe size={20} /></div><span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Profile</span></button></div></>
                                    ) : (
                                        <><div className="w-24 h-24 rounded-[36px] bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-500/10 dark:to-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 shadow-inner border border-white dark:border-white/5"><Hash size={48} /></div><h4 className="font-black text-2xl text-slate-900 dark:text-white mb-2 tracking-tighter">#{activeChannel?.name}</h4><div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Created {format(new Date(activeChannel?.createdAt || new Date()), 'MMM yyyy')}</div></>
                                    )}
                                </div>
                                <div className="space-y-10">
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 pl-1">Description</h5>
                                        <div className="p-5 rounded-[20px] bg-slate-50 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-bold border border-slate-100 dark:border-white/5 shadow-sm">{activeChannel?.description || "Collaborate with your team members in real-time."}</div>
                                    </div>
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 pl-1">Toolbox</h5>
                                        <div className="space-y-2">
                                            {[
                                                { icon: <Search size={16} />, label: 'Search history' },
                                                { icon: <Lock size={16} />, label: 'Privacy & Security' },
                                                { icon: <Users size={16} />, label: 'Team members', onClick: () => setShowAddMember(true) },
                                                { icon: <ImageIcon size={16} />, label: 'Shared assets' }
                                            ].map((item, i) => (
                                                <button key={i} onClick={item.onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-black transition-all group border-2 border-transparent hover:border-slate-100 dark:hover:border-white/5">
                                                    <span className="text-slate-400 group-hover:text-indigo-600 transition-all">{item.icon}</span>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Member Modal */}
                <AddMemberModal
                    isOpen={showAddMember}
                    onClose={() => setShowAddMember(false)}
                    onAdd={handleAddMember}
                    currentMembers={activeChannel?.members || []}
                />

                {/* Message to Task Modal */}
                <MessageToTaskModal
                    isOpen={showMessageToTask}
                    onClose={() => {
                        setShowMessageToTask(false);
                        setSelectedMessageForTask(null);
                    }}
                    message={selectedMessageForTask}
                    workspaceSlug={workspace?.slug}
                />

                {/* New channel modal */}
                <AnimatePresence>
                    {showNewChannel && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"><motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-white/20"><div className="flex items-center justify-between mb-8"><div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Plus size={24} /></div><button onClick={() => setShowNewChannel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button></div><h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Create Channel</h3><p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">Group conversations for your team.</p><form onSubmit={createChannel} className="space-y-6"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Channel Name</label><input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="e.g. project-apollo" autoFocus className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold shadow-sm" /></div><div className="flex gap-3"><button type="button" onClick={() => setShowNewChannel(false)} className="flex-1 px-6 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button><button type="submit" className="flex-1 px-6 py-4 text-sm font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">Create</button></div></form></motion.div></motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageWrapper>
    );
};

export default MessagesPage;
