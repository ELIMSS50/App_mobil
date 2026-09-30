// Cola de capturas: guardar nunca falla por falta de red; el envío se hace
// después, en orden, cuando hay señal. Ver docs/DISENO.md §4.4.
//
// Sin imports con alias ni de React Native: se prueba con node:sqlite
// (cola/nucleo.test.ts).

import type { Captura } from '../captura/modelo.ts';
import type { Base } from '../db/base.ts';

/**
 *   EN_COLA ──enviar──▶ ENVIANDO ──201/200──▶ ENVIADA
 *      ▲                   │
 *      │  sin red / 5xx    │ 422 u otro rechazo
 *      └───────────────────┤
 *                          ▼
 *        (el alumno corrige) ERROR
 */
export type EstadoCola = 'EN_COLA' | 'ENVIANDO' | 'ERROR' | 'ENVIADA';

export interface RespuestaEnvio {
  idMuestra: number;
  duplicada?: boolean;
  fuera_de_rango?: boolean;
  utm?: unknown;
  puntos_cercanos?: { id: number; clave: string; distancia_m: number }[];
}

export interface FilaCola {
  id: number;
  usuarioId: number;
  proyectoId: number;
  proyectoNombre: string | null;
  estado: EstadoCola;
  captura: Captura;
  intentos: number;
  /** Último motivo de fallo, para mostrarlo. */
  error: string | null;
  /** Errores del servidor por campo de la pantalla (claves de validacion.ts). */
  erroresCampo: Record<string, string>;
  respuesta: RespuestaEnvio | null;
  creada: string;
  actualizada: string;
  enviada: string | null;
}

interface FilaSql {
  id: number;
  usuario_id: number;
  proyecto_id: number;
  proyecto_nombre: string | null;
  estado: EstadoCola;
  datos: string;
  intentos: number;
  error: string | null;
  errores_campo: string | null;
  respuesta: string | null;
  creada: string;
  actualizada: string;
  enviada: string | null;
}

const aFila = (r: FilaSql): FilaCola => ({
  id: r.id,
  usuarioId: r.usuario_id,
  proyectoId: r.proyecto_id,
  proyectoNombre: r.proyecto_nombre,
  estado: r.estado,
  captura: JSON.parse(r.datos) as Captura,
  intentos: r.intentos,
  error: r.error,
  erroresCampo: r.errores_campo ? (JSON.parse(r.errores_campo) as Record<string, string>) : {},
  respuesta: r.respuesta ? (JSON.parse(r.respuesta) as RespuestaEnvio) : null,
  creada: r.creada,
  actualizada: r.actualizada,
  enviada: r.enviada,
});

const ahora = () => new Date().toISOString();

// ── Escritura desde la pantalla ──────────────────────────────────────────────

export function encolar(base: Base, captura: Captura, usuarioId: number, proyectoNombre: string | null): number {
  const t = ahora();
  return base.run(
    `INSERT INTO cola (usuario_id, proyecto_id, proyecto_nombre, estado, datos, creada, actualizada)
     VALUES (?, ?, ?, 'EN_COLA', ?, ?, ?)`,
    usuarioId,
    captura.proyectoId,
    proyectoNombre,
    JSON.stringify(captura),
    t,
    t,
  ).ultimoId;
}

/**
 * Guarda la corrección de una captura que aún no se envía y la regresa a la
 * cola. Una ya enviada no se edita: devuelve false (DISENO §4.4).
 */
export function actualizar(base: Base, id: number, captura: Captura): boolean {
  return (
    base.run(
      `UPDATE cola SET datos = ?, estado = 'EN_COLA', error = NULL, errores_campo = NULL, actualizada = ?
       WHERE id = ? AND estado IN ('EN_COLA', 'ERROR')`,
      JSON.stringify(captura),
      ahora(),
      id,
    ).cambios === 1
  );
}

/**
 * Quita de la cola una captura que nunca llegó al servidor. Las enviadas no
 * se borran desde la app: eso lo resuelve el profesor en la web.
 */
export function descartar(base: Base, id: number): boolean {
  return base.run(`DELETE FROM cola WHERE id = ? AND estado IN ('EN_COLA', 'ERROR')`, id).cambios === 1;
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export function obtener(base: Base, id: number): FilaCola | null {
  const r = base.uno<FilaSql>('SELECT * FROM cola WHERE id = ?', id);
  return r ? aFila(r) : null;
}

/** Más recientes primero. */
export function listar(base: Base, usuarioId: number, proyectoId?: number): FilaCola[] {
  const filas =
    proyectoId === undefined
      ? base.todos<FilaSql>('SELECT * FROM cola WHERE usuario_id = ? ORDER BY creada DESC, id DESC', usuarioId)
      : base.todos<FilaSql>(
          'SELECT * FROM cola WHERE usuario_id = ? AND proyecto_id = ? ORDER BY creada DESC, id DESC',
          usuarioId,
          proyectoId,
        );
  return filas.map(aFila);
}

export interface Conteo {
  pendientes: number;
  errores: number;
  /** Pendientes por proyecto. */
  porProyecto: Record<number, number>;
}

export function contar(base: Base, usuarioId: number): Conteo {
  const filas = base.todos<{ proyecto_id: number; estado: EstadoCola; n: number }>(
    `SELECT proyecto_id, estado, COUNT(*) AS n FROM cola
     WHERE usuario_id = ? AND estado != 'ENVIADA' GROUP BY proyecto_id, estado`,
    usuarioId,
  );
  const conteo: Conteo = { pendientes: 0, errores: 0, porProyecto: {} };
  for (const f of filas) {
    if (f.estado === 'ERROR') conteo.errores += f.n;
    else conteo.pendientes += f.n;
    conteo.porProyecto[f.proyecto_id] = (conteo.porProyecto[f.proyecto_id] ?? 0) + f.n;
  }
  return conteo;
}

// ── Mantenimiento ────────────────────────────────────────────────────────────

/**
 * Al abrir la app: lo que quedó ENVIANDO es que la app se cerró a medio
 * envío. Vuelve a la cola; si el servidor sí lo guardó, el uuid_cliente evita
 * el duplicado.
 */
export function reiniciarEnviando(base: Base): number {
  return base.run(`UPDATE cola SET estado = 'EN_COLA' WHERE estado = 'ENVIANDO'`).cambios;
}

/** Las enviadas se conservan un tiempo como historial y luego se limpian. */
export function limpiarEnviadas(base: Base, dias: number): number {
  const limite = new Date(Date.now() - dias * 864e5).toISOString();
  return base.run(`DELETE FROM cola WHERE estado = 'ENVIADA' AND enviada < ?`, limite).cambios;
}

// ── Envío ────────────────────────────────────────────────────────────────────

/** Cómo terminó un intento fallido; lo decide quien conoce el cliente HTTP. */
export type Fallo =
  | { tipo: 'sin-red'; mensaje: string } // sin red, timeout, 5xx: reintentar más tarde
  | { tipo: 'sesion'; mensaje: string } // 401: el token ya no vale
  | { tipo: 'conflicto'; mensaje: string } // 409: el uuid lo tiene otra captura
  | { tipo: 'rechazo'; mensaje: string; porCampo?: Record<string, string> }; // 422, 403, 404…

export interface Dependencias {
  enviar: (c: Captura) => Promise<RespuestaEnvio>;
  clasificar: (error: unknown, c: Captura) => Fallo;
  nuevoUuid: () => string;
  /** Después de enviarse (p. ej., borrar la foto del teléfono). */
  alEnviar?: (fila: FilaCola) => void;
  /** Después de cada cambio de estado, para refrescar la pantalla. */
  alCambiar?: () => void;
}

export interface Resumen {
  enviadas: number;
  rechazadas: number;
  /** Por qué se detuvo antes de vaciar la cola, si fue así. */
  detenida: 'sin-red' | 'sesion' | null;
  mensaje: string | null;
}

/**
 * Envía en orden de captura las pendientes del usuario. Se detiene al primer
 * fallo de red (no tiene caso seguir probando sin señal) o de sesión; un
 * rechazo del servidor marca esa captura como ERROR y sigue con la siguiente.
 */
export async function procesar(base: Base, usuarioId: number, dep: Dependencias): Promise<Resumen> {
  const resumen: Resumen = { enviadas: 0, rechazadas: 0, detenida: null, mensaje: null };
  // Cuántas veces se intentó cada fila en esta pasada. Una que vuelve a la
  // cola (409 con uuid nuevo) se reintenta una vez; si vuelve otra vez, se
  // salta y espera a la siguiente sincronización sin frenar a las demás.
  const intentosPasada = new Map<number, number>();

  for (;;) {
    const saltar = [...intentosPasada].filter(([, n]) => n >= 2).map(([id]) => id);
    const r = base.uno<FilaSql>(
      `SELECT * FROM cola WHERE usuario_id = ? AND estado = 'EN_COLA'
       ${saltar.length ? `AND id NOT IN (${saltar.map(() => '?').join(',')})` : ''}
       ORDER BY creada, id LIMIT 1`,
      usuarioId,
      ...saltar,
    );
    if (!r) break;
    intentosPasada.set(r.id, (intentosPasada.get(r.id) ?? 0) + 1);

    const fila = aFila(r);
    base.run(`UPDATE cola SET estado = 'ENVIANDO', intentos = intentos + 1, actualizada = ? WHERE id = ?`, ahora(), fila.id);
    dep.alCambiar?.();

    try {
      const respuesta = await dep.enviar(fila.captura);
      const t = ahora();
      base.run(
        `UPDATE cola SET estado = 'ENVIADA', respuesta = ?, error = NULL, errores_campo = NULL, enviada = ?, actualizada = ?
         WHERE id = ?`,
        JSON.stringify(respuesta),
        t,
        t,
        fila.id,
      );
      resumen.enviadas++;
      dep.alEnviar?.({ ...fila, estado: 'ENVIADA', respuesta, enviada: t });
    } catch (error) {
      const fallo = dep.clasificar(error, fila.captura);

      if (fallo.tipo === 'conflicto') {
        const captura = { ...fila.captura, uuid: dep.nuevoUuid() };
        base.run(
          `UPDATE cola SET estado = 'EN_COLA', datos = ?, error = ?, actualizada = ? WHERE id = ?`,
          JSON.stringify(captura),
          fallo.mensaje,
          ahora(),
          fila.id,
        );
      } else if (fallo.tipo === 'rechazo') {
        base.run(
          `UPDATE cola SET estado = 'ERROR', error = ?, errores_campo = ?, actualizada = ? WHERE id = ?`,
          fallo.mensaje,
          fallo.porCampo && Object.keys(fallo.porCampo).length ? JSON.stringify(fallo.porCampo) : null,
          ahora(),
          fila.id,
        );
        resumen.rechazadas++;
      } else {
        base.run(`UPDATE cola SET estado = 'EN_COLA', error = ?, actualizada = ? WHERE id = ?`, fallo.mensaje, ahora(), fila.id);
        resumen.detenida = fallo.tipo;
        resumen.mensaje = fallo.mensaje;
        dep.alCambiar?.();
        break;
      }
    }
    dep.alCambiar?.();
  }

  return resumen;
}
