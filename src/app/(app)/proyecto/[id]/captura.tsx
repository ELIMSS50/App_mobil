import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { conCache, leerCache } from '@/almacen/cache';
import { obtenerFormulario } from '@/api/capturas';
import { mensajeDeError } from '@/api/errores';
import { listarPozos } from '@/api/proyectos';
import type { CampoFormulario, Formulario, Proyecto } from '@/api/tipos';
import { borrarBorrador, guardarBorrador, leerBorrador } from '@/captura/borrador';
import { CampoDinamico } from '@/captura/CampoDinamico';
import { claveEnvase } from '@/captura/erroresServidor';
import { borrarFoto, obtenerFoto, type OrigenFoto } from '@/captura/foto';
import { type Captura, fechaLocal } from '@/captura/modelo';
import { claveMedicion, evaluar, mensaje, revisarCaptura } from '@/captura/validacion';
import { useEstadoCola } from '@/cola/estado';
import { useFilaCola } from '@/cola/hooks';
import { corregirEnCola, descartarDeCola, filaDeCola, guardarEnCola, sincronizar } from '@/cola/sincronizador';
import { direccion, formatoDistancia, ordenarPorDistancia } from '@/geo/distancia';
import { coordenadasValidas } from '@/mapa/geojson';
import { LecturaGps } from '@/ubicacion/LecturaGps';
import { useUbicacion } from '@/ubicacion/useUbicacion';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { Campo } from '@/ui/Campo';
import { Icono } from '@/ui/Icono';
import { Dato, Insignia, Tarjeta } from '@/ui/Tarjeta';
import { colores, espacio, radio as radios, tamanoTexto } from '@/ui/tema';

type Paso = 1 | 2 | 3;

/** Campos de Muestra que la pantalla resuelve por su cuenta. */
const CAMPOS_AUTOMATICOS = ['fechaHoraToma', 'fotografia_url'];

export default function NuevaCaptura() {
  const params = useLocalSearchParams<{ id: string; cola?: string }>();
  const id = Number(params.id);

  const formularioQuery = useQuery({
    queryKey: ['formulario', id],
    queryFn: () => conCache(`formulario_${id}`, () => obtenerFormulario(id)),
  });
  const formulario = formularioQuery.data?.datos;

  // Con `cola`, se corrige una captura guardada que aún no se envía (o que el
  // servidor rechazó). Sin ella, es una nueva y se trabaja sobre el borrador.
  const [enCola] = useState(() => (params.cola ? filaDeCola(Number(params.cola)) : null));
  const editando = !!enCola;

  const [borradorPrevio] = useState(() => (editando ? null : leerBorrador(id)));
  const [captura, setCaptura] = useState<Captura | null>(enCola?.captura ?? null);
  const [paso, setPaso] = useState<Paso>(editando ? 2 : 1);
  const [errorGeneral, setErrorGeneral] = useState<string[]>(enCola?.estado === 'ERROR' && enCola.error ? [enCola.error] : []);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>(enCola?.erroresCampo ?? {});
  const [guardada, setGuardada] = useState<number | null>(null);

  // Cada cambio de una captura nueva queda guardado en el teléfono.
  useEffect(() => {
    if (captura && !editando && guardada == null) guardarBorrador(captura);
  }, [captura, editando, guardada]);

  const revision = useMemo(
    () => (captura && formulario ? revisarCaptura(captura, formulario.parametros) : null),
    [captura, formulario],
  );

  function actualizar(cambio: (c: Captura) => Captura) {
    setCaptura((c) => (c ? cambio(c) : c));
    setErroresServidor({});
  }

  /** Guardar nunca depende de la red: va a la cola y el envío sale solo. */
  function guardar() {
    if (!captura || !revision) return;
    if (Object.keys(revision.errores).length) {
      setPaso(revision.errores.ubicacion ? 1 : 2);
      return;
    }

    if (enCola) {
      if (!corregirEnCola(enCola.id, captura)) {
        setErrorGeneral(['Esta captura ya se envió y no se puede modificar desde la app.']);
        return;
      }
      setGuardada(enCola.id);
    } else {
      const nombre = leerCache<Proyecto[]>('proyectos')?.datos.find((p) => p.id === id)?.nombre ?? null;
      setGuardada(guardarEnCola(captura, nombre));
      borrarBorrador(id);
    }
    sincronizar({ catalogos: false });
  }

  function descartar() {
    if (enCola) descartarDeCola(enCola.id);
    else {
      borrarFoto(captura?.foto ?? null);
      borrarBorrador(id);
    }
    router.back();
  }

  if (guardada != null) return <Guardada idCola={guardada} proyectoId={id} />;

  if (editando && enCola?.estado === 'ENVIADA') {
    return (
      <View style={estilos.centro}>
        <Aviso tipo="info" texto="Esta captura ya se envió; solo el profesor puede modificarla desde la web." />
      </View>
    );
  }

  if (!formulario) {
    return (
      <View style={estilos.centro}>
        {formularioQuery.error ? (
          <Aviso texto={`${mensajeDeError(formularioQuery.error)} Abre el proyecto una vez con señal para poder capturar sin ella.`} />
        ) : (
          <Text style={estilos.texto}>Cargando formulario…</Text>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `${editando ? 'Corregir captura' : 'Nueva captura'} (${paso}/3)` }} />
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Pasos actual={paso} />

        {formularioQuery.data?.desdeCache ? (
          <Aviso tipo="info" texto="Sin conexión: se usa el formulario guardado en el teléfono." />
        ) : null}

        {paso === 1 ? (
          <PasoUbicacion
            proyectoId={id}
            captura={captura}
            borradorPrevio={captura ? null : borradorPrevio}
            onRetomar={(b) => {
              setCaptura(b);
              setPaso(2);
            }}
            onDescartarPrevio={() => {
              borrarFoto(borradorPrevio?.foto ?? null);
              borrarBorrador(id);
            }}
            onFijar={(lat, lng, alt, precision) => {
              const ahora = fechaLocal(new Date());
              setCaptura((c) =>
                c
                  ? { ...c, lat, lng, alt, precision, fechaHoraToma: ahora }
                  : {
                      uuid: Crypto.randomUUID(),
                      proyectoId: id,
                      lat,
                      lng,
                      alt,
                      precision,
                      fechaHoraToma: ahora,
                      mediciones: formulario.parametros.map((p) => ({ idParametro: p.id, numRepeticion: 1, valor: '' })),
                      envases: [],
                      modoCaptura: null,
                      observaciones: '',
                      foto: null,
                    },
              );
              setPaso(2);
            }}
          />
        ) : null}

        {paso === 2 && captura ? (
          <PasoMediciones
            formulario={formulario}
            captura={captura}
            errores={{ ...(revision?.errores ?? {}), ...erroresServidor }}
            onCambio={actualizar}
          />
        ) : null}

        {paso === 3 && captura ? (
          <PasoFinal
            formulario={formulario}
            captura={captura}
            advertencias={Object.values(revision?.advertencias ?? {}).length}
            onCambio={actualizar}
          />
        ) : null}

        {errorGeneral.map((e) => (
          <Aviso key={e} texto={e} />
        ))}

        {captura ? (
          <View style={estilos.navegacion}>
            {paso === 2 && revision?.errores.mediciones ? <Text style={estilos.error}>{revision.errores.mediciones}</Text> : null}
            {paso < 3 ? (
              <Boton titulo="Siguiente" icono="arrow-forward" onPress={() => setPaso((p) => (p + 1) as Paso)} />
            ) : (
              <Boton titulo="Guardar y enviar" icono="cloud-upload-outline" onPress={guardar} />
            )}
            {paso > 1 ? (
              <Boton titulo="Atrás" icono="arrow-back" variante="secundario" onPress={() => setPaso((p) => (p - 1) as Paso)} />
            ) : null}
            <Boton titulo="Descartar captura" icono="trash-outline" variante="texto" onPress={descartar} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Paso 1: ubicación ─────────────────────────────────────────────────────────

function PasoUbicacion({
  proyectoId,
  captura,
  borradorPrevio,
  onRetomar,
  onDescartarPrevio,
  onFijar,
}: {
  proyectoId: number;
  captura: Captura | null;
  borradorPrevio: Captura | null;
  onRetomar: (b: Captura) => void;
  onDescartarPrevio: () => void;
  onFijar: (lat: number, lng: number, alt: number | null, precision: number | null) => void;
}) {
  const [previo, setPrevio] = useState(borradorPrevio);
  const ubicacion = useUbicacion();
  const pozos = useQuery({
    queryKey: ['pozos', proyectoId],
    queryFn: () => conCache(`pozos_${proyectoId}`, () => listarPozos(proyectoId)),
  });

  const yo = ubicacion.estado === 'ok' ? ubicacion : null;
  const cercano = useMemo(() => {
    if (!yo || !pozos.data) return null;
    return ordenarPorDistancia({ lat: yo.lat, lng: yo.lng }, pozos.data.datos.puntos.filter(coordenadasValidas))[0] ?? null;
  }, [yo, pozos.data]);
  const radio = pozos.data?.datos.radio_metros ?? 500;

  if (previo) {
    return (
      <Tarjeta tono="aviso">
        <Text style={estilos.titulo}>Tienes una captura sin terminar</Text>
        <Dato icono="time-outline" texto={`Tomada el ${previo.fechaHoraToma.replace('T', ' ')}`} />
        <Dato icono="navigate-outline" texto={`${previo.lat.toFixed(5)}, ${previo.lng.toFixed(5)}`} />
        <Boton titulo="Continuar esa captura" icono="play-outline" onPress={() => onRetomar(previo)} />
        <Boton
          titulo="Descartarla y empezar otra"
          icono="trash-outline"
          variante="peligro"
          onPress={() => {
            onDescartarPrevio();
            setPrevio(null);
          }}
        />
      </Tarjeta>
    );
  }

  return (
    <View style={estilos.bloque}>
      <Text style={estilos.titulo}>Ubicación</Text>
      <Text style={estilos.texto}>
        Párate junto al pozo y espera a que la precisión baje. La hora de la muestra es la del momento en que fijas
        la ubicación.
      </Text>

      <Tarjeta>
        <LecturaGps ubicacion={ubicacion} />
        {cercano ? (
          <View style={[estilos.cercano, { borderLeftColor: cercano.distancia <= radio ? colores.exito : colores.bordeFuerte }]}>
            <Text style={estilos.etiquetaChica}>POZO MÁS CERCANO · LO CONFIRMA EL PROFESOR</Text>
            <Text style={estilos.subtitulo}>
              {cercano.clave_identificacion} · {formatoDistancia(cercano.distancia)} al {direccion(cercano.rumbo)}
            </Text>
            {cercano.distancia > radio ? <Text style={estilos.nota}>Fuera del radio de {radio} m.</Text> : null}
          </View>
        ) : null}
      </Tarjeta>

      <Boton
        titulo={captura ? 'Actualizar ubicación' : 'Usar esta ubicación'}
        icono="pin"
        variante={captura ? 'secundario' : 'primario'}
        onPress={() => yo && onFijar(yo.lat, yo.lng, yo.alt, yo.precision)}
        deshabilitado={!yo}
      />
      {captura ? (
        <Dato
          icono="checkmark-circle"
          color={colores.exito}
          fuerte
          texto={`Fijada: ${captura.lat.toFixed(6)}, ${captura.lng.toFixed(6)} · ${captura.fechaHoraToma.replace('T', ' ')}`}
        />
      ) : null}
    </View>
  );
}

// ── Paso 2: mediciones y envases ─────────────────────────────────────────────

function PasoMediciones({
  formulario,
  captura,
  errores,
  onCambio,
}: {
  formulario: Formulario;
  captura: Captura;
  errores: Record<string, string>;
  onCambio: (f: (c: Captura) => Captura) => void;
}) {
  const camposEnvase = formulario.campos.filter((c) => c.tabla === 'MuestraColectada');

  return (
    <View style={estilos.bloque}>
      <Text style={estilos.titulo}>Mediciones de campo</Text>
      <Text style={estilos.nota}>Deja en blanco lo que no midas.</Text>

      {formulario.parametros.map((p) => {
        const filas = captura.mediciones.filter((m) => m.idParametro === p.id);
        return (
          <Tarjeta key={p.id}>
            {filas.map((m) => {
              const clave = claveMedicion(p.id, m.numRepeticion);
              const r = evaluar(m.valor, p);
              const aviso = errores[clave] ?? mensaje(r, p);
              return (
                <View key={clave} style={{ gap: 4 }}>
                  <Campo
                    etiqueta={`${p.nombre}${m.numRepeticion > 1 ? ` · repetición ${m.numRepeticion}` : ''}`}
                    sufijo={p.unidad}
                    value={m.valor}
                    onChangeText={(t) =>
                      onCambio((c) => ({
                        ...c,
                        mediciones: c.mediciones.map((x) =>
                          x.idParametro === p.id && x.numRepeticion === m.numRepeticion ? { ...x, valor: t } : x,
                        ),
                      }))
                    }
                    keyboardType="numbers-and-punctuation"
                    error={r === 'advertencia' && !errores[clave] ? undefined : (aviso ?? undefined)}
                  />
                  {r === 'advertencia' && !errores[clave] ? (
                    <View style={estilos.filaEnlace}>
                      <Icono nombre="warning" color={colores.aviso} tamano={18} />
                      <Text style={[estilos.advertencia, { flex: 1 }]}>{aviso}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Pressable
              onPress={() =>
                onCambio((c) => ({
                  ...c,
                  mediciones: [...c.mediciones, { idParametro: p.id, numRepeticion: filas.length + 1, valor: '' }],
                }))
              }
              hitSlop={8}
            >
              <View style={estilos.filaEnlace}>
                <Icono nombre="add" color={colores.acento} tamano={20} />
                <Text style={estilos.enlace}>Repetición de {p.nombre}</Text>
              </View>
            </Pressable>
          </Tarjeta>
        );
      })}

      {camposEnvase.length ? (
        <>
          <Text style={[estilos.titulo, { marginTop: espacio.m }]}>Muestras colectadas</Text>
          {captura.envases.map((envase, i) => (
            <Tarjeta key={i}>
              <View style={estilos.filaEnlace}>
                <Icono nombre="flask" color={colores.acento} tamano={20} />
                <Text style={estilos.subtitulo}>Envase {i + 1}</Text>
              </View>
              {camposEnvase.map((campo) => (
                <CampoDinamico
                  key={campo.campo}
                  campo={campo}
                  valor={envase[campo.campo]}
                  error={errores[claveEnvase(i, campo.campo)]}
                  onCambio={(v) =>
                    onCambio((c) => ({
                      ...c,
                      envases: c.envases.map((e, j) => (j === i ? { ...e, [campo.campo]: v } : e)),
                    }))
                  }
                />
              ))}
              <Pressable onPress={() => onCambio((c) => ({ ...c, envases: c.envases.filter((_, j) => j !== i) }))} hitSlop={8}>
                <View style={estilos.filaEnlace}>
                  <Icono nombre="trash-outline" color={colores.error} tamano={18} />
                  <Text style={[estilos.enlace, { color: colores.error }]}>Quitar envase</Text>
                </View>
              </Pressable>
            </Tarjeta>
          ))}
          <Boton
            titulo="Agregar envase"
            icono="add-circle-outline"
            variante="secundario"
            onPress={() => onCambio((c) => ({ ...c, envases: [...c.envases, {}] }))}
          />
        </>
      ) : null}
    </View>
  );
}

// ── Paso 3: datos de la muestra, foto y envío ────────────────────────────────

function PasoFinal({
  formulario,
  captura,
  advertencias,
  onCambio,
}: {
  formulario: Formulario;
  captura: Captura;
  advertencias: number;
  onCambio: (f: (c: Captura) => Captura) => void;
}) {
  const campos = formulario.campos.filter((c) => c.tabla === 'Muestra' && !CAMPOS_AUTOMATICOS.includes(c.campo));
  const pideFoto = formulario.campos.some((c) => c.tabla === 'Muestra' && c.campo === 'fotografia_url');
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const tomando = useRef(false);

  async function foto(origen: OrigenFoto) {
    if (tomando.current) return;
    tomando.current = true;
    setErrorFoto(null);
    try {
      const r = await obtenerFoto(origen, captura.uuid);
      if (r.ok) onCambio((c) => ({ ...c, foto: r.foto }));
      else if (r.motivo === 'sin-permiso') setErrorFoto('Sin permiso para usar la cámara o las fotos. Actívalo en los ajustes.');
    } catch {
      setErrorFoto('No se pudo procesar la foto. Intenta de nuevo.');
    } finally {
      tomando.current = false;
    }
  }

  const valorDe = (campo: CampoFormulario) =>
    campo.campo === 'modoCaptura' ? captura.modoCaptura : campo.campo === 'observaciones' ? captura.observaciones : null;

  return (
    <View style={estilos.bloque}>
      <Text style={estilos.titulo}>Datos de la muestra</Text>

      {campos.map((campo) => (
        <CampoDinamico
          key={campo.campo}
          campo={campo}
          valor={valorDe(campo)}
          onCambio={(v) =>
            onCambio((c) =>
              campo.campo === 'modoCaptura'
                ? { ...c, modoCaptura: typeof v === 'string' ? v : null }
                : campo.campo === 'observaciones'
                  ? { ...c, observaciones: typeof v === 'string' ? v : '' }
                  : c,
            )
          }
        />
      ))}

      {pideFoto ? (
        <View style={{ gap: espacio.s }}>
          <Text style={estilos.subtitulo}>Fotografía</Text>
          {captura.foto ? (
            <>
              <Image source={{ uri: captura.foto.uri }} style={estilos.foto} resizeMode="cover" accessibilityLabel="Foto de la captura" />
              <Pressable
                onPress={() => {
                  borrarFoto(captura.foto);
                  onCambio((c) => ({ ...c, foto: null }));
                }}
                hitSlop={8}
              >
                <View style={estilos.filaEnlace}>
                  <Icono nombre="trash-outline" color={colores.error} tamano={18} />
                  <Text style={[estilos.enlace, { color: colores.error }]}>Quitar foto</Text>
                </View>
              </Pressable>
            </>
          ) : null}
          <View style={estilos.filaBotones}>
            <View style={{ flex: 1 }}>
              <Boton titulo={captura.foto ? 'Otra foto' : 'Cámara'} icono="camera-outline" variante="secundario" onPress={() => foto('camara')} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton titulo="Galería" icono="images-outline" variante="secundario" onPress={() => foto('galeria')} />
            </View>
          </View>
          {errorFoto ? <Aviso texto={errorFoto} /> : null}
        </View>
      ) : null}

      <Tarjeta>
        <Text style={estilos.subtitulo}>Resumen</Text>
        <Dato icono="time-outline" texto={captura.fechaHoraToma.replace('T', ' ')} />
        <Dato icono="navigate-outline" texto={`${captura.lat.toFixed(6)}, ${captura.lng.toFixed(6)}`} />
        <Dato
          icono="flask-outline"
          texto={`${captura.mediciones.filter((m) => m.valor.trim()).length} mediciones · ${captura.envases.length} envases`}
        />
        <Dato icono={captura.foto ? 'image' : 'image-outline'} texto={captura.foto ? 'Con foto' : 'Sin foto'} />
        {advertencias ? (
          <Insignia texto={`${advertencias} valor(es) fuera del rango normal`} tono="aviso" icono="warning" />
        ) : null}
        {advertencias ? (
          <Text style={estilos.nota}>Se guardarán marcados para que el profesor los revise.</Text>
        ) : null}
      </Tarjeta>
    </View>
  );
}

// ── Después de guardar ───────────────────────────────────────────────────────

/** Sigue en vivo lo que pasa con la captura en la cola. */
function Guardada({ idCola, proyectoId }: { idCola: number; proyectoId: number }) {
  const fila = useFilaCola(idCola);
  const enLinea = useEstadoCola((s) => s.enLinea);
  const r = fila?.respuesta;
  const cercanos = r?.puntos_cercanos ?? [];

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <Stack.Screen options={{ title: 'Captura guardada' }} />

      {!fila ? null : fila.estado === 'ENVIADA' && r ? (
        <>
          <Aviso tipo="exito" texto={r.duplicada ? 'La captura ya estaba registrada en el servidor.' : 'Captura enviada. El profesor asignará el pozo.'} />
          <Tarjeta>
            <Dato icono="receipt-outline" texto={`Folio ${r.idMuestra}`} color={colores.texto} fuerte />
            {r.fuera_de_rango ? (
              <Insignia texto="Mediciones marcadas fuera de rango" tono="aviso" icono="warning" />
            ) : null}
            {cercanos.length ? (
              <Dato
                icono="water-outline"
                texto={`Pozos cerca: ${cercanos.map((p) => `${p.clave} (${formatoDistancia(p.distancia_m)})`).join(', ')}`}
              />
            ) : r.duplicada ? null : (
              <Dato icono="water-outline" texto="No hay pozos del proyecto dentro del radio." />
            )}
          </Tarjeta>
        </>
      ) : fila.estado === 'ERROR' ? (
        <>
          <Aviso texto={`El servidor pidió corregir la captura: ${fila.error ?? ''}`} />
          <Boton
            titulo="Corregir"
            icono="create-outline"
            onPress={() => router.replace({ pathname: '/proyecto/[id]/captura', params: { id: proyectoId, cola: idCola } })}
          />
        </>
      ) : (
        <Aviso
          tipo="info"
          texto={
            fila.estado === 'ENVIANDO'
              ? 'Enviando…'
              : enLinea
                ? 'Guardada en el teléfono. Enviando en cuanto el servidor responda…'
                : 'Guardada en el teléfono. Se enviará sola cuando vuelva la señal; no necesitas hacer nada más.'
          }
        />
      )}

      <Boton titulo="Volver al proyecto" icono="arrow-back" onPress={() => router.back()} />
      <Boton titulo="Ver mis capturas" icono="document-text-outline" variante="secundario" onPress={() => router.replace('/capturas')} />
    </ScrollView>
  );
}

// ── Indicador de pasos ───────────────────────────────────────────────────────

const NOMBRES_PASO = ['Ubicación', 'Mediciones', 'Muestra'];

function Pasos({ actual }: { actual: Paso }) {
  return (
    <View style={estilos.pasos} accessibilityLabel={`Paso ${actual} de 3: ${NOMBRES_PASO[actual - 1]}`}>
      {NOMBRES_PASO.map((nombre, i) => {
        const n = i + 1;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <View key={nombre} style={estilos.paso}>
            <View style={[estilos.pasoBarra, (hecho || activo) && { backgroundColor: colores.acento }]} />
            <View style={estilos.pasoFila}>
              <View style={[estilos.pasoNumero, (hecho || activo) && { backgroundColor: colores.acento, borderColor: colores.acento }]}>
                {hecho ? (
                  <Icono nombre="checkmark" color={colores.blanco} tamano={14} />
                ) : (
                  <Text style={[estilos.pasoNumeroTexto, activo && { color: colores.blanco }]}>{n}</Text>
                )}
              </View>
              <Text style={[estilos.pasoNombre, activo && { color: colores.texto, fontWeight: '700' }]}>{nombre}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.m, gap: espacio.m, paddingBottom: espacio.xl * 2 },
  centro: { flex: 1, justifyContent: 'center', padding: espacio.l },
  bloque: { gap: espacio.m },
  titulo: { fontSize: tamanoTexto.titulo - 4, fontWeight: '800', color: colores.texto },
  subtitulo: { fontSize: tamanoTexto.normal, fontWeight: '700', color: colores.texto },
  texto: { fontSize: tamanoTexto.normal, color: colores.texto },
  nota: { fontSize: 14, color: colores.textoSuave },
  error: { fontSize: 15, color: colores.error, fontWeight: '600' },
  advertencia: { fontSize: 15, color: colores.aviso, fontWeight: '600' },
  enlace: { fontSize: tamanoTexto.normal, color: colores.primario, fontWeight: '600', paddingVertical: espacio.s },
  cercano: { borderLeftWidth: 4, paddingLeft: espacio.s + 4, gap: 2, marginTop: espacio.xs },
  etiquetaChica: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colores.textoSuave },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pasos: { flexDirection: 'row', gap: espacio.s },
  paso: { flex: 1, gap: 6 },
  pasoBarra: { height: 4, borderRadius: 2, backgroundColor: colores.bordeFuerte },
  pasoFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pasoNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumeroTexto: { fontSize: 12, fontWeight: '800', color: colores.textoSuave },
  pasoNombre: { flexShrink: 1, fontSize: 13, color: colores.textoSuave },
  navegacion: { gap: espacio.s, marginTop: espacio.m },
  filaBotones: { flexDirection: 'row', gap: espacio.s },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radios.l, backgroundColor: colores.borde },
});
