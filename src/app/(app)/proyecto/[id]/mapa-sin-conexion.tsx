import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { infoMapa } from '@/api/proyectos';
import { borrarMapa, descargarMapa, mapaDescargado, type Progreso } from '@/mapa/descargas';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { Icono } from '@/ui/Icono';
import { Dato, Insignia, Tarjeta } from '@/ui/Tarjeta';
import { colores, espacio, radio, tamanoTexto } from '@/ui/tema';

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Descargar el mapa del proyecto antes de salir a campo, como los mapas sin
 * conexión de Google Maps. Lo genera el servidor (php artisan mapas:generar).
 */
export default function MapaSinConexion() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);

  const [local, setLocal] = useState(() => mapaDescargado(id));
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelar = useRef<AbortController | null>(null);

  const servidor = useQuery({ queryKey: ['mapa', id], queryFn: () => infoMapa(id), retry: 0 });
  const info = servidor.data;
  const hayVersionNueva = !!(local && info?.disponible && info.generado !== local.generado);

  async function descargar() {
    setError(null);
    setProgreso({ etapa: 'recursos', bytes: 0, total: 0 });
    cancelar.current = new AbortController();
    try {
      setLocal(await descargarMapa(id, setProgreso, cancelar.current.signal));
    } catch (e) {
      setError(cancelar.current.signal.aborted ? 'Descarga cancelada.' : e instanceof Error && !('isAxiosError' in e) ? e.message : mensajeDeError(e));
    } finally {
      setProgreso(null);
      cancelar.current = null;
    }
  }

  function borrar() {
    borrarMapa(id);
    setLocal(null);
  }

  const porcentaje = progreso && progreso.total > 0 ? Math.min(100, Math.round((progreso.bytes / progreso.total) * 100)) : 0;

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={estilos.ilustracion}>
        <Icono nombre={local ? 'cloud-done' : 'cloud-download'} color={local ? colores.exito : colores.acento} tamano={40} />
      </View>
      <Text style={estilos.texto}>
        Descarga el mapa de la zona del proyecto antes de salir. En campo se verá aunque no haya señal. Los pozos y
        el GPS funcionan sin señal aunque no lo descargues; solo faltaría el fondo del mapa.
      </Text>

      <Tarjeta tono={local ? 'exito' : 'neutro'}>
        <View style={estilos.encabezado}>
          <Dato icono="phone-portrait-outline" texto="En este teléfono" color={colores.texto} fuerte />
          <Insignia texto={local ? 'Descargado' : 'Sin descargar'} tono={local ? 'exito' : 'neutro'} />
        </View>
        {local ? (
          <>
            <Dato icono="download-outline" texto={`${fecha(local.descargado)} · ${mb(local.bytes)}`} />
            <Dato icono="calendar-outline" texto={`Mapa del ${fecha(local.generado)}`} />
          </>
        ) : null}
      </Tarjeta>

      <Tarjeta>
        <Dato icono="server-outline" texto="En el servidor" color={colores.texto} fuerte />
        {servidor.isPending ? (
          <Text style={estilos.dato}>Consultando…</Text>
        ) : servidor.error ? (
          <Text style={estilos.dato}>{mensajeDeError(servidor.error)}</Text>
        ) : info?.disponible ? (
          <Dato icono="map-outline" texto={`${mb(info.bytes)} · generado el ${fecha(info.generado)}`} />
        ) : (
          <Text style={estilos.dato}>{info?.message}</Text>
        )}
      </Tarjeta>

      {hayVersionNueva ? <Aviso tipo="info" texto="Hay una versión más nueva del mapa (se agregaron pozos o se actualizó)." /> : null}
      {error ? <Aviso texto={error} /> : null}

      {progreso ? (
        <View style={{ gap: espacio.s }}>
          <Text style={estilos.dato}>
            {progreso.etapa === 'recursos' ? 'Descargando letras e íconos del mapa…' : `Descargando mapa… ${porcentaje}%`}
          </Text>
          <View style={estilos.barra}>
            <View style={[estilos.barraRelleno, { width: `${porcentaje}%` }]} />
          </View>
          <Boton titulo="Cancelar" icono="close" variante="secundario" onPress={() => cancelar.current?.abort()} />
        </View>
      ) : (
        <>
          {info?.disponible && (!local || hayVersionNueva) ? (
            <Boton
              titulo={`${local ? 'Actualizar' : 'Descargar'} mapa (${mb(info.bytes)})`}
              icono={local ? 'refresh' : 'cloud-download-outline'}
              onPress={descargar}
            />
          ) : null}
          {local ? <Boton titulo="Borrar del teléfono" icono="trash-outline" variante="peligro" onPress={borrar} /> : null}
        </>
      )}

      <Text style={estilos.nota}>Datos del mapa © OpenStreetMap, estilo de Protomaps.</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.l, gap: espacio.m },
  ilustracion: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colores.acentoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontSize: tamanoTexto.normal - 1, color: colores.textoSuave, textAlign: 'center', lineHeight: 23 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacio.s },
  dato: { fontSize: tamanoTexto.dato, color: colores.textoSuave },
  barra: { height: 12, borderRadius: radio.total, backgroundColor: colores.borde, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: colores.acento },
  nota: { fontSize: 12, color: colores.textoSuave, textAlign: 'center' },
});
