import api from './api';

export const workspaceService = {
    getActivities: (slug) => api.get(`/workspaces/${slug}/activities`),
};

export default workspaceService;
