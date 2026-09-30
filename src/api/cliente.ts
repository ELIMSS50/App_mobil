import axios, { isAxiosError } from 'axios';

import { API_URL } from '@/config';
import { useSesion } from '@/sesion/almacen';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useSesion.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 con sesión quiere decir que el token ya no vale (se cerró la sesión
// desde otro lado o se revocó): se olvida y la navegación regresa al login.
// En el login mismo un 401 son credenciales incorrectas, no una sesión vencida.
api.interceptors.response.use(undefined, async (error) => {
  if (isAxiosError(error) && error.response?.status === 401 && error.config?.headers?.Authorization) {
    await useSesion.getState().olvidar();
  }
  return Promise.reject(error);
});
