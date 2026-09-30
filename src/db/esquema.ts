import type { Base } from './base.ts';

/**
 * Migraciones en orden. Cada una sube PRAGMA user_version en 1. Nunca editar
 * una ya publicada: agregar otra al final.
 */
const MIGRACIONES: string[] = [
  // 1: copia de catálogos del servidor y cola de capturas.
  `
  CREATE TABLE cache (
    clave    TEXT PRIMARY KEY,
    datos    TEXT NOT NULL,
    guardado TEXT NOT NULL
  );

  CREATE TABLE cola (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id      INTEGER NOT NULL,
    proyecto_id     INTEGER NOT NULL,
    proyecto_nombre TEXT,
    estado          TEXT    NOT NULL,
    datos           TEXT    NOT NULL,
    intentos        INTEGER NOT NULL DEFAULT 0,
    error           TEXT,
    errores_campo   TEXT,
    respuesta       TEXT,
    creada          TEXT    NOT NULL,
    actualizada     TEXT    NOT NULL,
    enviada         TEXT
  );

  CREATE INDEX cola_por_usuario ON cola (usuario_id, estado, creada);
  `,
];

export function migrar(base: Base): void {
  const actual = base.uno<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

  for (let v = actual; v < MIGRACIONES.length; v++) {
    base.transaccion(() => {
      base.exec(MIGRACIONES[v]);
      base.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
