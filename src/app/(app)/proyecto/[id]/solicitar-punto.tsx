import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { borrarDeCache, conCache, esFalloDeRed, guardarCache, leerCache } from '@/almacen/cache';
import { errorDeCampo, mensajeDeError } from '@/api/errores';
import { listarPozos } from '@/api/proyectos';
import { solicitarPunto, type NuevaSolicitud } from '@/api/solicitudes';
import { direccion, formatoDistancia, ordenarPorDistancia } from '@/geo/distancia';
import { formatoUtm } from '@/geo/utm';
import { coordenadasValidas } from '@/mapa/geojson';
import { LecturaGps } from '@/ubicacion/LecturaGps';
import { useUbicacion } from '@/ubicacion/useUbicacion';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { Campo } from '@/ui/Campo';
import { Dato, Tarjeta, TituloSeccion } from '@/ui/Tarjeta';
import { colores, espacio, tamanoTexto } from '@/ui/tema';

type Borrador = NuevaSolicitud & { fijada: string };

/**
 * El alumno está junto a un pozo que no está en el proyecto: manda su
 * ubicación y un nombre, y el profesor lo aprueba o rechaza desde la web
 * (le llega un correo). Necesita señal; sin ella, lo escrito se guarda en el
 * teléfono para enviarlo después.
 */
export default function SolicitarPunto() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const claveBorrador = `solicitud_borrador_${id}`;
  const consultas = useQueryClient();

  const [previo] = useState(() => leerCache<Borrador>(claveBorrador)?.datos ?? null);
  const [fijada, setFijada] = useState<Pick<Borrador, 'lat' | 'lng' | 'alt' | 'fijada'> | null>(previo);
  const [clave, setClave] = useState(previo?.clave_identificacion ?? '');
  const [descripcion, setDescripcion] = useState(previo?.descripcion ?? '');
  const [faltaClave, setFaltaClave] = useState(false);

  const ubicacion = useUbicacion();
  const yo = ubicacion.estado === 'ok' ? ubicacion : null;

  const pozos = useQuery({
    queryKey: ['pozos', id],
    queryFn: () => conCache(`pozos_${id}`, () => listarPozos(id)),
  });
  const radio = pozos.data?.datos.radio_metros ?? 500;

  // El pozo del proyecto más cercano al punto fijado (o a donde estás).
  const referencia = fijada ?? yo;
  const cercano = useMemo(() => {
    if (!referencia || !pozos.data) return null;
    return ordenarPorDistancia(referencia, pozos.data.datos.puntos.filter(coordenadasValidas))[0] ?? null;
  }, [referencia, pozos.data]);

  // Lo escrito se conserva aunque se cierre la app o no haya señal.
  useEffect(() => {
    if (!fijada) return;
    guardarCache<Borrador>(claveBorrador, { ...fijada, clave_identificacion: clave, descripcion });
  }, [fijada, clave, descripcion, claveBorrador]);

  const enviar = useMutation({
    mutationFn: () => solicitarPunto(id, { lat: fijada!.lat, lng: fijada!.lng, alt: fijada!.alt, clave_identificacion: clave.trim(), descripcion }),
    onSuccess: () => {
      borrarDeCache(claveBorrador);
      consultas.invalidateQueries({ queryKey: ['solicitudes'] });
    },
  });

  function intentarEnvio() {
    if (!clave.trim()) {
      setFaltaClave(true);
      return;
    }
    enviar.mutate();
  }

  if (enviar.data) {
    const r = enviar.data;
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Aviso tipo="exito" titulo="Solicitud enviada" texto={r.message} />
        <Tarjeta>
          <Dato icono="water" texto={clave.trim()} color={colores.texto} fuerte />
          {r.utm ? <Dato icono="grid-outline" texto={`${formatoUtm(r.utm)} · WGS84`} /> : null}
          <Dato icono="time-outline" texto="Estado: pendiente de revisión" />
        </Tarjeta>
        <Text style={estilos.nota}>
          Cuando el profesor la apruebe, el pozo aparecerá en el mapa del proyecto. Puedes seguir tomando la muestra
          ahora: la asignará al pozo nuevo.
        </Text>
        <Boton titulo="Volver al proyecto" icono="arrow-back" onPress={() => router.back()} />
        <Boton
          titulo="Mis solicitudes"
          variante="secundario"
          icono="list"
          onPress={() => router.replace({ pathname: '/solicitudes', params: { proyecto: id } })}
        />
      </ScrollView>
    );
  }

  const sinRed = enviar.error && esFalloDeRed(enviar.error);
  const errorClave = enviar.error ? errorDeCampo(enviar.error, 'clave_identificacion') : undefined;

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.intro}>
          ¿Estás junto a un pozo que no aparece en el proyecto? Envía su ubicación y el profesor lo revisará.
        </Text>

        <TituloSeccion texto="1 · Ubicación del pozo" />
        <Tarjeta>
          <LecturaGps ubicacion={ubicacion} />
          <Boton
            titulo={fijada ? 'Actualizar ubicación' : 'Usar esta ubicación'}
            icono="pin"
            variante={fijada ? 'secundario' : 'primario'}
            onPress={() => yo && setFijada({ lat: yo.lat, lng: yo.lng, alt: yo.alt, fijada: new Date().toISOString() })}
            deshabilitado={!yo}
          />
          {fijada ? (
            <Dato
              icono="checkmark-circle"
              color={colores.exito}
              fuerte
              texto={`Fijada: ${fijada.lat.toFixed(6)}, ${fijada.lng.toFixed(6)}`}
            />
          ) : null}
        </Tarjeta>

        {cercano && cercano.distancia <= radio ? (
          <Aviso
            tipo="aviso"
            titulo="Hay un pozo del proyecto muy cerca"
            texto={`${cercano.clave_identificacion} está a ${formatoDistancia(cercano.distancia)} al ${direccion(cercano.rumbo)}, dentro del radio de ${radio} m. Si es el mismo pozo, no hace falta solicitarlo: haz la captura normal.`}
          />
        ) : null}

        <TituloSeccion texto="2 · Datos del pozo" />
        <Campo
          etiqueta="Nombre o clave del pozo"
          placeholder="Ej. Noria El Mezquite"
          value={clave}
          onChangeText={(t) => {
            setClave(t);
            setFaltaClave(false);
          }}
          maxLength={255}
          error={faltaClave ? 'Escribe cómo se llama o identifica el pozo.' : errorClave}
          ayuda="Como lo conoce la gente del lugar o lo que diga el letrero."
        />
        <Campo
          etiqueta="Descripción (opcional)"
          placeholder="Ej. Junto al corral, a la izquierda del camino"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          maxLength={1000}
          style={{ minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }}
        />

        {sinRed ? (
          <Aviso
            tipo="aviso"
            titulo="Sin conexión"
            texto="La solicitud necesita señal. Lo que escribiste quedó guardado en el teléfono: vuelve a esta pantalla y envíala cuando tengas conexión."
          />
        ) : enviar.error && !errorClave ? (
          <Aviso texto={mensajeDeError(enviar.error)} />
        ) : null}

        <View style={{ gap: espacio.s, marginTop: espacio.s }}>
          <Boton titulo="Enviar solicitud" icono="send" onPress={intentarEnvio} cargando={enviar.isPending} deshabilitado={!fijada} />
          {!fijada ? <Text style={estilos.nota}>Primero fija la ubicación del pozo.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.m, gap: espacio.m, paddingBottom: espacio.xl * 2 },
  intro: { fontSize: tamanoTexto.normal, color: colores.texto, lineHeight: 24 },
  nota: { fontSize: tamanoTexto.dato, color: colores.textoSuave, textAlign: 'center', lineHeight: 21 },
});
