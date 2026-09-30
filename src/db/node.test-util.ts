// Adaptador de node:sqlite para las pruebas (no se incluye en la app).
import { DatabaseSync } from 'node:sqlite';

import type { Base } from './base.ts';
import { migrar } from './esquema.ts';

export function baseDePrueba(): Base {
  const d = new DatabaseSync(':memory:');
  const base: Base = {
    exec: (sql) => d.exec(sql),
    run: (sql, ...params) => {
      const r = d.prepare(sql).run(...params);
      return { cambios: Number(r.changes), ultimoId: Number(r.lastInsertRowid) };
    },
    todos: <T,>(sql: string, ...params: (string | number | null)[]) => d.prepare(sql).all(...params) as T[],
    uno: <T,>(sql: string, ...params: (string | number | null)[]) => (d.prepare(sql).get(...params) as T | undefined) ?? null,
    transaccion: (tarea) => {
      d.exec('BEGIN');
      try {
        tarea();
        d.exec('COMMIT');
      } catch (e) {
        d.exec('ROLLBACK');
        throw e;
      }
    },
  };
  migrar(base);
  return base;
}
