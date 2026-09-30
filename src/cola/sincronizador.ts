import * as Crypto from 'expo-crypto';

import { conCache } from '@/almacen/cache';
import { enviarCaptura, obtenerFormulario } from '@/api/capturas';
import { listarPozos, listarProyectos } from '@/api/proyectos';
import { borrarFoto } from '@/captura/foto';
import { clienteConsultas } from '@/consultas';
import type { Captura } from '@/captura/modelo';
import { db } from '@/db/expo';
import { useSesion } from '@/sesion/almacen';

import { clasificar } from './clasificar';
import { useEstadoCola } from './estado';
import * as cola from './nucleo';

/** Días que se conservan las enviadas como historial en el teléfono. */
const DIAS_HISTORIAL = 30;

const usuarioActual = () => useSesion.getState().usuario?.id ?? null;

/** Relee los conteos y avisa a las pantallas que la cola cambió. */
export function refrescar(): void {
  const usuario = usuarioActual();
  useEstadoCola.setState((s) => ({
    conteo: usuario ? cola.contar(db, usuario) : { pendientes: 0, errores: 0, porProyecto: {} },
    version: s.version + 1,
  }));
}

export function guardarEnCola(captura: Captura, proyectoNombre: string | null): number {
  const usuario = usuarioActual();
  if (!usuario) throw new Error('Sin sesión');
  const id = cola.encolar(db, captura, usuario, proyectoNombre);
  refrescar();
  return id;
}

export function corregirEnCola(id: number, captura: Captura): boolean {
  const ok = cola.actualizar(db, id, captura);
  refrescar();
  return ok;
}

export function descartarDeCola(id: number): boolean {
  const fila = cola.obtener(db, id);
  const ok = cola.descartar(db, id);
  if (ok && fila) borrarFoto(fila.captura.foto);
  refrescar();
  return ok;
}

export const filaDeCola = (id: number) => cola.obtener(db, id);
export const filasDeCola = (proyectoId?: number) => {
  const usuario = usuarioActual();
  return usuario ? cola.listar(db, usuario, proyectoId) : [];
};

/** Al abrir la app, antes de la primera sincronización. */
export function prepararCola(): void {
  cola.reiniciarEnviando(db);
  cola.limpiarEnviadas(db, DIAS_HISTORIAL);
  refrescar();
}

let enCurso: Promise<void> | null = null;

/**
 * Envía la cola y, si hubo red, actualiza la copia local de proyectos, pozos
 * y formularios para poder trabajar sin señal. Nunca corre dos veces a la vez:
 * una segunda llamada espera a la que está en curso.
 */
export function sincronizar(opciones: { catalogos?: boolean } = {}): Promise<void> {
  if (!enCurso) {
    enCurso = ejecutar(opciones.catalogos ?? true).finally(() => {
      enCurso = null;
    });
  }
  return enCurso;
}

async function ejecutar(catalogos: boolean): Promise<void> {
  const usuario = usuarioActual();
  if (!usuario) return;

  useEstadoCola.setState({ sincronizando: true });
  try {
    const resumen = await cola.procesar(db, usuario, {
      enviar: enviarCaptura,
      clasificar,
      nuevoUuid: Crypto.randomUUID,
      alEnviar: (fila) => borrarFoto(fila.captura.foto),
      alCambiar: refrescar,
    });

    useEstadoCola.setState({ aviso: resumen.detenida ? resumen.mensaje : null });

    if (resumen.enviadas) clienteConsultas.invalidateQueries({ queryKey: ['muestras'] });
    if (catalogos && !resumen.detenida) {
      await actualizarCatalogos();
      clienteConsultas.invalidateQueries({ queryKey: ['proyectos'] });
      clienteConsultas.invalidateQueries({ queryKey: ['pozos'] });
      clienteConsultas.invalidateQueries({ queryKey: ['formulario'] });
    }

    if (!resumen.detenida) useEstadoCola.setState({ ultimaSincronizacion: new Date().toISOString() });
  } finally {
    useEstadoCola.setState({ sincronizando: false });
    refrescar();
  }
}

/** Deja en el teléfono lo necesario para capturar sin señal en cada proyecto. */
async function actualizarCatalogos(): Promise<void> {
  try {
    const { datos: proyectos, desdeCache } = await conCache('proyectos', listarProyectos);
    if (desdeCache) return;
    for (const p of proyectos) {
      await conCache(`pozos_${p.id}`, () => listarPozos(p.id));
      await conCache(`formulario_${p.id}`, () => obtenerFormulario(p.id));
    }
  } catch {
    // Sin red a medio camino: se completa en la siguiente sincronización.
  }
}
