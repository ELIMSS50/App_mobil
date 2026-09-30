// Conversión geográficas → UTM en el teléfono, para mostrarla sin señal.
// Es la misma fórmula que CoordenadasHelper::latLngToUtm del backend
// (WGS84, zona calculada por punto): el servidor sigue siendo la fuente de
// lo que se guarda, esto solo evita mostrar un UTM distinto al de la web.

const A = 6378137.0; // semieje mayor WGS84
const F = 1 / 298.257223563; // achatamiento WGS84
const K0 = 0.9996;

export interface Utm {
  x: number;
  y: number;
  zona: string;
}

const rad = (g: number) => (g * Math.PI) / 180;
const redondear = (v: number) => Math.round(v * 100) / 100;

/** null fuera del rango de UTM (|lat| > 84) o con coordenadas inválidas. */
export function latLngAUtm(lat: number, lng: number): Utm | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 84 || Math.abs(lng) > 180) {
    return null;
  }

  const zona = Math.floor((lng + 180) / 6) + 1;
  const norte = lat >= 0;

  const latR = rad(lat);
  const lngR = rad(lng);
  const lon0R = rad((zona - 1) * 6 - 180 + 3);

  const e = Math.sqrt(F * (2 - F));
  const e2 = e ** 2 / (1 - e ** 2);

  const n = A / Math.sqrt(1 - e ** 2 * Math.sin(latR) ** 2);
  const t = Math.tan(latR) ** 2;
  const c = e2 * Math.cos(latR) ** 2;
  const a = Math.cos(latR) * (lngR - lon0R);

  const m =
    A *
    ((1 - e ** 2 / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256) * latR -
      ((3 * e ** 2) / 8 + (3 * e ** 4) / 32 + (45 * e ** 6) / 1024) * Math.sin(2 * latR) +
      ((15 * e ** 4) / 256 + (45 * e ** 6) / 1024) * Math.sin(4 * latR) -
      ((35 * e ** 6) / 3072) * Math.sin(6 * latR));

  const x =
    K0 * n * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t ** 2 + 72 * c - 58 * e2) * a ** 5) / 120) + 500000;

  let y =
    K0 *
    (m +
      n *
        Math.tan(latR) *
        (a ** 2 / 2 +
          ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24 +
          ((61 - 58 * t + t ** 2 + 600 * c - 330 * e2) * a ** 6) / 720));

  if (!norte) y += 10000000;

  return { x: redondear(x), y: redondear(y), zona: `${zona}${norte ? 'N' : 'S'}` };
}

/** "UTM 14N 312,456 E · 2,451,789 N" — siempre con zona (ver el reporte, §2.3). */
export function formatoUtm(utm: Utm | null): string {
  if (!utm) return 'UTM no disponible';
  const miles = (v: number) => Math.round(v).toLocaleString('en-US');
  return `UTM ${utm.zona} ${miles(utm.x)} E · ${miles(utm.y)} N`;
}
