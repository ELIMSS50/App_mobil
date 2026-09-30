// Misma regla que el servidor (App\Services\LimitesParametros): fuera de
// hard se rechaza, fuera de warn se avisa y se guarda marcado. Aplicarla en
// el teléfono evita enterarse del rechazo ya de regreso del campo.
//
// Sin imports con alias: se prueba con `node --test` (captura/validacion.test.ts).

import type { Captura } from './modelo.ts';
import { medicionesConValor, normalizarNumero } from './modelo.ts';

export type Rango = [number | null, number | null];

export type Resultado = 'ok' | 'advertencia' | 'rechazo' | 'no-numerico' | 'vacio';

export interface LimitesParametro {
  id: number;
  nombre: string;
  unidad: string | null;
  warn: Rango;
  hard: Rango;
}

const fuera = (v: number, [min, max]: Rango) => (min !== null && v < min) || (max !== null && v > max);
const tieneLimites = (p: LimitesParametro) => [...p.warn, ...p.hard].some((l) => l !== null);

export function evaluar(texto: string, p: LimitesParametro): Resultado {
  const valor = normalizarNumero(texto);
  if (valor === '') return 'vacio';

  const numero = Number(valor);
  if (!Number.isFinite(numero)) return tieneLimites(p) ? 'no-numerico' : 'ok';

  if (fuera(numero, p.hard)) return 'rechazo';
  if (fuera(numero, p.warn)) return 'advertencia';
  return 'ok';
}

/** "0 a 14", "hasta 60", "desde −5". */
export function textoRango([min, max]: Rango, unidad?: string | null): string {
  const u = unidad ? ` ${unidad}` : '';
  if (min !== null && max !== null) return `${min} a ${max}${u}`;
  if (min !== null) return `desde ${min}${u}`;
  if (max !== null) return `hasta ${max}${u}`;
  return '';
}

export function mensaje(resultado: Resultado, p: LimitesParametro): string | null {
  switch (resultado) {
    case 'rechazo':
      return `Fuera del rango posible (${textoRango(p.hard, p.unidad)}). Revisa el valor.`;
    case 'advertencia':
      return `Fuera del rango normal (${textoRango(p.warn, p.unidad)}). Se guardará marcado; confírmalo.`;
    case 'no-numerico':
      return 'Escribe un número.';
    default:
      return null;
  }
}

export interface Revision {
  /** Lo que impide guardar, por clave ("medicion:<idParametro>:<rep>", "mediciones", "ubicacion"). */
  errores: Record<string, string>;
  /** Mediciones fuera del rango normal: se puede guardar. */
  advertencias: Record<string, string>;
}

export const claveMedicion = (idParametro: number, rep: number) => `medicion:${idParametro}:${rep}`;

export function revisarCaptura(c: Captura, parametros: LimitesParametro[]): Revision {
  const errores: Record<string, string> = {};
  const advertencias: Record<string, string> = {};
  const porId = new Map(parametros.map((p) => [p.id, p]));

  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
    errores.ubicacion = 'Falta la ubicación GPS.';
  }

  for (const m of c.mediciones) {
    const p = porId.get(m.idParametro);
    if (!p) continue;
    const r = evaluar(m.valor, p);
    const texto = mensaje(r, p);
    if (!texto) continue;
    (r === 'advertencia' ? advertencias : errores)[claveMedicion(m.idParametro, m.numRepeticion)] = texto;
  }

  if (medicionesConValor(c).length === 0) {
    errores.mediciones = 'Captura al menos una medición.';
  }

  return { errores, advertencias };
}
