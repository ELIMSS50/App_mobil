import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  NativeUserLocation,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ALTO_TOCABLE, colores, espacio, tamanoTexto } from '@/ui/tema';

import { fuenteEtiquetas } from './estilo';
import { circulo } from './geojson';

// Único archivo que importa MapLibre. La pantalla del proyecto lo carga solo
// fuera de Expo Go (ver proyecto/[id]/index.tsx).

interface Props {
  estilo: StyleSpecification;
  caja: [number, number, number, number] | null;
  yo: { lat: number; lng: number } | null;
  radio: number;
  pozos: GeoJSON.FeatureCollection<GeoJSON.Point>;
  maxZoom: number;
  onSeleccionar: (idPozo: number | null) => void;
}

const MARGEN = { top: 60, bottom: 60, left: 40, right: 40 };

export function MapaPozos({ estilo, caja, yo, radio, pozos, maxZoom, onSeleccionar }: Props) {
  const camara = useRef<CameraRef>(null);

  return (
    <View style={{ flex: 1 }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={estilo}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, right: 8 }}
        compass
        scaleBar
        onPress={() => onSeleccionar(null)}
      >
        <Camera
          ref={camara}
          initialViewState={
            caja
              ? { bounds: caja, padding: MARGEN }
              : yo
                ? { center: [yo.lng, yo.lat], zoom: 15 }
                : { center: [-100.97, 22.15], zoom: 5 }
          }
          maxZoom={maxZoom}
        />

        {yo ? (
          <GeoJSONSource id="radio" data={circulo(yo.lat, yo.lng, radio)}>
            <Layer id="radio-relleno" type="fill" paint={{ 'fill-color': '#2563EB', 'fill-opacity': 0.08 }} />
            <Layer id="radio-borde" type="line" paint={{ 'line-color': '#2563EB', 'line-width': 1.5, 'line-dasharray': [2, 2] }} />
          </GeoJSONSource>
        ) : null}

        <GeoJSONSource
          id="pozos"
          data={pozos}
          hitbox={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={(e) => {
            const idPozo = e.nativeEvent.features[0]?.properties?.id;
            if (typeof idPozo === 'number') onSeleccionar(idPozo);
          }}
        >
          <Layer
            id="pozos-punto"
            type="circle"
            paint={{
              'circle-radius': ['case', ['get', 'cercano'], 10, 7],
              'circle-color': ['case', ['get', 'cercano'], '#EA580C', colores.primario],
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2,
            }}
          />
          <Layer
            id="pozos-clave"
            type="symbol"
            minzoom={11}
            layout={{
              'text-field': ['get', 'clave'],
              'text-font': [fuenteEtiquetas()],
              'text-size': 13,
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
              'text-optional': true,
            }}
            paint={{ 'text-color': colores.primario, 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 }}
          />
        </GeoJSONSource>

        <NativeUserLocation />
      </Map>

      <View style={estilos.controles}>
        <BotonMapa
          texto="Yo"
          deshabilitado={!yo}
          onPress={() => yo && camara.current?.flyTo({ center: [yo.lng, yo.lat], zoom: 16, duration: 800 })}
        />
        <BotonMapa
          texto="Todos"
          deshabilitado={!caja}
          onPress={() => caja && camara.current?.fitBounds(caja, { padding: MARGEN, duration: 800 })}
        />
      </View>
    </View>
  );
}

function BotonMapa({ texto, onPress, deshabilitado }: { texto: string; onPress: () => void; deshabilitado?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [estilos.botonMapa, (pressed || deshabilitado) && { opacity: 0.5 }]}
      accessibilityRole="button"
    >
      <Text style={estilos.botonMapaTexto}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  controles: { position: 'absolute', top: espacio.m, right: espacio.m, gap: espacio.s },
  botonMapa: {
    minWidth: ALTO_TOCABLE,
    minHeight: ALTO_TOCABLE,
    borderRadius: 12,
    backgroundColor: colores.tarjeta,
    borderWidth: 2,
    borderColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.s,
  },
  botonMapaTexto: { fontSize: tamanoTexto.normal, fontWeight: '700', color: colores.primario },
});
