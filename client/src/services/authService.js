import api from './api';

export const authService = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    refresh: () => api.post('/auth/refresh'),
    verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
    resendVerification: () => api.post('/auth/resend-verification'),
};

