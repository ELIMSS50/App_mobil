import { Linking, StyleSheet, Text, View } from 'react-native';

import { formatoUtm, latLngAUtm } from '@/geo/utm';
import { Boton } from '@/ui/Boton';
import { Icono } from '@/ui/Icono';
import { Insignia } from '@/ui/Tarjeta';
import { colores, espacio, tamanoTexto } from '@/ui/tema';

import { PRECISION_ACEPTABLE_M, type useUbicacion } from './useUbicacion';

const TEXTOS_ESPERA = {
  'pidiendo-permiso': 'Pidiendo permiso para usar tu ubicación…',
  'sin-permiso': 'Sin permiso de ubicación: la app no puede saber dónde estás.',
  'gps-apagado': 'El GPS está apagado. Actívalo en los ajustes del teléfono.',
  buscando: 'Buscando señal GPS…',
} as const;

/**
 * Lo que dice el GPS ahora: lat/lng, UTM y precisión, o por qué no hay
 * lectura (con la salida: reintentar o abrir ajustes).
 */
export function LecturaGps({ ubicacion }: { ubicacion: ReturnType<typeof useUbicacion> }) {
  if (ubicacion.estado !== 'ok') {
    const sinPermiso = ubicacion.estado === 'sin-permiso';
    return (
      <View style={estilos.espera}>
        <View style={estilos.fila}>
          <Icono nombre={sinPermiso || ubicacion.estado === 'gps-apagado' ? 'location-outline' : 'locate'} color={colores.aviso} tamano={24} />
          <Text style={estilos.textoEspera}>{TEXTOS_ESPERA[ubicacion.estado]}</Text>
        </View>
        {sinPermiso && !ubicacion.puedePreguntar ? (
          <Boton titulo="Abrir ajustes" variante="secundario" icono="settings-outline" onPress={() => Linking.openSettings()} />
        ) : sinPermiso || ubicacion.estado === 'gps-apagado' ? (
          <Boton titulo="Reintentar" variante="secundario" icono="refresh" onPress={ubicacion.reintentar} />
        ) : null}
      </View>
    );
  }

  const precisionMala = ubicacion.precision != null && ubicacion.precision > PRECISION_ACEPTABLE_M;
  const precision = ubicacion.precision != null ? Math.round(ubicacion.precision) : '?';

  return (
    <View style={estilos.lectura}>
      <View style={estilos.filaEntre}>
        <View style={estilos.fila}>
          <Icono nombre="navigate" color={colores.acento} tamano={20} />
          <Text style={estilos.coord}>
            {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
          </Text>
        </View>
        <Insignia
          texto={`±${precision} m`}
          tono={precisionMala ? 'aviso' : 'exito'}
          icono={precisionMala ? 'warning' : 'checkmark-circle'}
        />
      </View>
      <Text style={estilos.utm}>{formatoUtm(latLngAUtm(ubicacion.lat, ubicacion.lng))} · WGS84</Text>
      {precisionMala ? (
        <Text style={estilos.consejo}>Precisión baja. Si puedes, sal a cielo abierto y espera unos segundos.</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  espera: { gap: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, flexShrink: 1 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.s },
  textoEspera: { flex: 1, fontSize: tamanoTexto.normal - 1, color: colores.texto, fontWeight: '600' },
  lectura: { gap: 4 },
  coord: { fontSize: tamanoTexto.normal, fontWeight: '700', color: colores.texto, fontVariant: ['tabular-nums'] },
  utm: { fontSize: tamanoTexto.dato, color: colores.textoSuave, fontVariant: ['tabular-nums'], marginLeft: 28 },
  consejo: { fontSize: tamanoTexto.dato, color: colores.aviso, fontWeight: '600' },
});
