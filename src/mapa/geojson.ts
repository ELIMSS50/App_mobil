import type { Pozo } from '@/api/tipos';

/** Pozos como GeoJSON para la capa del mapa. */
export function pozosGeoJSON(pozos: Pozo[], idCercano: number | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: pozos.map((p) => ({
      type: 'Feature',
      id: p.idPuntoMuestreo,
      properties: { id: p.idPuntoMuestreo, clave: p.clave_identificacion, cercano: p.idPuntoMuestreo === idCercano },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  };
}

/** Círculo de `metros` alrededor de un punto, para dibujar el radio de tolerancia. */
export function circulo(lat: number, lng: number, metros: number, lados = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const dLat = metros / 111320;
  const dLng = metros / (111320 * Math.cos((lat * Math.PI) / 180));
  const anillo: [number, number][] = [];
  for (let i = 0; i <= lados; i++) {
    const a = (i / lados) * 2 * Math.PI;
    anillo.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [anillo] } };
}

/** Recuadro [oeste, sur, este, norte] de los pozos, o null si no hay. */
export function recuadro(pozos: Pozo[]): [number, number, number, number] | null {
  if (pozos.length === 0) return null;
  const lats = pozos.map((p) => p.lat);
  const lngs = pozos.map((p) => p.lng);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** Descarta coordenadas imposibles (p. ej. lat/lng capturadas al revés). */
export function coordenadasValidas(p: { lat: number; lng: number }): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}
