import { openDatabaseSync, type SQLiteBindValue } from 'expo-sqlite';

import type { Base, Parametro } from './base';
import { migrar } from './esquema';

const sqlite = openDatabaseSync('scmp.db');
sqlite.execSync('PRAGMA journal_mode = WAL');

const p = (params: Parametro[]) => params as SQLiteBindValue[];

export const db: Base = {
  exec: (sql) => sqlite.execSync(sql),
  run: (sql, ...params) => {
    const r = sqlite.runSync(sql, p(params));
    return { cambios: r.changes, ultimoId: r.lastInsertRowId };
  },
  todos: (sql, ...params) => sqlite.getAllSync(sql, p(params)),
  uno: (sql, ...params) => sqlite.getFirstSync(sql, p(params)),
  transaccion: (tarea) => sqlite.withTransactionSync(tarea),
};

migrar(db);
