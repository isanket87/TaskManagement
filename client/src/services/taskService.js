import api from './api';

export const taskService = {
    getAll: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
    getOne: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
    create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
    update: (projectId, taskId, data) => api.put(`/projects/${projectId}/tasks/${taskId}`, data),
    delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
    getActivities: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}/activities`),
    updateStatus: (projectId, taskId, status) => api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status }),
    updatePosition: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}/position`, data),
    updateDueDate: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}/due-date`, data),
    snooze: (projectId, taskId, snoozedUntil) => api.patch(`/projects/${projectId}/tasks/${taskId}/snooze`, { snoozedUntil }),
    bulkUpdateDueDate: (taskIds, dueDate, hasDueTime) => api.patch('/tasks/bulk-due-date', { taskIds, dueDate, hasDueTime }),
    getDueDateSummary: () => api.get('/tasks/due-date-summary'),
    getUpcoming: (days = 7) => api.get(`/tasks/upcoming?days=${days}`),
    getOverdue: () => api.get('/tasks/overdue'),
    getCalendar: (month) => api.get(`/tasks/calendar?month=${month}`),
    getDashboardStats: () => api.get('/dashboard/stats'),
    getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
    createComment: (taskId, text) => api.post(`/tasks/${taskId}/comments`, { text }),
    updateComment: (taskId, commentId, text) => api.put(`/tasks/${taskId}/comments/${commentId}`, { text }),
    deleteComment: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    bulkImport: (projectId, tasks) => api.post(`/projects/${projectId}/tasks/bulk`, { tasks }),
    getAttachments: (taskId) => api.get(`/tasks/${taskId}/attachments`),
    uploadAttachment: (taskId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/tasks/${taskId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    deleteAttachment: (taskId, attachmentId) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
};
