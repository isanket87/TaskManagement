import api from './api';

export const getChannels = () => api.get('/channels');
export const createChannel = (data) => api.post('/channels', data);
export const getChannel = (id) => api.get(`/channels/${id}`);
export const updateChannel = (id, data) => api.put(`/channels/${id}`, data);
export const deleteChannel = (id) => api.delete(`/channels/${id}`);
export const addMember = (id, data) => api.post(`/channels/${id}/members`, data);
export const removeMember = (id, userId) => api.delete(`/channels/${id}/members/${userId}`);
export const markRead = (id) => api.patch(`/channels/${id}/read`);
export const getOrCreateDM = (userId) => api.get(`/direct-messages/${userId}`);
export const getUnreadCounts = () => api.get('/channels/unread-counts');

export const getMessages = (channelId, cursor) =>
    api.get(`/channels/${channelId}/messages`, { params: { cursor, limit: 50 } });
export const sendMessage = (channelId, data) => api.post(`/channels/${channelId}/messages`, data);
export const editMessage = (channelId, msgId, data) => api.put(`/channels/${channelId}/messages/${msgId}`, data);
export const deleteMessage = (channelId, msgId) => api.delete(`/channels/${channelId}/messages/${msgId}`);
export const addReaction = (channelId, msgId, emoji) =>
    api.post(`/channels/${channelId}/messages/${msgId}/reactions`, { emoji });
export const getThread = (channelId, msgId) => api.get(`/channels/${channelId}/messages/${msgId}/thread`);
export const replyToThread = (channelId, msgId, data) =>
    api.post(`/channels/${channelId}/messages/${msgId}/thread`, data);
