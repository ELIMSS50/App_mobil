import { isAxiosError } from 'axios';

import { medicionesConValor, type Captura } from './modelo';
import { claveMedicion } from './validacion';

export const claveEnvase = (i: number, campo: string) => `envase:${i}:${campo}`;

/**
 * Traduce un 422 del servidor a las claves de la pantalla. Las mediciones
 * llegan por índice del arreglo enviado (mediciones.N.valor): se ubican con
 * el mismo orden de medicionesConValor() que usó enviarCaptura().
 */
export function erroresDe422(error: unknown, c: Captura): { porCampo: Record<string, string>; generales: string[] } | null {
  if (!isAxiosError(error) || error.response?.status !== 422) return null;

  const errores = (error.response.data as { errors?: Record<string, string[]> })?.errors ?? {};
  const enviadas = medicionesConValor(c);
  const porCampo: Record<string, string> = {};
  const generales: string[] = [];

  for (const [clave, mensajes] of Object.entries(errores)) {
    const texto = mensajes[0];
    const med = /^mediciones\.(\d+)\./.exec(clave);
    const env = /^muestras_colectadas\.(\d+)\.(\w+)$/.exec(clave);

    if (med && enviadas[Number(med[1])]) {
      const m = enviadas[Number(med[1])];
      porCampo[claveMedicion(m.idParametro, m.numRepeticion)] = texto;
    } else if (env) {
      porCampo[claveEnvase(Number(env[1]), env[2])] = texto;
    } else {
      generales.push(texto);
    }
  }

  return { porCampo, generales };
}
