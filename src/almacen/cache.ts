import { isAxiosError } from 'axios';

import { db } from '@/db/expo';

// Copia local de lo último que llegó del servidor (proyectos, pozos,
// formulario), para trabajar sin señal. Vive en la tabla `cache` de SQLite.

export interface ConOrigen<T> {
  datos: T;
  /** true si no hubo red y los datos vienen de la copia del teléfono. */
  desdeCache: boolean;
  /** Cuándo se guardó la copia (ISO). */
  guardado: string;
}

interface Guardado<T> {
  guardado: string;
  datos: T;
}

export function leerCache<T>(clave: string): Guardado<T> | null {
  try {
    const r = db.uno<{ datos: string; guardado: string }>('SELECT datos, guardado FROM cache WHERE clave = ?', clave);
    return r ? { guardado: r.guardado, datos: JSON.parse(r.datos) as T } : null;
  } catch {
    return null;
  }
}

export function guardarCache<T>(clave: string, datos: T): void {
  db.run(
    'INSERT INTO cache (clave, datos, guardado) VALUES (?, ?, ?) ON CONFLICT (clave) DO UPDATE SET datos = excluded.datos, guardado = excluded.guardado',
    clave,
    JSON.stringify(datos),
    new Date().toISOString(),
  );
}

export function borrarDeCache(clave: string): void {
  db.run('DELETE FROM cache WHERE clave = ?', clave);
}

/** Al cerrar sesión: lo guardado con una cuenta no debe verlo la siguiente. */
export function borrarCache(): void {
  db.run('DELETE FROM cache');
}

/** Sin respuesta del servidor (sin red, timeout) o el servidor falló (5xx). */
export function esFalloDeRed(error: unknown): boolean {
  return isAxiosError(error) && (!error.response || error.response.status >= 500);
}

/**
 * Pide al servidor y guarda la copia. Si no hay red (o el servidor no
 * responde), devuelve la última copia; si tampoco hay copia, falla con el
 * error original. Un 4xx sí se propaga: los datos ya no son válidos.
 */
export async function conCache<T>(clave: string, pedir: () => Promise<T>): Promise<ConOrigen<T>> {
  try {
    const datos = await pedir();
    guardarCache(clave, datos);
    return { datos, desdeCache: false, guardado: new Date().toISOString() };
  } catch (error) {
    const copia = esFalloDeRed(error) ? leerCache<T>(clave) : null;
    if (copia) return { datos: copia.datos, desdeCache: true, guardado: copia.guardado };
    throw error;
  }
}
