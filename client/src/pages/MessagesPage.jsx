import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Plus, MessageSquare, Send, Smile, Paperclip, MoreVertical, Reply, Edit2, Trash2, X, Users, Lock, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import * as chatService from '../services/chatService';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../store/workspaceStore';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../hooks/useSocket';

// ── Presence dot ──────────────────────────────────────────────────────────────
const PresenceDot = ({ status }) => {
    const colors = { online: 'bg-green-400', away: 'bg-yellow-400', offline: 'bg-gray-400' };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.offline}`} />;
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ typingUsers }) => {
    if (!typingUsers?.length) return null;
    const names = typingUsers.map(u => u.userName).join(', ');
    return (
        <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary-500"
                        animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
            </span>
            <span>{names} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
        </div>
    );
};

// ── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ message, onReply, onReact, onEdit, onDelete, currentUserId }) => {
    const [showActions, setShowActions] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    if (message.deletedAt) {
        return (
            <div className="px-4 py-1">
                <span className="text-xs text-gray-400 italic">This message was deleted</span>
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
        <div className="group relative flex gap-3 px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                {message.author?.avatar
                    ? <img src={message.author.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                    : <span className="text-xs font-semibold text-primary-600">{message.author?.name?.[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{message.author?.name}</span>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                    {message.editedAt && <span className="text-xs text-gray-400 italic">(edited)</span>}
                </div>
                {editing ? (
                    <form onSubmit={handleEditSubmit} className="flex gap-2">
                        <input value={editContent} onChange={e => setEditContent(e.target.value)}
                            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" autoFocus />
                        <button type="submit" className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700">Save</button>
                        <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                    </form>
                ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{message.content}</p>
                )}

                {/* Reactions */}
                {Object.entries(reactionMap).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(reactionMap).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${users.includes(currentUserId) ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                                {emoji} <span>{users.length}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Thread replies count */}
                {message.replies?.length > 0 && (
                    <button onClick={() => onReply(message)} className="mt-1 text-xs text-primary-600 hover:underline">
                        {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>

            {/* Action bar */}
            <AnimatePresence>
                {showActions && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute right-4 top-1 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm px-1 py-0.5">
                        {['👍', '❤️', '😂', '🎉'].map(emoji => (
                            <button key={emoji} onClick={() => onReact(message.id, emoji)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm transition-colors">{emoji}</button>
                        ))}
                        <button onClick={() => onReply(message)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors" title="Reply in thread"><Reply size={14} /></button>
                        {isOwn && <>
                            <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => onDelete(message.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main MessagesPage ─────────────────────────────────────────────────────────
const MessagesPage = () => {
    const { user } = useAuthStore();
    const { channels, setChannels, activeChannelId, setActiveChannel, messages, setMessages, appendMessage,
        updateMessage, removeMessage, unreadCounts, setUnreadCounts, clearUnread, typingUsers, setTyping, setPresence, threadMessageId, setThreadMessage } = useChatStore();
    const socket = useSocket();
    const queryClient = useQueryClient();
    const workspace = useWorkspaceStore(s => s.workspace);

    const [newMessage, setNewMessage] = useState('');
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
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
            setTimeout(() => feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }), 50);
        });
        chatService.markRead(activeChannelId).catch(() => { });
        clearUnread(activeChannelId);
    }, [activeChannelId]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (feedRef.current) {
            const el = feedRef.current;
            const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            if (isAtBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages[activeChannelId]?.length]);

    // Socket subscriptions
    useEffect(() => {
        if (!socket || !activeChannelId) return;
        socket.emit('join:channel', activeChannelId);
        socket.emit('join:user', user.id);

        const onNew = ({ message }) => appendMessage(activeChannelId, message);
        const onUpdated = ({ message }) => updateMessage(activeChannelId, message);
        const onDeleted = ({ messageId }) => removeMessage(activeChannelId, messageId);
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
    }, [socket, activeChannelId]);

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

    const handleReact = async (msgId, emoji) => {
        try {
            const res = await chatService.addReaction(activeChannelId, msgId, emoji);
            const msgs = messages[activeChannelId] || [];
            const msg = msgs.find(m => m.id === msgId);
            if (!msg) return;
            const existingReaction = msg.reactions?.find(r => r.emoji === emoji && r.userId === user.id);
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

    const activeChannel = channels.find(c => c.id === activeChannelId);

    return (
        <div className="flex h-full bg-white dark:bg-gray-900">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Messages</h2>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 mb-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
                            <button onClick={() => setShowNewChannel(true)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><Plus size={14} /></button>
                        </div>
                        {isLoading && <div className="text-xs text-gray-400 px-2">Loading…</div>}
                        {channels.filter(c => c.type !== 'direct').map(ch => (
                            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${activeChannelId === ch.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <Hash size={14} />
                                <span className="flex-1 truncate">{ch.name}</span>
                                {unreadCounts[ch.id] > 0 && (
                                    <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unreadCounts[ch.id]}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {channels.filter(c => c.type === 'direct').length > 0 && (
                        <div className="px-3 mt-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct</span>
                            {channels.filter(c => c.type === 'direct').map(ch => {
                                const other = ch.members?.find(m => m.userId !== user.id);
                                return (
                                    <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${activeChannelId === ch.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                        <div className="relative">
                                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">{other?.user?.name?.[0]}</div>
                                        </div>
                                        <span className="flex-1 truncate">{other?.user?.name}</span>
                                        {unreadCounts[ch.id] > 0 && <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">{unreadCounts[ch.id]}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Message feed */}
            {activeChannelId ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <Hash size={18} className="text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{activeChannel?.name}</h3>
                        {activeChannel?.description && (
                            <span className="text-sm text-gray-500 hidden md:block">— {activeChannel.description}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <button onClick={() => setThreadMessage(activeChannelId === threadMessageId ? null : activeChannelId)}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Users size={15} />
                                <span className="hidden sm:block">{activeChannel?.members?.length} members</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={feedRef} className="flex-1 overflow-y-auto py-4 space-y-0.5">
                        {(messages[activeChannelId] || []).map(msg => (
                            <MessageBubble key={msg.id} message={msg} currentUserId={user.id}
                                onReply={setThreadMessage} onReact={handleReact}
                                onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                    </div>

                    {/* Typing indicator */}
                    <TypingIndicator typingUsers={typingUsers[activeChannelId]} />

                    {/* Input */}
                    <form onSubmit={sendMsg} className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                            <input value={newMessage} onChange={handleTyping}
                                placeholder={`Message #${activeChannel?.name || '...'}`}
                                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none" />
                            <button type="submit" disabled={!newMessage.trim()}
                                className="p-1.5 bg-primary-600 text-white rounded-lg disabled:opacity-40 hover:bg-primary-700 transition-colors">
                                <Send size={15} />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <MessageSquare size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <h3 className="text-gray-500 font-medium">Select a channel to start chatting</h3>
                    </div>
                </div>
            )}

            {/* New channel modal */}
            <AnimatePresence>
                {showNewChannel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Create Channel</h3>
                                <button onClick={() => setShowNewChannel(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
                            </div>
                            <form onSubmit={createChannel} className="space-y-4">
                                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                                    placeholder="channel-name" autoFocus
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setShowNewChannel(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700">Create</button>
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
