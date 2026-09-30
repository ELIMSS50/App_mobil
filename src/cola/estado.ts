import { create } from 'zustand';

import type { Conteo } from './nucleo';

interface EstadoSincronizacion {
  conteo: Conteo;
  enLinea: boolean;
  sincronizando: boolean;
  ultimaSincronizacion: string | null;
  /** Por qué se detuvo la última vez, si fue así (sin red, sesión…). */
  aviso: string | null;
  /** Sube con cada cambio en la cola: las pantallas lo usan para releerla. */
  version: number;
}

export const useEstadoCola = create<EstadoSincronizacion>(() => ({
  conteo: { pendientes: 0, errores: 0, porProyecto: {} },
  enLinea: true,
  sincronizando: false,
  ultimaSincronizacion: null,
  aviso: null,
  version: 0,
}));
