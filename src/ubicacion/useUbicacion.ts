import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/** Peor que esto, el GPS no alcanza para decir junto a qué pozo estás. */
export const PRECISION_ACEPTABLE_M = 30;

export type EstadoUbicacion =
  | { estado: 'pidiendo-permiso' }
  | { estado: 'sin-permiso'; puedePreguntar: boolean }
  | { estado: 'gps-apagado' }
  | { estado: 'buscando' }
  | { estado: 'ok'; lat: number; lng: number; alt: number | null; precision: number | null; hora: number };

/**
 * Posición del teléfono mientras la pantalla está abierta. El GPS no necesita
 * internet: esto funciona igual en campo sin señal.
 */
export function useUbicacion(): EstadoUbicacion & { reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoUbicacion>({ estado: 'pidiendo-permiso' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let suscripcion: Location.LocationSubscription | null = null;
    let cancelado = false;

    (async () => {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (cancelado) return;
      if (!permiso.granted) {
        setEstado({ estado: 'sin-permiso', puedePreguntar: permiso.canAskAgain });
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        if (!cancelado) setEstado({ estado: 'gps-apagado' });
        return;
      }

      setEstado({ estado: 'buscando' });

      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 1 },
        (p) =>
          setEstado({
            estado: 'ok',
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            alt: p.coords.altitude,
            precision: p.coords.accuracy,
            hora: p.timestamp,
          }),
        () => setEstado({ estado: 'buscando' }),
      );

      if (cancelado) suscripcion.remove();
    })().catch(() => {
      if (!cancelado) setEstado({ estado: 'gps-apagado' });
    });

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [intento]);

  return { ...estado, reintentar: () => setIntento((n) => n + 1) };
}
