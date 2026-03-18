import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Hash, Plus, MessageSquare, Send, Smile, Paperclip, 
    MoreVertical, Reply, Edit2, Trash2, X, Users, Lock, 
    ChevronRight, Bell, Search, Info, AtSign, Settings,
    Layout, Sidebar as SidebarIcon, Sparkles, Image as ImageIcon,
    Mic, Video, Phone, Globe
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

// ── Presence dot ──────────────────────────────────────────────────────────────
const PresenceDot = ({ status, className }) => {
    const colors = { online: 'bg-emerald-500', away: 'bg-amber-400', offline: 'bg-slate-400' };
    return <span className={cn("inline-block w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900", colors[status] || colors.offline, className)} />;
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ typingUsers }) => {
    if (!typingUsers?.length) return <div className="h-6" />;
    const names = typingUsers.map(u => u.userName).join(', ');
    return (
        <div className="flex items-center gap-2 px-6 py-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">
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
const MessageBubble = ({ message, onReply, onReact, onEdit, onDelete, currentUserId, showAvatar = true }) => {
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
            
            {/* AVATAR */}
            {!isOwn && (
                <div className="w-8 shrink-0 flex items-end mb-1">
                    {showAvatar ? (
                        <Avatar user={message.author} size="xs" className="rounded-lg shadow-sm" />
                    ) : (
                        <div className="w-8" />
                    )}
                </div>
            )}

            <div className={cn(
                "flex flex-col max-w-[80%] sm:max-w-[70%]",
                isOwn ? "items-end" : "items-start"
            )}>
                {showAvatar && !isOwn && (
                    <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{message.author?.name}</span>
                )}
                
                <div className="relative group">
                    {editing ? (
                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border-2 border-indigo-500 shadow-lg min-w-[240px]">
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
                                ? "bg-indigo-600 text-white rounded-[20px] rounded-tr-none shadow-sm shadow-indigo-100 dark:shadow-none" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[20px] rounded-tl-none shadow-sm"
                        )}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                    )}

                    {/* ACTIONS POPUP */}
                    <AnimatePresence>
                        {showActions && !editing && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "absolute -top-10 flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-10",
                                    isOwn ? "right-0" : "left-0"
                                )}
                            >
                                {['👍', '❤️', '🔥'].map(emoji => (
                                    <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm transition-all active:scale-125">{emoji}</button>
                                ))}
                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <button onClick={() => onReply(message)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"><Reply size={14} /></button>
                                {isOwn && <>
                                    <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => onDelete(message.id)} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Reactions */}
                {Object.entries(reactionMap).length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-1.5", isOwn ? "justify-end" : "justify-start")}>
                        {Object.entries(reactionMap).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                                    users.includes(currentUserId) 
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                                )}>
                                <span>{emoji}</span> 
                                <span>{users.length}</span>
                            </button>
                        ))}
                    </div>
                )}

                {showAvatar && (
                    <span className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">
                        {format(new Date(message.createdAt), 'h:mm a')}
                        {message.editedAt && " (edited)"}
                    </span>
                )}
            </div>
        </div>
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
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">New Message</h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                        </div>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or email..." 
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                            {isLoading ? (
                                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-2xl" />)
                            ) : members.length > 0 ? (
                                members.map(m => (
                                    <button 
                                        key={m.user.id}
                                        onClick={() => onSelect(m.user.id)}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
                                    >
                                        <Avatar user={m.user} size="md" className="rounded-xl shadow-sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{m.user.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight size={18} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-slate-400 font-medium">No team members found.</p>
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
        updateMessage, removeMessage, unreadCounts, setUnreadCounts, clearUnread, typingUsers, setTyping, setPresence, onlineUsers, threadMessageId, setThreadMessage } = useChatStore();
    const socket = useSocket();
    const queryClient = useQueryClient();
    const { workspace, workspaces, switchWorkspace } = useWorkspaceStore();

    const [newMessage, setNewMessage] = useState('');
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [showInfoPanel, setShowInfoPanel] = useState(true);
    const [isSuggestingResponse, setIsSuggestingResponse] = useState(false);
    
    const feedRef = useRef(null);
    const typingTimerRef = useRef(null);

    // Load channels
    const { isLoading } = useQuery({
        queryKey: ['channels', workspace?.slug],
        queryFn: async () => {
            const res = await chatService.getChannels();
            setChannels(res.data.data.channels);
            return res.data.data.channels;
        },
    });

    // Load unread counts
    useQuery({
        queryKey: ['unread-counts', workspace?.slug],
        queryFn: async () => {
            const res = await chatService.getUnreadCounts();
            setUnreadCounts(res.data.data.counts);
        },
        refetchInterval: 30000,
    });

    // Load messages for active channel
    useEffect(() => {
        if (!activeChannelId) return;
        chatService.getMessages(activeChannelId).then(res => {
            setMessages(activeChannelId, res.data.data.messages);
            setTimeout(() => {
                if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }, 50);
        });
        chatService.markRead(activeChannelId).catch(() => { });
        clearUnread(activeChannelId);
    }, [activeChannelId]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (feedRef.current) {
            const el = feedRef.current;
            const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
            if (isAtBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages[activeChannelId]?.length]);

    // Socket subscriptions
    useEffect(() => {
        if (!socket || !activeChannelId) return;
        socket.emit('join:channel', activeChannelId);
        socket.emit('join:user', user.id);

        const onNew = ({ message }) => {
            // Only append if it's for the current active channel
            if (message.channelId === activeChannelId) {
                appendMessage(activeChannelId, message);
            }
        };
        const onUpdated = ({ message }) => {
            if (message.channelId === activeChannelId) {
                updateMessage(activeChannelId, message);
            }
        };
        const onDeleted = ({ messageId, channelId }) => {
            if (channelId === activeChannelId) {
                removeMessage(activeChannelId, messageId);
            }
        };
        const onTypingStart = ({ userId, userName, channelId }) => {
            if (channelId === activeChannelId) setTyping(channelId, userId, userName, true);
        };
        const onTypingStop = ({ userId, channelId }) => {
            if (channelId === activeChannelId) setTyping(channelId, userId, null, false);
        };
        const onPresence = ({ userId, status }) => setPresence(userId, status);

        socket.on('message:new', onNew);
        socket.on('message:updated', onUpdated);
        socket.on('message:deleted', onDeleted);
        socket.on('typing:start', onTypingStart);
        socket.on('typing:stop', onTypingStop);
        socket.on('presence:update', onPresence);

        return () => {
            socket.off('message:new', onNew);
            socket.off('message:updated', onUpdated);
            socket.off('message:deleted', onDeleted);
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
        } catch { toast.error('Failed to send message'); }
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
            // Mock AI call (Reuse existing AI controller idea)
            const prompt = lastMessages.map(m => `${m.author?.name}: ${m.content}`).join('\n');
            const res = await taskService.suggestPriority({ title: "Draft a reply to:", description: prompt });
            setNewMessage(prev => prev + (prev ? ' ' : '') + `Replying with: ${res.data?.data?.priority}...`);
        } catch (err) {
            toast.error('AI draft failed');
        } finally {
            setIsSuggestingResponse(false);
        }
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
            
            // Add to channels list if not already there
            if (!channels.find(c => c.id === dmChannel.id)) {
                setChannels([dmChannel, ...channels]);
            }
            
            setActiveChannel(dmChannel.id);
            setShowNewDM(false);
        } catch (error) {
            toast.error('Failed to start conversation');
        }
    };

    const activeChannel = channels.find(c => c.id === activeChannelId);
    const directOther = activeChannel?.type === 'direct' ? activeChannel.members?.find(m => m.userId !== user.id)?.user : null;

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-slate-950 overflow-hidden font-sans">
            <NewDirectMessageModal 
                isOpen={showNewDM} 
                onClose={() => setShowNewDM(false)} 
                onSelect={startDirectMessage}
                currentUserId={user.id}
            />
            
            {/* ── Leftmost: Workspace Switcher ─────────────────── */}
            <div className="w-[68px] bg-slate-100 dark:bg-slate-900 flex flex-col items-center py-4 gap-4 border-r border-slate-200 dark:border-slate-800 shrink-0 overflow-y-auto no-scrollbar">
                {workspaces.map(ws => (
                    <button 
                        key={ws.id} 
                        onClick={() => switchWorkspace(ws.slug)}
                        className={cn(
                            "group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                            workspace?.id === ws.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" 
                                : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
                        )}
                        title={ws.name}
                    >
                        <div className={cn(
                            "absolute left-0 w-1 bg-indigo-600 rounded-r-full transition-all duration-300",
                            workspace?.id === ws.id ? "h-8" : "h-0 group-hover:h-4"
                        )} />
                        {ws.logo ? (
                            <img src={ws.logo} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        ) : (
                            <span className="text-lg font-bold">{getInitials(ws.name)}</span>
                        )}
                    </button>
                ))}
                <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <button className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500">
                    <Plus size={20} />
                </button>
            </div>

            {/* ── Pane 2: Channel Navigator ─────────────────── */}
            <div className="w-72 bg-white dark:bg-slate-950 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800">
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-900 shrink-0">
                    <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        {workspace?.name}
                        <ChevronRight size={14} className="text-slate-400" />
                    </h2>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-400 transition-colors">
                        <MoreVertical size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
                    {/* SEARCH */}
                    <div className="px-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                placeholder="Jump to..." 
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* CHANNELS */}
                    <div className="px-3">
                        <div className="flex items-center justify-between px-3 mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Channels</span>
                            <button onClick={() => setShowNewChannel(true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="space-y-0.5">
                            {channels.filter(c => c.type !== 'direct').map(ch => (
                                <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group",
                                        activeChannelId === ch.id 
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-700"
                                    )}>
                                    <Hash size={18} className={cn("transition-colors", activeChannelId === ch.id ? "text-indigo-500" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400")} />
                                    <span className="flex-1 truncate">{ch.name}</span>
                                    {unreadCounts[ch.id] > 0 && (
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-lg px-2 py-0.5 min-w-[20px] text-center shadow-lg shadow-indigo-200 dark:shadow-none">
                                            {unreadCounts[ch.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DIRECT MESSAGES */}
                    <div className="px-3">
                        <div className="flex items-center justify-between px-3 mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Direct Messages</span>
                            <button onClick={() => setShowNewDM(true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="space-y-0.5">
                            {channels.filter(c => c.type === 'direct').map(ch => {
                                const other = ch.members?.find(m => m.userId !== user.id)?.user;
                                const status = onlineUsers[other?.id] || 'offline';
                                return (
                                    <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group",
                                            activeChannelId === ch.id 
                                                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-700"
                                        )}>
                                        <div className="relative">
                                            <Avatar user={other} size="xs" className="rounded-lg shadow-sm" />
                                            <PresenceDot status={status} className="absolute -bottom-0.5 -right-0.5" />
                                        </div>
                                        <span className="flex-1 truncate">{other?.name}</span>
                                        {unreadCounts[ch.id] > 0 && (
                                            <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-lg px-2 py-0.5 min-w-[20px] text-center">
                                                {unreadCounts[ch.id]}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* USER PROFILE MINICARD */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar user={user} size="sm" className="rounded-xl shadow-md" />
                            <PresenceDot status="online" className="absolute -bottom-0.5 -right-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate capitalize">Active now</p>
                        </div>
                        <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all">
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Pane 3: Chat Area ─────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 shadow-2xl relative z-10">
                {activeChannelId ? (
                    <>
                        {/* HEADER */}
                        <div className="h-16 flex items-center gap-4 px-6 border-b border-slate-100 dark:border-slate-900 shrink-0">
                            {activeChannel?.type === 'direct' ? (
                                <>
                                    <div className="relative">
                                        <Avatar user={directOther} size="sm" className="rounded-xl shadow-sm" />
                                        <PresenceDot status={onlineUsers[directOther?.id] || 'offline'} className="absolute -bottom-0.5 -right-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{directOther?.name}</h3>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Hash size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{activeChannel?.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeChannel?.members?.length} members</span>
                                            {activeChannel?.description && <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />}
                                            <span className="text-xs text-slate-400 truncate max-w-[300px]">{activeChannel?.description}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="flex items-center gap-2">
                                <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-400 transition-all"><Phone size={18} /></button>
                                <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-400 transition-all"><Video size={18} /></button>
                                <button 
                                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        showInfoPanel ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                                    )}
                                >
                                    <Info size={18} />
                                </button>
                            </div>
                        </div>

                        {/* MESSAGES */}
                        <div ref={feedRef} className="flex-1 overflow-y-auto pt-8 pb-4 space-y-0.5 no-scrollbar scroll-smooth">
                            {(messages[activeChannelId] || []).map((msg, i, arr) => {
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
                                    />
                                );
                            })}
                        </div>

                        {/* FOOTER: INPUT */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-950">
                            <TypingIndicator typingUsers={typingUsers[activeChannelId]} />
                            
                            <form onSubmit={sendMsg} className="mt-1">
                                <div className="bg-[#f1f5f9] dark:bg-slate-900/80 rounded-2xl border-2 border-transparent focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-sm transition-all overflow-hidden">
                                    <textarea 
                                        value={newMessage} 
                                        onChange={handleTyping}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e); }
                                        }}
                                        placeholder={`Message #${activeChannel?.name || '...'}`}
                                        className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none p-4 resize-none max-h-32" 
                                        rows={1}
                                    />
                                    
                                    <div className="px-3 py-2 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50">
                                        <div className="flex items-center gap-1">
                                            <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><Paperclip size={18} /></button>
                                            <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><Smile size={18} /></button>
                                            <button type="button" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><AtSign size={18} /></button>
                                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                                            <button 
                                                type="button" 
                                                onClick={handleSuggestResponse}
                                                disabled={isSuggestingResponse}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all disabled:opacity-50"
                                            >
                                                <Sparkles size={14} className={cn(isSuggestingResponse && "animate-pulse")} />
                                                Magic Draft
                                            </button>
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            disabled={!newMessage.trim()}
                                            className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 disabled:opacity-30 disabled:shadow-none transition-all"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </form>
                            <p className="text-[10px] text-center text-slate-400 font-medium mt-3">
                                Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="w-24 h-24 rounded-[32px] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 animate-bounce-subtle">
                            <MessageSquare size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Welcome back, {user.name.split(' ')[0]}!</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                            Select a channel or teammate from the left to start collaborating on your next big thing.
                        </p>
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setShowNewChannel(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all">Create Channel</button>
                            <button className="px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Quick Search</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Pane 4: Info Panel ─────────────────── */}
            <AnimatePresence>
                {showInfoPanel && activeChannelId && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }} 
                        animate={{ width: 320, opacity: 1 }} 
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-y-auto no-scrollbar hidden xl:flex flex-col"
                    >
                        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-900 shrink-0">
                            <h3 className="font-bold text-slate-900 dark:text-white">Details</h3>
                            <button onClick={() => setShowInfoPanel(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><X size={18} /></button>
                        </div>
                        
                        <div className="p-8 flex flex-col items-center text-center">
                            {activeChannel?.type === 'direct' ? (
                                <>
                                    <Avatar user={directOther} size="xl" className="rounded-3xl shadow-xl mb-4" />
                                    <h4 className="font-black text-lg text-slate-900 dark:text-white mb-1">{directOther?.name}</h4>
                                    <p className="text-sm text-slate-500 mb-6">{directOther?.email}</p>
                                    
                                    <div className="w-full grid grid-cols-2 gap-3 mb-8">
                                        <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all">
                                            <Bell size={20} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mute</span>
                                        </button>
                                        <button className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all">
                                            <Globe size={20} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profile</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                                        <Hash size={40} />
                                    </div>
                                    <h4 className="font-black text-lg text-slate-900 dark:text-white mb-1">#{activeChannel?.name}</h4>
                                    <p className="text-sm text-slate-500 mb-8">Created {format(new Date(activeChannel?.createdAt || new Date()), 'MMM d, yyyy')}</p>
                                </>
                            )}
                            
                            <div className="w-full space-y-6">
                                <div className="text-left">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Description</h5>
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                        {activeChannel?.description || "No description set for this conversation."}
                                    </div>
                                </div>
                                
                                <div className="text-left">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Shortcuts</h5>
                                    <div className="space-y-1">
                                        {[
                                            { icon: <Search size={14} />, label: 'Search in chat' },
                                            { icon: <Lock size={14} />, label: 'Privacy settings' },
                                            { icon: <Users size={14} />, label: 'View members' },
                                            { icon: <ImageIcon size={14} />, label: 'Shared media' },
                                        ].map((item, i) => (
                                            <button key={i} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all group">
                                                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{item.icon}</span>
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

            {/* New channel modal */}
            <AnimatePresence>
                {showNewChannel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-white/20">
                            <div className="flex items-center justify-between mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Plus size={24} />
                                </div>
                                <button onClick={() => setShowNewChannel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Create a Channel</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Channels are where your team communicates. They’re best when organized around a topic.</p>
                            
                            <form onSubmit={createChannel} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Channel Name</label>
                                    <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                                        placeholder="e.g. project-apollo" autoFocus
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowNewChannel(false)} className="flex-1 px-6 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button>
                                    <button type="submit" className="flex-1 px-6 py-4 text-sm font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">Create Channel</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessagesPage;
