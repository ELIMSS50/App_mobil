import { borrarDeCache, guardarCache, leerCache } from '@/almacen/cache';

import type { Captura } from './modelo';

// La captura a medio llenar se guarda a cada cambio: si la app se cierra, se
// acaba la batería o falla el envío, al volver sigue ahí. En la fase 4 las
// capturas terminadas pasan a la cola; esto queda para la que se está llenando.

const clave = (proyectoId: number) => `borrador_${proyectoId}`;

export function leerBorrador(proyectoId: number): Captura | null {
  return leerCache<Captura>(clave(proyectoId))?.datos ?? null;
}

export function guardarBorrador(c: Captura): void {
  guardarCache(clave(c.proyectoId), c);
}

export function borrarBorrador(proyectoId: number): void {
  borrarDeCache(clave(proyectoId));
}
