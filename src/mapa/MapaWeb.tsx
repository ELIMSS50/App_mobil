import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Aviso } from '@/ui/Aviso';
import { ALTO_TOCABLE, colores, espacio, tamanoTexto } from '@/ui/tema';

import { estiloEnLinea, FUENTE_ETIQUETAS, GLYPHS_REMOTOS } from './estilo';
import { circulo } from './geojson';

// Mapa para Expo Go: MapLibre GL JS dentro de un WebView, que Expo Go sí trae.
// Solo con señal (la librería y el fondo vienen de internet); el mapa sin
// conexión (.pmtiles) sigue siendo del mapa nativo, MapaPozos.tsx.

const VERSION_MAPLIBRE = '5';

interface Props {
  caja: [number, number, number, number] | null;
  yo: { lat: number; lng: number } | null;
  radio: number;
  pozos: GeoJSON.FeatureCollection<GeoJSON.Point>;
  onSeleccionar: (idPozo: number | null) => void;
}

interface Datos {
  yo: { lat: number; lng: number } | null;
  radio: GeoJSON.FeatureCollection;
  pozos: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

const MARGEN = { top: 60, bottom: 60, left: 40, right: 40 };

export function MapaWeb({ caja, yo, radio, pozos, onSeleccionar }: Props) {
  const web = useRef<WebView>(null);
  const [error, setError] = useState(false);

  const datos: Datos = useMemo(
    () => ({
      yo,
      radio: { type: 'FeatureCollection', features: yo ? [circulo(yo.lat, yo.lng, radio)] : [] },
      pozos,
    }),
    [yo, radio, pozos],
  );

  // El HTML se arma una sola vez con la vista inicial; lo que cambia después
  // (GPS, pozos) se inyecta sin recargar la página.
  const [html] = useState(() => paginaMapa(datos, caja));

  const enviarDatos = () => web.current?.injectJavaScript(`window.actualizar(${JSON.stringify(datos)}); true;`);
  useEffect(enviarDatos, [datos]);

  function alMensaje(e: WebViewMessageEvent) {
    const m = JSON.parse(e.nativeEvent.data) as { tipo: 'seleccionar'; id: number | null } | { tipo: 'error' };
    if (m.tipo === 'error') setError(true);
    else onSeleccionar(m.id);
  }

  const ejecutar = (js: string) => web.current?.injectJavaScript(`${js}; true;`);

  if (error) {
    return (
      <View style={{ padding: espacio.m }}>
        <Aviso tipo="info" texto="El mapa no cargó: en Expo Go necesita señal. Usa la lista de pozos." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={web}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={alMensaje}
        onError={() => setError(true)}
        onLoadEnd={enviarDatos}
        setBuiltInZoomControls={false}
        overScrollMode="never"
        bounces={false}
      />

      <View style={estilos.controles}>
        <BotonMapa
          texto="Yo"
          deshabilitado={!yo}
          onPress={() => yo && ejecutar(`mapa.flyTo({ center: [${yo.lng}, ${yo.lat}], zoom: 16, duration: 800 })`)}
        />
        <BotonMapa
          texto="Todos"
          deshabilitado={!caja}
          onPress={() => caja && ejecutar(`mapa.fitBounds(${JSON.stringify(caja)}, { padding: ${JSON.stringify(MARGEN)}, duration: 800 })`)}
        />
      </View>
    </View>
  );
}

function paginaMapa(datos: Datos, caja: [number, number, number, number] | null): string {
  const vista = caja
    ? { bounds: caja, fitBoundsOptions: { padding: MARGEN } }
    : datos.yo
      ? { center: [datos.yo.lng, datos.yo.lat], zoom: 15 }
      : { center: [-100.97, 22.15], zoom: 5 };
  const estilo = { ...estiloEnLinea(), glyphs: GLYPHS_REMOTOS };
  const cdn = `https://unpkg.com/maplibre-gl@${VERSION_MAPLIBRE}/dist`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${cdn}/maplibre-gl.css">
<style>html, body, #mapa { margin: 0; height: 100%; background: #E2E8F0; }</style>
</head><body>
<div id="mapa"></div>
<script>
  function avisar(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  window.actualizar = function () {};
</script>
<script src="${cdn}/maplibre-gl.js" onerror="avisar({ tipo: 'error' })"></script>
<script>
  var datos = ${JSON.stringify(datos)};
  var listo = false;
  var mapa = new maplibregl.Map(Object.assign({
    container: 'mapa',
    style: ${JSON.stringify(estilo)},
    attributionControl: { compact: true },
    maxZoom: 19,
  }, ${JSON.stringify(vista)}));
  mapa.addControl(new maplibregl.NavigationControl({ showZoom: false }), 'top-left');
  mapa.addControl(new maplibregl.ScaleControl(), 'bottom-left');

  function puntoYo(d) {
    return { type: 'FeatureCollection', features: d.yo ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [d.yo.lng, d.yo.lat] } }] : [] };
  }

  window.actualizar = function (d) {
    datos = d;
    if (!listo) return;
    mapa.getSource('radio').setData(d.radio);
    mapa.getSource('pozos').setData(d.pozos);
    mapa.getSource('yo').setData(puntoYo(d));
  };

  mapa.on('load', function () {
    mapa.addSource('radio', { type: 'geojson', data: datos.radio });
    mapa.addLayer({ id: 'radio-relleno', type: 'fill', source: 'radio', paint: { 'fill-color': '#2563EB', 'fill-opacity': 0.08 } });
    mapa.addLayer({ id: 'radio-borde', type: 'line', source: 'radio', paint: { 'line-color': '#2563EB', 'line-width': 1.5, 'line-dasharray': [2, 2] } });

    mapa.addSource('pozos', { type: 'geojson', data: datos.pozos });
    mapa.addLayer({ id: 'pozos-punto', type: 'circle', source: 'pozos', paint: {
      'circle-radius': ['case', ['get', 'cercano'], 10, 7],
      'circle-color': ['case', ['get', 'cercano'], '#EA580C', '${colores.primario}'],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 2,
    } });
    mapa.addLayer({ id: 'pozos-clave', type: 'symbol', source: 'pozos', minzoom: 11, layout: {
      'text-field': ['get', 'clave'],
      'text-font': ['${FUENTE_ETIQUETAS}'],
      'text-size': 13,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
      'text-optional': true,
    }, paint: { 'text-color': '${colores.primario}', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 } });

    mapa.addSource('yo', { type: 'geojson', data: puntoYo(datos) });
    mapa.addLayer({ id: 'yo-halo', type: 'circle', source: 'yo', paint: { 'circle-radius': 16, 'circle-color': '#2563EB', 'circle-opacity': 0.2 } });
    mapa.addLayer({ id: 'yo-punto', type: 'circle', source: 'yo', paint: {
      'circle-radius': 7, 'circle-color': '#2563EB', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2,
    } });

    listo = true;
  });

  mapa.on('click', function (e) {
    var h = 16;
    var f = mapa.queryRenderedFeatures([[e.point.x - h, e.point.y - h], [e.point.x + h, e.point.y + h]], { layers: ['pozos-punto'] })[0];
    avisar({ tipo: 'seleccionar', id: f ? f.properties.id : null });
  });
</script>
</body></html>`;
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
