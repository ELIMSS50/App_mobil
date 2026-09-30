import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { conCache } from '@/almacen/cache';
import { mensajeDeError } from '@/api/errores';
import { listarSolicitudes } from '@/api/solicitudes';
import type { EstadoSolicitud, Solicitud } from '@/api/tipos';
import { formatoUtm } from '@/geo/utm';
import { Aviso } from '@/ui/Aviso';
import type { NombreIcono } from '@/ui/Icono';
import { Dato, Insignia, Tarjeta, Vacio } from '@/ui/Tarjeta';
import { colores, espacio, tamanoTexto, type Tono } from '@/ui/tema';

const ESTADOS: Record<EstadoSolicitud, { texto: string; tono: Tono; icono: NombreIcono }> = {
  pendiente: { texto: 'Pendiente', tono: 'aviso', icono: 'time' },
  aprobada: { texto: 'Aprobada', tono: 'exito', icono: 'checkmark-circle' },
  rechazada: { texto: 'Rechazada', tono: 'error', icono: 'close-circle' },
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/** Mis solicitudes de punto nuevo y lo que decidió el profesor. */
export default function Solicitudes() {
  const { proyecto } = useLocalSearchParams<{ proyecto?: string }>();
  const proyectoId = proyecto ? Number(proyecto) : undefined;

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['solicitudes', proyectoId ?? 'todas'],
    queryFn: () => conCache(`solicitudes_${proyectoId ?? 'todas'}`, () => listarSolicitudes(proyectoId)),
  });

  return (
    <FlatList
      data={data?.datos ?? []}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={estilos.lista}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListHeaderComponent={
        error ? (
          <Aviso texto={mensajeDeError(error)} />
        ) : data?.desdeCache ? (
          <Aviso tipo="info" texto={`Sin conexión: estado al ${fecha(data.guardado)}.`} />
        ) : null
      }
      ListEmptyComponent={
        isPending ? (
          <Text style={estilos.nota}>Cargando solicitudes…</Text>
        ) : error ? null : (
          <Vacio
            icono="add-circle-outline"
            titulo="Sin solicitudes"
            texto="Si en campo encuentras un pozo que no está en el proyecto, solicítalo desde la pantalla del proyecto."
          />
        )
      }
      renderItem={({ item }) => <FilaSolicitud s={item} conProyecto={!proyectoId} />}
    />
  );
}

function FilaSolicitud({ s, conProyecto }: { s: Solicitud; conProyecto: boolean }) {
  const e = ESTADOS[s.estado] ?? ESTADOS.pendiente;
  return (
    <Tarjeta tono={e.tono}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo} numberOfLines={2}>
          {s.clave_identificacion}
        </Text>
        <Insignia texto={e.texto} tono={e.tono} icono={e.icono} />
      </View>
      {conProyecto && s.proyecto?.nombre ? <Dato icono="folder-outline" texto={s.proyecto.nombre} /> : null}
      {s.descripcion ? <Dato icono="document-text-outline" texto={s.descripcion} /> : null}
      <Dato icono="navigate-outline" texto={`${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`} />
      {s.utm ? <Dato icono="grid-outline" texto={formatoUtm(s.utm)} /> : null}
      <Dato icono="calendar-outline" texto={`Enviada el ${fecha(s.creada)}`} />
      {s.estado === 'rechazada' && s.motivo_rechazo ? (
        <Text style={estilos.motivo}>Motivo: {s.motivo_rechazo}</Text>
      ) : s.estado === 'aprobada' ? (
        <Text style={[estilos.motivo, { color: colores.exito }]}>El pozo ya está en el mapa del proyecto.</Text>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espacio.m, gap: espacio.m, flexGrow: 1 },
  nota: { fontSize: tamanoTexto.dato, color: colores.textoSuave, textAlign: 'center', marginTop: espacio.xl },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: espacio.s },
  titulo: { flex: 1, fontSize: tamanoTexto.grande - 2, fontWeight: '700', color: colores.texto },
  motivo: { fontSize: tamanoTexto.dato, fontWeight: '600', color: colores.error },
});
