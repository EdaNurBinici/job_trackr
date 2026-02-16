import axios from 'axios';
import type { Application, AuthResponse, DashboardStats, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'https://jobtrackr-production-029f.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/register', { email, password }),
  
  login: (email: string, password: string) =>
    api.post<{ data: AuthResponse }>('/auth/login', { email, password }),
};

// Applications API
export const applicationsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<{ data: Application[] }>('/applications', { params }),
  
  getById: (id: string) =>
    api.get<{ data: Application }>(`/applications/${id}`),
  
  create: (data: Partial<Application>) =>
    api.post<{ data: Application }>('/applications', data),
  
  update: (id: string, data: Partial<Application>) =>
    api.put<{ data: Application }>(`/applications/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/applications/${id}`),
  
  updateStatus: (id: string, status: string) =>
    api.patch<{ data: Application }>(`/applications/${id}/status`, { status }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    api.get<{ data: DashboardStats }>('/dashboard/stats'),
  
  getActivity: () =>
    api.get<{ data: Application[] }>('/dashboard/activity'),
};

// Admin API
export const adminApi = {
  getUsers: () =>
    api.get<{ data: User[] }>('/admin/users'),
  
  getStats: () =>
    api.get<{ data: any }>('/admin/stats'),
  
  getAuditLog: () =>
    api.get<{ data: any[] }>('/admin/audit'),
};

// CV API
export const cvApi = {
  upload: (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<{ data: any }>('/cv/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  getById: (id: string) =>
    api.get<{ data: any }>(`/cv/${id}`),
  
  getUserCVs: () =>
    api.get<{ data: any[] }>('/cv/user/list'),
  
  delete: (id: string) =>
    api.delete(`/cv/${id}`),
};

// CV Analysis API
export const cvAnalysisApi = {
  analyze: (data: { cvFileId: string; jobDescription: string; jobUrl?: string }) =>
    api.post<{ data: any }>('/cv-analysis', data),
  
  getById: (id: string) =>
    api.get<{ data: any }>(`/cv-analysis/${id}`),
  
  getUserAnalyses: () =>
    api.get<{ data: any[] }>('/cv-analysis/user/list'),
  
  delete: (id: string) =>
    api.delete(`/cv-analysis/${id}`),
  
  getJobStatus: (jobId: string) =>
    api.get<{ data: any }>(`/cv-analysis/job/${jobId}`),
  
  getUserStats: () =>
    api.get<{ data: any }>('/cv-analysis/user/stats'),
};

// Application Analysis API (Sprint 1)
export const applicationAnalysisApi = {
  analyzeApplication: (applicationId: string, cvFileId: string, language: string = 'tr') =>
    api.post<{ data: any }>(`/ai/analyze-application/${applicationId}`, { cvFileId, language }),
  
  getAnalysis: (applicationId: string) =>
    api.get<{ data: any }>(`/ai/application-analysis/${applicationId}`),
  
  getMyAnalyses: (limit?: number) =>
    api.get<{ data: any[] }>('/ai/my-analyses', { params: { limit } }),
  
  getStats: () =>
    api.get<{ data: any }>('/ai/analysis-stats'),
};

export default api;
