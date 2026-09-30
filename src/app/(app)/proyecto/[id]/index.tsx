import { useQuery } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { mensajeDeError } from '@/api/errores';
import { listarPozos } from '@/api/proyectos';
import type { Pozo } from '@/api/tipos';
import { conCache } from '@/almacen/cache';
import { direccion, formatoDistancia, ordenarPorDistancia } from '@/geo/distancia';
import { mapaDescargado } from '@/mapa/descargas';
import { MapaWeb } from '@/mapa/MapaWeb';
import { estiloEnLinea, estiloSinConexion } from '@/mapa/estilo';
import { coordenadasValidas, pozosGeoJSON, recuadro } from '@/mapa/geojson';
import { LecturaGps } from '@/ubicacion/LecturaGps';
import { useUbicacion } from '@/ubicacion/useUbicacion';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { BotonCabecera } from '@/ui/BotonCabecera';
import { EstadoSync } from '@/ui/EstadoSync';
import { Icono } from '@/ui/Icono';
import { Insignia, Tarjeta, Vacio } from '@/ui/Tarjeta';
import { ALTO_TOCABLE, colores, espacio, radio as radios, sombra, tamanoTexto } from '@/ui/tema';

type Vista = 'mapa' | 'lista';

// MapLibre trae código nativo que Expo Go no incluye: ahí ni siquiera se
// importa (el import fallaría al abrir la app) y se usa MapaWeb, en línea.
const MapaPozos: typeof import('@/mapa/MapaPozos').MapaPozos | null = isRunningInExpoGo()
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/mapa/MapaPozos').MapaPozos;

/**
 * Pantalla de campo del proyecto: dónde estás respecto de los pozos.
 * Funciona sin señal si antes se abrió con señal (pozos guardados) y, para
 * el fondo del mapa, si se descargó el mapa sin conexión.
 */
export default function MapaProyecto() {
  const { id: idTexto, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const id = Number(idTexto);

  const [vista, setVista] = useState<Vista>('mapa');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [descargado, setDescargado] = useState(() => mapaDescargado(id));

  // Al volver de la pantalla de descarga el mapa pudo cambiar.
  useFocusEffect(useCallback(() => setDescargado(mapaDescargado(id)), [id]));

  const pozosQuery = useQuery({
    queryKey: ['pozos', id],
    queryFn: () => conCache(`pozos_${id}`, () => listarPozos(id)),
  });

  const ubicacion = useUbicacion();
  const yo = ubicacion.estado === 'ok' ? ubicacion : null;

  const pozos = useMemo(() => (pozosQuery.data?.datos.puntos ?? []).filter(coordenadasValidas), [pozosQuery.data]);
  const radio = pozosQuery.data?.datos.radio_metros ?? 500;

  const ordenados = useMemo(() => (yo ? ordenarPorDistancia({ lat: yo.lat, lng: yo.lng }, pozos) : null), [yo, pozos]);
  const cercano = ordenados?.[0] ?? null;

  const estilo = useMemo(() => (descargado ? estiloSinConexion(descargado.uri) : estiloEnLinea()), [descargado]);
  const caja = useMemo(() => recuadro(pozos), [pozos]);
  const datosPozos = useMemo(() => pozosGeoJSON(pozos, cercano?.idPuntoMuestreo ?? null), [pozos, cercano]);

  const detalle = useMemo(() => {
    const idDetalle = seleccionado ?? cercano?.idPuntoMuestreo;
    if (idDetalle == null) return null;
    return ordenados?.find((p) => p.idPuntoMuestreo === idDetalle) ?? pozos.find((p) => p.idPuntoMuestreo === idDetalle) ?? null;
  }, [seleccionado, cercano, ordenados, pozos]);

  const fueraDeRadio = !!cercano && cercano.distancia > radio;

  return (
    <View style={estilos.pantalla}>
      <Stack.Screen
        options={{
          title: nombre ?? 'Proyecto',
          headerRight: () => (
            <BotonCabecera
              icono={descargado ? 'cloud-done-outline' : 'cloud-download-outline'}
              etiqueta={descargado ? 'Mapa sin conexión descargado' : 'Descargar mapa sin conexión'}
              onPress={() => router.push({ pathname: '/proyecto/[id]/mapa-sin-conexion', params: { id } })}
            />
          ),
        }}
      />

      <EstadoSync />

      {pozosQuery.data?.desdeCache ? (
        <View style={estilos.franja}>
          <Icono nombre="cloud-offline-outline" color={colores.aviso} tamano={18} />
          <Text style={estilos.franjaTexto}>
            Sin conexión · pozos guardados el {new Date(pozosQuery.data.guardado).toLocaleString('es-MX')}
          </Text>
        </View>
      ) : null}

      <View style={estilos.selectorContenedor}>
        <View style={estilos.selector} accessibilityRole="tablist">
          {(['mapa', 'lista'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVista(v)}
              style={[estilos.pestana, vista === v && estilos.pestanaActiva]}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === v }}
            >
              <Icono
                nombre={v === 'mapa' ? 'map-outline' : 'list-outline'}
                color={vista === v ? colores.acento : colores.textoSuave}
                tamano={20}
              />
              <Text style={[estilos.pestanaTexto, vista === v && estilos.pestanaTextoActiva]}>
                {v === 'mapa' ? 'Mapa' : `Pozos${pozos.length ? ` (${pozos.length})` : ''}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {pozosQuery.error ? (
        <View style={{ padding: espacio.m }}>
          <Aviso texto={mensajeDeError(pozosQuery.error)} />
        </View>
      ) : null}

      {vista === 'mapa' ? (
        <View style={{ flex: 1 }}>
          {MapaPozos ? (
            <MapaPozos
              estilo={estilo}
              caja={caja}
              yo={yo}
              radio={radio}
              pozos={datosPozos}
              maxZoom={descargado ? descargado.maxzoom + 3 : 19}
              onSeleccionar={setSeleccionado}
            />
          ) : (
            <MapaWeb caja={caja} yo={yo} radio={radio} pozos={datosPozos} onSeleccionar={setSeleccionado} />
          )}
          {!MapaPozos || !descargado ? (
            <View style={estilos.notaMapa}>
              <Text style={estilos.notaMapaTexto}>Mapa en línea: sin señal no se verá el fondo</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <ListaPozos
          pozos={ordenados ?? pozos}
          radio={radio}
          conDistancia={!!ordenados}
          alElegir={(p) => {
            setSeleccionado(p);
            setVista('mapa');
          }}
        />
      )}

      <View style={estilos.hoja}>
        <PanelPosicion ubicacion={ubicacion} pozo={detalle} radio={radio} esCercano={detalle?.idPuntoMuestreo === cercano?.idPuntoMuestreo} />
        <View style={estilos.acciones}>
          <View style={{ flex: 1 }}>
            <Boton titulo="Nueva captura" icono="add-circle-outline" onPress={() => router.push({ pathname: '/proyecto/[id]/captura', params: { id } })} />
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/proyecto/[id]/solicitar-punto', params: { id } })}
            style={({ pressed }) => [estilos.botonCuadrado, fueraDeRadio && estilos.botonCuadradoResaltado, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Solicitar punto nuevo"
          >
            <Icono nombre="flag-outline" color={fueraDeRadio ? colores.blanco : colores.primario} tamano={26} />
            <Text style={[estilos.botonCuadradoTexto, fueraDeRadio && { color: colores.blanco }]}>Punto nuevo</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type PozoConDistancia = Pozo & { distancia?: number; rumbo?: number };

function ListaPozos({
  pozos,
  radio,
  conDistancia,
  alElegir,
}: {
  pozos: PozoConDistancia[];
  radio: number;
  conDistancia: boolean;
  alElegir: (id: number) => void;
}) {
  return (
    <FlatList
      style={{ flex: 1 }}
      data={pozos}
      keyExtractor={(p) => String(p.idPuntoMuestreo)}
      contentContainerStyle={{ padding: espacio.m, paddingBottom: espacio.xl, gap: espacio.s }}
      ListHeaderComponent={
        conDistancia ? null : (
          <View style={estilos.esperaGps}>
            <Icono nombre="locate" color={colores.textoSuave} tamano={18} />
            <Text style={estilos.nota}>Esperando el GPS para ordenar por distancia…</Text>
          </View>
        )
      }
      ListEmptyComponent={<Vacio icono="water-outline" titulo="Sin pozos" texto="Este proyecto no tiene pozos con coordenadas." />}
      renderItem={({ item, index }) => {
        const dentro = item.distancia != null && item.distancia <= radio;
        return (
          <Tarjeta onPress={() => alElegir(item.idPuntoMuestreo)} tono={dentro ? 'exito' : undefined} style={estilos.filaPozo}>
            <View style={[estilos.marcaPozo, dentro && { backgroundColor: colores.exitoFondo }]}>
              <Icono nombre="water" color={dentro ? colores.exito : colores.acento} tamano={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={estilos.clave}>{item.clave_identificacion}</Text>
              {item.nombre_aprovechamiento_local ? (
                <Text style={estilos.dato} numberOfLines={1}>
                  {item.nombre_aprovechamiento_local}
                </Text>
              ) : null}
              {conDistancia && index === 0 ? <Insignia texto="Más cercano" tono="info" icono="star" /> : null}
            </View>
            {item.distancia != null && item.rumbo != null ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[estilos.distancia, dentro && { color: colores.exito }]}>{formatoDistancia(item.distancia)}</Text>
                <View style={estilos.rumbo}>
                  <View style={{ transform: [{ rotate: `${item.rumbo}deg` }] }}>
                    <Icono nombre="arrow-up" color={colores.textoSuave} tamano={14} />
                  </View>
                  <Text style={estilos.dato}>{direccion(item.rumbo)}</Text>
                </View>
              </View>
            ) : null}
          </Tarjeta>
        );
      }}
    />
  );
}

function PanelPosicion({
  ubicacion,
  pozo,
  radio,
  esCercano,
}: {
  ubicacion: ReturnType<typeof useUbicacion>;
  pozo: PozoConDistancia | null;
  radio: number;
  esCercano: boolean;
}) {
  return (
    <View style={{ gap: espacio.s }}>
      <LecturaGps ubicacion={ubicacion} />

      {ubicacion.estado === 'ok' && pozo && pozo.distancia != null && pozo.rumbo != null ? (
        <View style={[estilos.pozoPanel, { borderLeftColor: pozo.distancia <= radio ? colores.exito : colores.bordeFuerte }]}>
          <Text style={estilos.etiquetaPozo}>{esCercano ? 'POZO MÁS CERCANO' : 'POZO SELECCIONADO'}</Text>
          <Text style={estilos.panelTitulo}>
            {pozo.clave_identificacion} · {formatoDistancia(pozo.distancia)} al {direccion(pozo.rumbo)}
          </Text>
          <Text style={[estilos.dato, pozo.distancia <= radio && { color: colores.exito, fontWeight: '600' }]}>
            {pozo.distancia <= radio
              ? `Dentro del radio del proyecto (${radio} m).`
              : `Fuera del radio (${radio} m). Si aquí hay un pozo que no está en la lista, solicítalo como punto nuevo.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colores.avisoFondo,
    paddingVertical: espacio.s,
    paddingHorizontal: espacio.m,
  },
  franjaTexto: { flexShrink: 1, color: colores.aviso, fontWeight: '700', fontSize: tamanoTexto.pequeno },
  selectorContenedor: { padding: espacio.s, backgroundColor: colores.tarjeta, borderBottomWidth: 1, borderBottomColor: colores.borde },
  selector: { flexDirection: 'row', backgroundColor: colores.fondo, borderRadius: radios.m, padding: 4 },
  pestana: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    borderRadius: radios.s + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pestanaActiva: { backgroundColor: colores.tarjeta, ...sombra },
  pestanaTexto: { fontSize: tamanoTexto.dato + 1, fontWeight: '600', color: colores.textoSuave },
  pestanaTextoActiva: { color: colores.acento, fontWeight: '700' },
  nota: { fontSize: 13, color: colores.textoSuave, textAlign: 'center' },
  notaMapa: {
    position: 'absolute',
    top: espacio.s,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: radios.total,
    paddingHorizontal: espacio.m,
    paddingVertical: 6,
  },
  notaMapaTexto: { color: colores.blanco, fontSize: 13, fontWeight: '600' },
  esperaGps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: espacio.xs },
  hoja: {
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: radios.l + 4,
    borderTopRightRadius: radios.l + 4,
    padding: espacio.m,
    gap: espacio.m,
    marginTop: -espacio.m,
    ...sombra,
    elevation: 8,
  },
  acciones: { flexDirection: 'row', gap: espacio.s, alignItems: 'stretch' },
  botonCuadrado: {
    width: 96,
    minHeight: ALTO_TOCABLE,
    borderRadius: radios.m,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  botonCuadradoResaltado: { backgroundColor: colores.aviso, borderColor: colores.aviso },
  botonCuadradoTexto: { fontSize: 12, fontWeight: '700', color: colores.primario },
  pozoPanel: { borderLeftWidth: 4, paddingLeft: espacio.s + 4, gap: 2 },
  etiquetaPozo: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: colores.textoSuave },
  panelTitulo: { fontSize: tamanoTexto.grande - 1, fontWeight: '700', color: colores.texto },
  dato: { fontSize: tamanoTexto.dato, color: colores.textoSuave },
  filaPozo: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: ALTO_TOCABLE, paddingVertical: espacio.s + 4 },
  marcaPozo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.acentoFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clave: { fontSize: tamanoTexto.normal, fontWeight: '700', color: colores.texto },
  distancia: { fontSize: tamanoTexto.grande, fontWeight: '800', color: colores.texto, fontVariant: ['tabular-nums'] },
  rumbo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
