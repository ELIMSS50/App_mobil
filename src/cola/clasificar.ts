import { isAxiosError } from 'axios';

import { esFalloDeRed } from '@/almacen/cache';
import { mensajeDeError } from '@/api/errores';
import { erroresDe422 } from '@/captura/erroresServidor';
import type { Captura } from '@/captura/modelo';

import type { Fallo } from './nucleo';

/** Traduce un error del envío a lo que la cola hace con él (ver nucleo.ts). */
export function clasificar(error: unknown, captura: Captura): Fallo {
  if (esFalloDeRed(error)) {
    return { tipo: 'sin-red', mensaje: isAxiosError(error) && error.response ? 'El servidor no respondió bien.' : 'Sin conexión.' };
  }

  const estado = isAxiosError(error) ? error.response?.status : undefined;

  if (estado === 401) return { tipo: 'sesion', mensaje: 'La sesión se cerró. Vuelve a entrar para enviar.' };
  if (estado === 409) return { tipo: 'conflicto', mensaje: 'Identificador repetido; se reintenta con otro.' };
  if (estado === 429) return { tipo: 'sin-red', mensaje: 'Demasiados envíos seguidos; se reintenta en un momento.' };

  const de422 = erroresDe422(error, captura);
  if (de422) {
    return {
      tipo: 'rechazo',
      mensaje: de422.generales[0] ?? 'El servidor pidió corregir algunos valores.',
      porCampo: de422.porCampo,
    };
  }

  // 403 (sin permiso), 404 (el proyecto ya no existe o te dieron de baja)…
  return { tipo: 'rechazo', mensaje: mensajeDeError(error) };
}
