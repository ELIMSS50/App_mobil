import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { layers, namedFlavor } from '@protomaps/basemaps';

import { carpetaRecursos, FUENTES_LOCALES, recursosDescargados } from './descargas';

const RECURSOS_REMOTOS = 'https://protomaps.github.io/basemaps-assets';
/** Para el mapa en WebView (Expo Go), que no lee archivos del teléfono. */
export const GLYPHS_REMOTOS = `${RECURSOS_REMOTOS}/fonts/{fontstack}/{range}.pbf`;
const ATRIBUCION_OSM = '© OpenStreetMap';

/** Fuente para las etiquetas de los pozos, la misma en ambos estilos. */
export const FUENTE_ETIQUETAS = 'Noto Sans Medium';

/** Local si ya se descargaron, del servidor de Protomaps si no. */
function glyphs(): { url: string; fuente: (nombre: string) => string } {
  if (recursosDescargados()) {
    return {
      url: `${carpetaRecursos.uri.replace(/\/$/, '')}/fonts/{fontstack}/{range}.pbf`,
      fuente: (nombre) => FUENTES_LOCALES[nombre] ?? nombre,
    };
  }
  return { url: `${RECURSOS_REMOTOS}/fonts/{fontstack}/{range}.pbf`, fuente: (nombre) => nombre };
}

export function fuenteEtiquetas(): string {
  return glyphs().fuente(FUENTE_ETIQUETAS);
}

/**
 * Con señal y sin mapa descargado: los mosaicos de OpenStreetMap, como en la
 * web. Su política permite verlos en línea con uso moderado, pero no
 * descargarlos para usarlos sin conexión: para eso es el .pmtiles.
 */
export function estiloEnLinea(): StyleSpecification {
  return {
    version: 8,
    glyphs: glyphs().url,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: ATRIBUCION_OSM,
      },
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': '#E2E8F0' } },
      { id: 'osm', type: 'raster', source: 'osm' },
    ],
  };
}

/** Con el mapa del proyecto en el teléfono: funciona con o sin señal. */
export function estiloSinConexion(uriPmtiles: string): StyleSpecification {
  const g = glyphs();
  const sabor = {
    ...namedFlavor('light'),
    regular: g.fuente('Noto Sans Regular'),
    bold: g.fuente('Noto Sans Medium'),
    italic: g.fuente('Noto Sans Italic'),
  };

  return {
    version: 8,
    glyphs: g.url,
    sprite: recursosDescargados()
      ? `${carpetaRecursos.uri.replace(/\/$/, '')}/sprites/v4/light`
      : `${RECURSOS_REMOTOS}/sprites/v4/light`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${uriPmtiles}`,
        attribution: ATRIBUCION_OSM,
      },
    },
    layers: layers('protomaps', sabor, { lang: 'es' }),
  };
}
