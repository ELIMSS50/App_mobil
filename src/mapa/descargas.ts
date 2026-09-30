import { Directory, File, Paths } from 'expo-file-system';

import { infoMapa, listarRecursosMapa } from '@/api/proyectos';
import { useSesion } from '@/sesion/almacen';

// Mapas sin conexión: un .pmtiles por proyecto más las fuentes y sprites del
// estilo, que se bajan una sola vez y comparten todos los mapas.
//
//   documentos/mapas/proyecto_12.pmtiles
//   documentos/mapas/proyecto_12.json        (metadatos de lo descargado)
//   documentos/mapas/recursos/fonts/NotoSans-Regular/0-255.pbf
//   documentos/mapas/recursos/sprites/v4/light.json …

const carpetaMapas = new Directory(Paths.document, 'mapas');
export const carpetaRecursos = new Directory(carpetaMapas, 'recursos');

/**
 * Las fuentes se guardan sin espacios ("Noto Sans Regular" → "NotoSans-Regular")
 * para que la URL file:// de las fuentes no dependa de cómo MapLibre codifica
 * los espacios. El estilo usa los mismos nombres (ver estilo.ts).
 */
export const FUENTES_LOCALES: Record<string, string> = {
  'Noto Sans Regular': 'NotoSans-Regular',
  'Noto Sans Medium': 'NotoSans-Medium',
  'Noto Sans Italic': 'NotoSans-Italic',
};

export interface MapaDescargado {
  uri: string;
  bytes: number;
  maxzoom: number;
  bbox: [number, number, number, number];
  /** Fecha en que el servidor generó el mapa: si cambia, hay versión nueva. */
  generado: string;
  descargado: string;
}

const archivoMapa = (id: number) => new File(carpetaMapas, `proyecto_${id}.pmtiles`);
const archivoMeta = (id: number) => new File(carpetaMapas, `proyecto_${id}.json`);

export function mapaDescargado(id: number): MapaDescargado | null {
  try {
    const meta = archivoMeta(id);
    const mapa = archivoMapa(id);
    if (!meta.exists || !mapa.exists) return null;
    return { ...(JSON.parse(meta.textSync()) as Omit<MapaDescargado, 'uri'>), uri: mapa.uri };
  } catch {
    return null;
  }
}

export function recursosDescargados(): boolean {
  return new File(carpetaRecursos, 'listo').exists;
}

export function borrarMapa(id: number): void {
  for (const f of [archivoMapa(id), archivoMeta(id)]) {
    if (f.exists) f.delete();
  }
}

function encabezados(): Record<string, string> {
  const token = useSesion.getState().token;
  return token ? { Authorization: `Bearer ${token}`, Accept: '*/*' } : {};
}

function asegurarCarpeta(d: Directory) {
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
}

/** Ruta local de un recurso, con el nombre de fuente sin espacios. */
function destinoRecurso(ruta: string): File {
  const partes = ruta.split('/');
  if (partes[0] === 'fonts' && FUENTES_LOCALES[partes[1]]) partes[1] = FUENTES_LOCALES[partes[1]];
  return new File(carpetaRecursos, ...partes);
}

export interface Progreso {
  etapa: 'recursos' | 'mapa';
  bytes: number;
  total: number;
}

/**
 * Descarga (o actualiza) el mapa del proyecto. Baja primero a un temporal y
 * reemplaza al final: si se corta la señal a medias, el mapa anterior sigue
 * sirviendo.
 */
export async function descargarMapa(
  id: number,
  alProgresar: (p: Progreso) => void,
  senal?: AbortSignal,
): Promise<MapaDescargado> {
  const info = await infoMapa(id);
  if (!info.disponible) throw new Error(info.message);

  if (!recursosDescargados()) {
    const recursos = await listarRecursosMapa();
    const total = recursos.archivos.reduce((s, a) => s + a.bytes, 0);
    let bajado = 0;

    for (const r of recursos.archivos) {
      const destino = destinoRecurso(r.ruta);
      asegurarCarpeta(destino.parentDirectory);
      await File.downloadFileAsync(r.url, destino, { headers: encabezados(), idempotent: true, signal: senal });
      bajado += r.bytes;
      alProgresar({ etapa: 'recursos', bytes: bajado, total });
    }

    // Sin todas las fuentes el mapa se ve sin nombres: solo se marca listo
    // cuando el servidor las tenía completas.
    if (recursos.completos) {
      const listo = new File(carpetaRecursos, 'listo');
      if (!listo.exists) listo.create();
    }
  }

  asegurarCarpeta(carpetaMapas);
  const temporal = new File(carpetaMapas, `proyecto_${id}.descargando`);
  if (temporal.exists) temporal.delete();

  await File.downloadFileAsync(info.archivo_url, temporal, {
    headers: encabezados(),
    signal: senal,
    onProgress: ({ bytesWritten, totalBytes }) =>
      alProgresar({ etapa: 'mapa', bytes: bytesWritten, total: totalBytes > 0 ? totalBytes : info.bytes }),
  });

  const final = archivoMapa(id);
  if (final.exists) final.delete();
  temporal.move(final);

  const meta: Omit<MapaDescargado, 'uri'> = {
    bytes: info.bytes,
    maxzoom: info.maxzoom,
    bbox: info.bbox,
    generado: info.generado,
    descargado: new Date().toISOString(),
  };
  const archivo = archivoMeta(id);
  if (!archivo.exists) archivo.create();
  archivo.write(JSON.stringify(meta));

  return { ...meta, uri: final.uri };
}
