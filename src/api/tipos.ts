// Respuestas de la API v1. Contrato completo en docs/API.md.

export type Rol = 'ALUMNO' | 'PROFESOR' | 'ADMIN';

export interface Usuario {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: Rol;
}

export interface LoginExitoso {
  token: string;
  token_type: 'Bearer';
  user: Usuario;
  abilities: string[];
}

/** Con 2FA activo, la contraseña sola responde esto y no trae token. */
export interface LoginRequiere2fa {
  requiere_2fa: true;
  message: string;
}

export type RespuestaLogin = LoginExitoso | LoginRequiere2fa;

export interface Utm {
  x: number;
  y: number;
  zona: string;
  datum: 'WGS84';
}

export interface Proyecto {
  id: number;
  nombre: string;
  esta_activo: boolean;
  radio_tolerancia_metros: number;
}

export interface PuntoDeProyecto {
  id: number;
  clave: string;
  latitud: number | null;
  longitud: number | null;
  altitud: number | null;
  utm: Utm | null;
  descripcion: string | null;
}

export interface DetalleProyecto {
  id: number;
  nombre: string;
  radio_tolerancia_metros: number | null;
  puntos_muestreo: PuntoDeProyecto[];
}

/** Pozo para el mapa (GET /proyectos/{id}/puntos-muestreo). */
export interface Pozo {
  idPuntoMuestreo: number;
  clave_identificacion: string;
  nombre_aprovechamiento_local: string | null;
  descripcion_sitio_colecta: string | null;
  lat: number;
  lng: number;
  alt: number | null;
  utm: Utm | null;
}

export interface PozosDeProyecto {
  radio_metros: number;
  total: number;
  puntos: Pozo[];
}

export type InfoMapa =
  | { disponible: false; message: string }
  | {
      disponible: true;
      bytes: number;
      maxzoom: number;
      bbox: [number, number, number, number];
      generado: string;
      archivo_url: string;
    };

export interface RecursosMapa {
  completos: boolean;
  archivos: { ruta: string; bytes: number; url: string }[];
}

// ── Captura (GET /proyectos/{id}/formulario, POST /proyectos/{id}/muestras) ──

export type TipoCampo = 'datetime' | 'enum' | 'text' | 'number' | 'bool' | string;

export interface CampoFormulario {
  tabla: 'Muestra' | 'MuestraColectada' | string;
  campo: string;
  label: string;
  tipo: TipoCampo;
  opciones?: string[];
}

/** [min, max]; cualquier extremo puede faltar (null). */
export type Rango = [number | null, number | null];

export interface ParametroFormulario {
  id: number;
  nombre: string;
  unidad: string | null;
  warn: Rango;
  hard: Rango;
}

export interface Formulario {
  proyecto_id: number;
  campos_configurados: boolean;
  radio_metros: number;
  campos: CampoFormulario[];
  parametros: ParametroFormulario[];
}

export interface RespuestaCaptura {
  message: string;
  idMuestra: number;
  uuid_cliente: string | null;
  utm: Utm | null;
  fotografia_url: string | null;
  fuera_de_rango?: boolean;
  duplicada?: boolean;
  puntos_cercanos?: { id: number; clave: string; distancia_m: number }[];
}

// ── Solicitudes de punto nuevo (POST .../solicitar, GET /solicitudes) ────────

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

export interface Solicitud {
  id: number;
  proyecto: { id: number; nombre: string } | null;
  clave_identificacion: string;
  descripcion: string | null;
  lat: number;
  lng: number;
  utm: Utm | null;
  estado: EstadoSolicitud;
  motivo_rechazo: string | null;
  punto_creado_id: number | null;
  creada: string;
}

export interface RespuestaSolicitud {
  message: string;
  solicitud_id: number;
  estado: EstadoSolicitud;
  utm: Utm | null;
}

// ── Mis capturas en el servidor (GET /proyectos/{id}/muestras) ───────────────

/** Solo lo que la app usa para saber qué pasó con una captura ya enviada. */
export interface MuestraServidor {
  idMuestra: number;
  uuid_cliente: string | null;
  pendiente: boolean;
  punto_asignado: { id: number; clave: string } | null;
  fechaHoraToma: string;
}
