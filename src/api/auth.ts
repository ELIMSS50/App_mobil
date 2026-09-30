import * as Device from 'expo-device';

import { api } from './cliente';
import type { RespuestaLogin, Usuario } from './tipos';

export interface DatosLogin {
  email: string;
  password: string;
  code?: string;
  recovery_code?: string;
}

/** Nombre con el que el token aparece en el servidor, p. ej. "Google Pixel 7". */
function nombreDelDispositivo(): string {
  const nombre = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ');
  return (nombre || 'Android').slice(0, 100);
}

export async function iniciarSesion(datos: DatosLogin): Promise<RespuestaLogin> {
  const { data } = await api.post<RespuestaLogin>('/auth/login', {
    ...datos,
    device_name: nombreDelDispositivo(),
  });
  return data;
}

export async function cerrarSesionEnServidor(): Promise<void> {
  await api.post('/auth/logout');
}

export async function obtenerUsuario(): Promise<Usuario> {
  const { data } = await api.get<Usuario>('/me');
  return data;
}
