import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { conCache } from '@/almacen/cache';
import { listarMisMuestras } from '@/api/capturas';
import type { MuestraServidor } from '@/api/tipos';
import { useEstadoCola } from '@/cola/estado';
import { useFilasCola } from '@/cola/hooks';
import type { FilaCola } from '@/cola/nucleo';
import { sincronizar } from '@/cola/sincronizador';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { EstadoSync } from '@/ui/EstadoSync';
import type { NombreIcono } from '@/ui/Icono';
import { Dato, Insignia, Tarjeta, TituloSeccion, Vacio } from '@/ui/Tarjeta';
import { colores, espacio, tamanoTexto, type Tono } from '@/ui/tema';

const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Las capturas que están en este teléfono: por corregir, por enviar y las
 * enviadas de los últimos 30 días. Las de por corregir o por enviar se pueden
 * abrir y editar; las enviadas ya no (DISENO §4.4). De las enviadas se
 * consulta al servidor si el profesor ya les asignó pozo.
 */
export default function Capturas() {
  const filas = useFilasCola();
  const { enLinea, sincronizando, aviso, ultimaSincronizacion } = useEstadoCola();

  const secciones = [
    { titulo: 'Por corregir', data: filas.filter((f) => f.estado === 'ERROR') },
    { titulo: 'Por enviar', data: filas.filter((f) => f.estado === 'EN_COLA' || f.estado === 'ENVIANDO') },
    { titulo: 'Enviadas', data: filas.filter((f) => f.estado === 'ENVIADA') },
  ].filter((s) => s.data.length);

  const { enServidor, consultando, refrescar } = useEstadoEnServidor(filas);

  return (
    <View style={{ flex: 1 }}>
      <EstadoSync />
      <SectionList
        sections={secciones}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={estilos.lista}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={consultando} onRefresh={refrescar} />}
        ListHeaderComponent={
          <View style={{ gap: espacio.s }}>
            {aviso ? <Aviso tipo="info" texto={aviso} /> : null}
            {ultimaSincronizacion ? (
              <Text style={estilos.nota}>Última sincronización: {fecha(ultimaSincronizacion)}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Vacio
            icono="document-text-outline"
            titulo="No hay capturas en este teléfono"
            texto="Las capturas que hagas aparecerán aquí hasta que se envíen, y luego 30 días más."
          />
        }
        renderSectionHeader={({ section }) => <TituloSeccion texto={`${section.titulo} (${section.data.length})`} />}
        renderItem={({ item }) => <FilaCaptura fila={item} servidor={enServidor.get(item.captura.uuid)} />}
        ItemSeparatorComponent={() => <View style={{ height: espacio.s }} />}
      />
      <View style={estilos.pie}>
        <Boton
          titulo={enLinea ? 'Sincronizar ahora' : 'Sin conexión: reintentar'}
          icono={enLinea ? 'sync' : 'cloud-offline-outline'}
          onPress={() => {
            sincronizar();
            refrescar();
          }}
          cargando={sincronizando}
        />
      </View>
    </View>
  );
}

/**
 * Lo que dice el servidor de las capturas enviadas, por `uuid_cliente`. Se
 * guarda copia para verlo sin señal.
 */
function useEstadoEnServidor(filas: FilaCola[]) {
  const proyectos = useMemo(
    () => [...new Set(filas.filter((f) => f.estado === 'ENVIADA').map((f) => f.proyectoId))].sort(),
    [filas],
  );

  // `combine` rehace el mapa solo cuando cambian los datos, no en cada render.
  return useQueries({
    queries: proyectos.map((id) => ({
      queryKey: ['mis-muestras', id],
      queryFn: () => conCache(`mis_muestras_${id}`, () => listarMisMuestras(id)),
      retry: 0,
    })),
    combine: (consultas) => {
      const enServidor = new Map<string, MuestraServidor>();
      for (const c of consultas) for (const m of c.data?.datos ?? []) if (m.uuid_cliente) enServidor.set(m.uuid_cliente, m);
      return {
        enServidor,
        consultando: consultas.some((c) => c.isRefetching),
        refrescar: () => consultas.forEach((c) => c.refetch()),
      };
    },
  });
}

const ESTADO_LOCAL: Record<FilaCola['estado'], { texto: string; tono: Tono; icono: NombreIcono }> = {
  ERROR: { texto: 'Corregir', tono: 'error', icono: 'alert-circle' },
  EN_COLA: { texto: 'En cola', tono: 'aviso', icono: 'time' },
  ENVIANDO: { texto: 'Enviando…', tono: 'info', icono: 'cloud-upload' },
  ENVIADA: { texto: 'Enviada', tono: 'exito', icono: 'checkmark-circle' },
};

function FilaCaptura({ fila, servidor }: { fila: FilaCola; servidor?: MuestraServidor }) {
  const editable = fila.estado === 'ERROR' || fila.estado === 'EN_COLA';
  const c = fila.captura;
  const mediciones = c.mediciones.filter((m) => m.valor.trim()).length;
  const estado = ESTADO_LOCAL[fila.estado];

  return (
    <Tarjeta
      tono={estado.tono}
      deshabilitada={!editable}
      onPress={
        editable
          ? () => router.push({ pathname: '/proyecto/[id]/captura', params: { id: fila.proyectoId, cola: fila.id } })
          : undefined
      }
    >
      <View style={estilos.filaSuperior}>
        <Text style={estilos.titulo}>{c.fechaHoraToma.slice(0, 16).replace('T', ' ')}</Text>
        <Insignia texto={estado.texto} tono={estado.tono} icono={estado.icono} />
      </View>
      <Dato icono="folder-outline" texto={fila.proyectoNombre ?? `Proyecto ${fila.proyectoId}`} />
      <Dato
        icono="flask-outline"
        texto={`${mediciones} mediciones · ${c.envases.length} envases · ${c.foto ? 'con foto' : 'sin foto'}`}
      />

      {fila.error && fila.estado !== 'ENVIADA' ? (
        <Text style={[estilos.error, fila.estado !== 'ERROR' && { color: colores.textoSuave }]}>
          {fila.error}
          {fila.estado === 'EN_COLA' && fila.intentos ? ` (intentos: ${fila.intentos})` : ''}
        </Text>
      ) : null}

      {fila.estado === 'ENVIADA' ? (
        <View style={estilos.servidor}>
          <Dato
            icono="receipt-outline"
            texto={`Folio ${fila.respuesta?.idMuestra ?? '—'}${fila.enviada ? ` · enviada ${fecha(fila.enviada)}` : ''}`}
          />
          {servidor?.punto_asignado ? (
            <Insignia texto={`Asignada al pozo ${servidor.punto_asignado.clave}`} tono="exito" icono="pin" />
          ) : servidor ? (
            <Insignia texto="Pendiente de asignar pozo" tono="aviso" icono="hourglass-outline" />
          ) : (
            <Text style={estilos.nota}>El profesor asigna el pozo.</Text>
          )}
          {fila.respuesta?.fuera_de_rango ? (
            <Insignia texto="Valores fuera de rango" tono="aviso" icono="warning" />
          ) : null}
        </View>
      ) : null}

      {editable ? (
        <Text style={estilos.enlace}>{fila.estado === 'ERROR' ? 'Corregir ›' : 'Editar ›'}</Text>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espacio.m, paddingTop: espacio.s, flexGrow: 1 },
  nota: { fontSize: tamanoTexto.pequeno, color: colores.textoSuave },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacio.s },
  titulo: { fontSize: tamanoTexto.normal, fontWeight: '700', color: colores.texto, fontVariant: ['tabular-nums'] },
  error: { fontSize: tamanoTexto.dato, fontWeight: '600', color: colores.error },
  servidor: { gap: 6, marginTop: 2, paddingTop: espacio.s, borderTopWidth: 1, borderTopColor: colores.borde },
  enlace: { fontSize: tamanoTexto.dato + 1, fontWeight: '700', color: colores.acento },
  pie: { padding: espacio.m, borderTopWidth: 1, borderTopColor: colores.borde, backgroundColor: colores.tarjeta },
});
