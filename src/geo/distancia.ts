// Distancia y rumbo entre dos puntos, para el pozo más cercano sin señal.
// El servidor usa el mismo radio terrestre (6 371 km) en /cercano.

const R = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

export interface Punto {
  lat: number;
  lng: number;
}

/** Metros entre dos puntos (haversine). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo inicial de a hacia b, en grados desde el norte (0–360). */
export function rumboGrados(a: Punto, b: Punto): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const DIRECCIONES = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

/** "NE" para 45°, "O" para 270°… */
export function direccion(grados: number): string {
  return DIRECCIONES[Math.round(grados / 45) % 8];
}

/** "84 m" o "2.3 km". */
export function formatoDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(metros < 10000 ? 1 : 0)} km`;
}

/** Los elementos ordenados del más cercano al más lejano, con su distancia y rumbo. */
export function ordenarPorDistancia<T extends Punto>(
  desde: Punto,
  puntos: T[],
): (T & { distancia: number; rumbo: number })[] {
  return puntos
    .map((p) => ({ ...p, distancia: distanciaMetros(desde, p), rumbo: rumboGrados(desde, p) }))
    .sort((a, b) => a.distancia - b.distancia);
}
