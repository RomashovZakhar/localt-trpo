"use client"

import axios from 'axios';

// Выводим в консоль значение переменной окружения для отладки
console.log("NEXT_PUBLIC_API_URL from env:", process.env.NEXT_PUBLIC_API_URL);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
console.log("Effective API_URL for axios:", API_URL);

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
            // Убедимся, что URL для token/refresh формируется от базового URL API, а не от полного URL с /api в конце
            const baseApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
            const { data } = await axios.post(`${baseApiUrl}/api/token/refresh/`, {
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