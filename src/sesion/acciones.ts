import { isAxiosError } from 'axios';

import { cerrarSesionEnServidor } from '@/api/auth';

import { useSesion } from './almacen';

/** Revoca el token en el servidor, si hay red, y lo borra del teléfono. */
export async function cerrarSesion(): Promise<void> {
  try {
    await cerrarSesionEnServidor();
  } catch (error) {
    // Sin red el token queda vivo en el servidor (se puede revocar desde la
    // web). Ningún error de red debe impedir salir.
    if (!isAxiosError(error)) throw error;
  }
  await useSesion.getState().olvidar();
}
