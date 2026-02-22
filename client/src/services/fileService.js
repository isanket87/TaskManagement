import api from './api';

export const uploadFile = (data, taskId, projectId, onProgress) => {
    const form = new FormData();
    form.append('file', data);
    if (taskId) form.append('taskId', taskId);
    if (projectId) form.append('projectId', projectId);
    return api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
    });
};

export const getFile = (id) => api.get(`/files/${id}`);
export const deleteFile = (id) => api.delete(`/files/${id}`);
export const getVersions = (id) => api.get(`/files/${id}/versions`);
export const getProjectFiles = (projectId, params) =>
    api.get(`/projects/${projectId}/files`, { params });
export const getTaskFiles = (taskId) => api.get(`/tasks/${taskId}/files`);

export const getFileUrl = (storageKey) => `/api/files/${storageKey}/raw`;
export const getThumbnailUrl = (storageKey) => `/api/files/preview/${storageKey}`;
