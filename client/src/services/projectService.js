import api from './api';

export const projectService = {
    getAll: () => api.get('/projects'),
    getOne: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getMembers: (id) => api.get(`/projects/${id}/members`),
    addMember: (id, data) => api.post(`/projects/${id}/members`, data),
    removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
    getActivity: (id) => api.get(`/projects/${id}/activity`),
    getAnalytics: (id) => api.get(`/projects/${id}/analytics`),
    searchUsers: (q) => api.get(`/users/search?q=${q}`),
};
