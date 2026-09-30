import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { conCache } from '@/almacen/cache';
import { mensajeDeError } from '@/api/errores';
import { listarProyectos } from '@/api/proyectos';
import type { Proyecto } from '@/api/tipos';
import { useEstadoCola } from '@/cola/estado';
import { useSesion } from '@/sesion/almacen';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { BotonCabecera } from '@/ui/BotonCabecera';
import { EstadoSync } from '@/ui/EstadoSync';
import { Icono, type NombreIcono } from '@/ui/Icono';
import { Dato, Insignia, Tarjeta, TituloSeccion, Vacio } from '@/ui/Tarjeta';
import { colores, espacio, radio, sombra, tamanoTexto } from '@/ui/tema';

export default function MisProyectos() {
  const nombre = useSesion((s) => s.usuario?.nombreCompleto.split(' ')[0]);
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => conCache('proyectos', listarProyectos),
  });

  return (
    <View style={estilos.pantalla}>
      <Stack.Screen
        options={{
          headerRight: () => <BotonCabecera icono="person-circle-outline" etiqueta="Mi cuenta" onPress={() => router.push('/perfil')} />,
        }}
      />
      <EstadoSync />

      <FlatList
        data={data?.datos ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={{ gap: espacio.m }}>
            <View>
              <Text style={estilos.saludo}>Hola{nombre ? `, ${nombre}` : ''}</Text>
              <Text style={estilos.subtitulo}>Elige un proyecto para ir a campo.</Text>
            </View>

            <View style={estilos.accesos}>
              <Acceso icono="document-text" titulo="Mis capturas" onPress={() => router.push('/capturas')} />
              <Acceso icono="add-circle" titulo="Mis solicitudes" onPress={() => router.push('/solicitudes')} />
            </View>

            {error ? (
              <Aviso texto={mensajeDeError(error)} />
            ) : data?.desdeCache ? (
              <Aviso tipo="info" texto="Sin conexión: se muestran los proyectos guardados en el teléfono." />
            ) : null}

            {data?.datos.length ? <TituloSeccion texto={`Proyectos (${data.datos.length})`} /> : null}
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <Text style={estilos.cargando}>Cargando proyectos…</Text>
          ) : error ? null : (
            <Vacio
              icono="folder-open-outline"
              titulo="Aún no estás en ningún proyecto"
              texto="Pide la clave de acceso a tu profesor y únete con el botón de abajo."
            />
          )
        }
        renderItem={({ item }) => <TarjetaProyecto proyecto={item} />}
      />

      <View style={estilos.pie}>
        <Boton titulo="Unirme con clave" icono="key-outline" variante="secundario" onPress={() => router.push('/unirse')} />
      </View>
    </View>
  );
}

function Acceso({ icono, titulo, onPress }: { icono: NombreIcono; titulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.acceso, pressed && { opacity: 0.8 }]}
    >
      <View style={estilos.accesoIcono}>
        <Icono nombre={icono} color={colores.acento} tamano={24} />
      </View>
      <Text style={estilos.accesoTexto}>{titulo}</Text>
    </Pressable>
  );
}

function TarjetaProyecto({ proyecto }: { proyecto: Proyecto }) {
  const pendientes = useEstadoCola((s) => s.conteo.porProyecto[proyecto.id] ?? 0);
  return (
    <Tarjeta
      onPress={() => router.push({ pathname: '/proyecto/[id]', params: { id: proyecto.id, nombre: proyecto.nombre } })}
      etiquetaAccesible={`Abrir ${proyecto.nombre}`}
    >
      <View style={estilos.filaProyecto}>
        <View style={estilos.iconoProyecto}>
          <Icono nombre="water" color={colores.blanco} tamano={24} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={estilos.nombre} numberOfLines={2}>
            {proyecto.nombre}
          </Text>
          <Dato icono="radio-button-on-outline" texto={`Radio de tolerancia: ${proyecto.radio_tolerancia_metros} m`} />
          {pendientes ? <Insignia texto={`${pendientes} sin enviar`} tono="aviso" icono="cloud-upload" /> : null}
        </View>
        <Icono nombre="chevron-forward" color={colores.textoTenue} tamano={22} />
      </View>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  lista: { padding: espacio.m, gap: espacio.m, flexGrow: 1 },
  saludo: { fontSize: tamanoTexto.titulo, fontWeight: '800', color: colores.texto },
  subtitulo: { fontSize: tamanoTexto.normal - 1, color: colores.textoSuave, marginTop: 2 },
  accesos: { flexDirection: 'row', gap: espacio.m },
  acceso: {
    flex: 1,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.l,
    padding: espacio.m,
    gap: espacio.s,
    minHeight: 96,
    ...sombra,
  },
  accesoIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.acentoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accesoTexto: { fontSize: tamanoTexto.normal - 1, fontWeight: '700', color: colores.texto },
  filaProyecto: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  iconoProyecto: {
    width: 48,
    height: 48,
    borderRadius: radio.m,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { fontSize: tamanoTexto.grande - 1, fontWeight: '700', color: colores.texto },
  cargando: { fontSize: tamanoTexto.normal, color: colores.textoSuave, textAlign: 'center', marginTop: espacio.xl },
  pie: { padding: espacio.m, borderTopWidth: 1, borderTopColor: colores.borde, backgroundColor: colores.tarjeta },
});
