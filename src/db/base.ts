// Interfaz mínima sobre SQLite. En el teléfono la implementa expo-sqlite
// (db/expo.ts); en las pruebas, node:sqlite. Así la lógica de la cola se
// prueba en la PC con una base real, sin emulador.

export type Parametro = string | number | null;

export interface Base {
  exec(sql: string): void;
  run(sql: string, ...params: Parametro[]): { cambios: number; ultimoId: number };
  todos<T>(sql: string, ...params: Parametro[]): T[];
  uno<T>(sql: string, ...params: Parametro[]): T | null;
  transaccion(tarea: () => void): void;
}
