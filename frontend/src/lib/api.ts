import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL;


const api = axios.create({
  baseURL: API_BASE,
});

// This is the key part: the interceptor attaches the token to every request.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  username?: string;
  email?: string;
  password: string;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

// All functions below are now updated to use the secure 'api' instance.

export async function userSignup(payload: SignupPayload) {
  const res = await api.post(`/user/signup`, payload);
  return res.data;
}

export async function userLogin(payload: LoginPayload) {
  const res = await api.post(`/user/login`, payload);
  return res.data;
}

export async function googleLogin(idToken: string) {
  const res = await api.post(`/user/google`, { idToken });
  return res.data;
}

export async function adminLogin(payload: AdminLoginPayload) {
  const res = await api.post(`/admin/login`, payload);
  return res.data;
}

export async function fetchAllUsers(token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.get(`/admin/users`, { headers });
  return res.data;
}

export async function updateUserPlan(id: number, plan: string, messageLimit: number, emailLimit: number, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.patch(`/admin/users/${id}/plan`, {
    plan, messageLimit, emailLimit
  }, { headers });
  return res.data;
}

export async function toggleUserActive(id: number, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.patch(`/admin/users/${id}/activate`, {}, { headers });
  return res.data;
}

export async function resetUserLimits(id: number, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.patch(`/admin/users/${id}/reset-limits`, {}, { headers });
  return res.data;
}

export async function toggleUserPlan(id: number, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.patch(`/admin/users/${id}/toggle-plan`, {}, { headers });
  return res.data;
}

export async function updateAdminPassword(currentPassword: string, newPassword: string, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.patch(`/admin/password`, {
    currentPassword,
    newPassword
  }, { headers });
  return res.data;
}

export async function fetchCurrentUser(_token: string) {
  const res = await api.get(`/user/me`);
  return res.data;
}

export async function getUserLimits() {
  const res = await api.get(`/user/limits`);
  return res.data;
}

export async function analyzeExcelWithAI(file: File, prompt: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prompt', prompt);
  const res = await api.post(`/ai/analyze-excel`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
} 

// New Error Trend Detector API functions
export const analyzeExcelForErrorsAndTrends = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/error-trend/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const getErrorTrendAnalysisById = async (id: string) => {
    const res = await api.get(`/error-trend/analysis/${id}`);
    return res.data;
};

export const getLatestErrorTrendAnalysis = async () => {
    const res = await api.get(`/error-trend/latest`);
    return res.data;
};

export const deleteErrorTrendAnalysis = async (id: number) => {
    await api.delete(`/error-trend/analysis/${id}`);
};

export const getChatHistory = async (chatId: number, toolType?: string) => {
    const url = toolType ? `/chat/history/${chatId}?toolType=${toolType}` : `/chat/history/${chatId}`;
    const res = await api.get(url);
    return res.data;
};

export const getLatestChatByToolType = async (toolType: 'formula_master' | 'sheet_summarizer') => {
    const res = await api.get(`/chat/latest?toolType=${toolType}`);
    return res.data;
};

export const explainFormulaWithChat = async (chatId: number | null, prompt: { formula?: string, description?: string }) => {
    const res = await api.post(`/ai/formula/explain`, { chatId, ...prompt });
    return res.data;
};

export const analyzeExcelWithChat = async (chatId: number | null, file: File, prompt: string) => {
    const formData = new FormData();
    if (chatId) formData.append('chatId', String(chatId));
    formData.append('file', file);
    formData.append('prompt', prompt);
    const res = await api.post(`/ai/analyze-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const deleteChatById = async (chatId: number) => {
    await api.delete(`/chat/${chatId}`);
}; 

// Offer Letter APIs
export const OfferLetterAPI = {
  create: async (payload: { title?: string; data: any; logo?: string }) => {
    const res = await api.post(`/smartdocs/offer-letters`, payload);
    return res.data;
  },
  list: async () => {
    const res = await api.get(`/smartdocs/offer-letters`);
    return res.data;
  },
  get: async (id: number) => {
    const res = await api.get(`/smartdocs/offer-letters/${id}`);
    return res.data;
  },
};

// Bulkmailer Smart Templates API
export const SmartTemplateAPI = {
  list: async (params?: any) => {
    const res = await api.get(`/bulkmailer/smart-templates`, { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await api.get(`/bulkmailer/smart-templates/${id}`);
    return res.data;
  },
  create: async (payload: { title: string; subject?: string; description?: string; body: string; category?: string; isPublic?: boolean }) => {
    const res = await api.post(`/bulkmailer/smart-templates`, payload);
    return res.data;
  },
  update: async (id: number, payload: any) => {
    const res = await api.patch(`/bulkmailer/smart-templates/${id}`, payload);
    return res.data;
  },
  remove: async (id: number) => {
    const res = await api.delete(`/bulkmailer/smart-templates/${id}`);
    return res.data;
  },
  aiEdit: async (id: number | null, instruction: string, meta?: any) => {
    const path = id ? `/bulkmailer/smart-templates/ai-edit/${id}` : `/bulkmailer/smart-templates/ai-edit`;
    const res = await api.post(path, { instruction, ...meta });
    return res.data;
  },
  getUserTitles: async () => {
    const res = await api.get(`/bulkmailer/smart-templates/titles/user`);
    return res.data;
  }
};