import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useEstadoCola } from './estado';
import { prepararCola, sincronizar } from './sincronizador';

/** Cada cuánto se reintenta sola la cola mientras quede algo pendiente. */
const INTERVALO_MS = 2 * 60 * 1000;

const conectado = (e: Network.NetworkState) => e.isConnected !== false && e.isInternetReachable !== false;

/**
 * Dispara la sincronización sin que el alumno tenga que acordarse: al abrir
 * la app, al recuperar la red, al volver a la app y cada 2 minutos si hay
 * capturas pendientes. Se monta una vez, en el layout de la sesión.
 */
export function useSincronizacionAutomatica(): void {
  useEffect(() => {
    prepararCola();
    sincronizar();

    Network.getNetworkStateAsync()
      .then((e) => useEstadoCola.setState({ enLinea: conectado(e) }))
      .catch(() => {});

    const red = Network.addNetworkStateListener((e) => {
      const antes = useEstadoCola.getState().enLinea;
      const ahora = conectado(e);
      useEstadoCola.setState({ enLinea: ahora });
      if (ahora && !antes) sincronizar();
    });

    const app = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') sincronizar();
    });

    const reloj = setInterval(() => {
      const { conteo, enLinea } = useEstadoCola.getState();
      if (enLinea && conteo.pendientes > 0) sincronizar({ catalogos: false });
    }, INTERVALO_MS);

    return () => {
      red.remove();
      app.remove();
      clearInterval(reloj);
    };
  }, []);
}
