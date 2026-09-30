import { useMemo } from 'react';

import { useEstadoCola } from './estado';
import type { FilaCola } from './nucleo';
import { filaDeCola, filasDeCola } from './sincronizador';

/** Filas de la cola del usuario; se releen cada vez que la cola cambia. */
export function useFilasCola(proyectoId?: number): FilaCola[] {
  const version = useEstadoCola((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => filasDeCola(proyectoId), [proyectoId, version]);
}

export function useFilaCola(id: number | null): FilaCola | null {
  const version = useEstadoCola((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (id == null ? null : filaDeCola(id)), [id, version]);
}
