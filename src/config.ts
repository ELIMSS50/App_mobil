/**
 * URL base de la API. Se define en .env.local (ver .env.example) y queda
 * fija dentro del APK al compilar.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1').replace(/\/+$/, '');
