import api from './api';

export const getAttachments = (taskId) =>
    api.get(`/tasks/${taskId}/attachments`);

export const uploadAttachment = (taskId, file, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/tasks/${taskId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    });
};

export const deleteAttachment = (taskId, attachmentId) =>
    api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
