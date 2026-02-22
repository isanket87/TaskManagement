import api from './api';

export const getTimeEntries = (params) => api.get('/time-entries', { params });
export const getActive = () => api.get('/time-entries/active');
export const createEntry = (data) => api.post('/time-entries', data);
export const stopTimer = (id) => api.patch(`/time-entries/${id}/stop`);
export const updateEntry = (id, data) => api.put(`/time-entries/${id}`, data);
export const deleteEntry = (id) => api.delete(`/time-entries/${id}`);
export const getSummary = () => api.get('/time-entries/summary');
export const getTimesheet = (week) => api.get('/timesheets', { params: { week } });
export const exportTimesheet = (params) =>
    api.get('/timesheets/export', { params, responseType: 'blob' });
