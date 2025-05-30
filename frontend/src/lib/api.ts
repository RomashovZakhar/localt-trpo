"use client"

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Если код выполняется в браузере, добавляем интерцепторы
if (typeof window !== 'undefined') {
  // Добавляем интерцептор для добавления токена аутентификации
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Интерцептор для обновления токена
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (
        error.response?.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${API_URL}/token/refresh/`, {
              refresh: refreshToken,
            });
            
            localStorage.setItem('accessToken', data.access);
            api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
            
            return api(originalRequest);
          } catch (refreshError) {
            // Если не удалось обновить токен, перенаправляем на страницу входа
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
}

export default api; 