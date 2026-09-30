import { isAxiosError } from 'axios';

/**
 * Un mensaje que se pueda enseñar tal cual. La API ya los manda en español;
 * aquí solo se cubre lo que no llega del servidor (sin red, caída, etc.).
 */
export function mensajeDeError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return 'No hay conexión con el servidor. Revisa tu señal o la dirección del servidor.';
    }

    const datos = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const primero = datos?.errors && Object.values(datos.errors)[0]?.[0];

    if (primero) return primero;
    if (error.response.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
    if (error.response.status >= 500) return 'El servidor tuvo un problema. Intenta más tarde.';
    if (datos?.message) return datos.message;
  }

  return 'Ocurrió un error inesperado.';
}

/** Error de un campo concreto en una respuesta 422, si lo hay. */
export function errorDeCampo(error: unknown, campo: string): string | undefined {
  if (isAxiosError(error) && error.response?.status === 422) {
    return (error.response.data as { errors?: Record<string, string[]> })?.errors?.[campo]?.[0];
  }
  return undefined;
}
