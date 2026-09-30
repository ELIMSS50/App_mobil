// La captura tal como vive en el teléfono antes de enviarse. En la fase 4
// esto mismo es lo que se guarda en la cola.

export interface MedicionCaptura {
  idParametro: number;
  numRepeticion: number;
  /** Como lo escribió el alumno; se normaliza al validar y al enviar. */
  valor: string;
}

/** Un envase: columna de MuestraColectada → valor. */
export type EnvaseCaptura = Record<string, string | number | boolean | null>;

export interface FotoCaptura {
  uri: string;
  width: number;
  height: number;
}

export interface Captura {
  /** Lo genera el teléfono una vez; el servidor lo usa para no duplicar. */
  uuid: string;
  proyectoId: number;
  lat: number;
  lng: number;
  alt: number | null;
  precision: number | null;
  /** Hora local al fijar la ubicación, "YYYY-MM-DD HH:mm:ss". */
  fechaHoraToma: string;
  mediciones: MedicionCaptura[];
  envases: EnvaseCaptura[];
  modoCaptura: string | null;
  observaciones: string;
  foto: FotoCaptura | null;
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha local sin zona horaria, que es como la guarda el servidor. */
export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

/** "7,2" → "7.2", sin espacios. En campo se escribe con coma o con punto. */
export function normalizarNumero(texto: string): string {
  return texto.trim().replace(/\s+/g, '').replace(',', '.');
}

/** Solo las mediciones con valor, en el orden en que se envían. */
export function medicionesConValor(c: Captura): MedicionCaptura[] {
  return c.mediciones.filter((m) => normalizarNumero(m.valor) !== '');
}
