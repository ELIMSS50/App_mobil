import { Platform, type ViewStyle } from 'react-native';

// Base de la web (azul oscuro #0F172A, grises slate) más un azul agua para lo
// interactivo. Alto contraste y botones grandes: la app se usa a pleno sol y a
// veces con guantes. Todo texto de color cumple 4.5:1 sobre blanco.
export const colores = {
  /** Marca: cabeceras, botón principal, textos fuertes. */
  primario: '#0F172A',
  primarioSuave: '#1E293B',
  /** Lo que se puede tocar o está seleccionado: enlaces, pestañas, progreso. */
  acento: '#0369A1',
  acentoFondo: '#E0F2FE',
  texto: '#0F172A',
  textoSuave: '#475569',
  textoTenue: '#64748B',
  borde: '#E2E8F0',
  bordeFuerte: '#CBD5E1',
  fondo: '#F1F5F9',
  tarjeta: '#FFFFFF',
  blanco: '#FFFFFF',
  error: '#B91C1C',
  errorFondo: '#FEF2F2',
  exito: '#15803D',
  exitoFondo: '#F0FDF4',
  aviso: '#B45309',
  avisoFondo: '#FFFBEB',
};

export const espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };

export const radio = { s: 8, m: 12, l: 16, total: 999 };

export const tamanoTexto = { pequeno: 14, dato: 15, normal: 17, grande: 20, titulo: 26 };

/** Altura mínima de cualquier cosa que se toque. */
export const ALTO_TOCABLE = 56;

/** Sombra suave de las tarjetas (Android usa elevation). */
export const sombra: ViewStyle = Platform.select<ViewStyle>({
  android: { elevation: 2 },
  default: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

export type Tono = 'info' | 'exito' | 'aviso' | 'error' | 'neutro';

/** Color de texto/borde y de fondo para cada tono de aviso o insignia. */
export const tonos: Record<Tono, { color: string; fondo: string }> = {
  info: { color: colores.acento, fondo: colores.acentoFondo },
  exito: { color: colores.exito, fondo: colores.exitoFondo },
  aviso: { color: colores.aviso, fondo: colores.avisoFondo },
  error: { color: colores.error, fondo: colores.errorFondo },
  neutro: { color: colores.textoSuave, fondo: colores.fondo },
};
