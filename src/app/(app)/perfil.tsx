import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEstadoCola } from '@/cola/estado';
import { API_URL } from '@/config';
import { cerrarSesion } from '@/sesion/acciones';
import { useSesion } from '@/sesion/almacen';
import { Boton } from '@/ui/Boton';
import { Icono, type NombreIcono } from '@/ui/Icono';
import { Insignia, Tarjeta, TituloSeccion } from '@/ui/Tarjeta';
import { colores, espacio, tamanoTexto } from '@/ui/tema';

const NOMBRE_ROL = { ALUMNO: 'Alumno', PROFESOR: 'Profesor', ADMIN: 'Administrador' } as const;

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export default function Perfil() {
  const usuario = useSesion((s) => s.usuario);
  const [saliendo, setSaliendo] = useState(false);
  const { pendientes, errores } = useEstadoCola((s) => s.conteo);

  function confirmarSalida() {
    const sinEnviar = pendientes + errores;
    if (!sinEnviar) return salir();

    // Las capturas no se borran: quedan ligadas a esta cuenta en el teléfono
    // y salen solas cuando vuelva a entrar.
    Alert.alert(
      'Tienes capturas sin enviar',
      `${sinEnviar} captura(s) siguen en el teléfono. No se pierden: se enviarán cuando vuelvas a entrar con esta cuenta. Mientras tanto nadie más las verá.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: salir },
      ],
    );
  }

  async function salir() {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } finally {
      setSaliendo(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={estilos.cabecera}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{usuario ? iniciales(usuario.nombreCompleto) : '?'}</Text>
        </View>
        <Text style={estilos.nombre}>{usuario?.nombreCompleto}</Text>
        {usuario ? <Insignia texto={NOMBRE_ROL[usuario.rol] ?? usuario.rol} tono="info" icono="school-outline" /> : null}
      </View>

      <TituloSeccion texto="Cuenta" />
      <Tarjeta style={{ gap: 0, paddingVertical: espacio.xs }}>
        <Fila icono="mail-outline" etiqueta="Correo" valor={usuario?.email ?? ''} />
        <Fila icono="server-outline" etiqueta="Servidor" valor={API_URL} ultima />
      </Tarjeta>

      <TituloSeccion texto="En este teléfono" />
      <Tarjeta style={{ gap: 0, paddingVertical: espacio.xs }}>
        <Fila
          icono="document-text-outline"
          etiqueta="Mis capturas"
          valor={pendientes + errores ? `${pendientes + errores} sin enviar` : 'Todo enviado'}
          onPress={() => router.push('/capturas')}
        />
        <Fila icono="add-circle-outline" etiqueta="Mis solicitudes de punto" onPress={() => router.push('/solicitudes')} ultima />
      </Tarjeta>

      <View style={{ flex: 1, minHeight: espacio.l }} />

      <Boton titulo="Cerrar sesión" icono="log-out-outline" variante="peligro" onPress={confirmarSalida} cargando={saliendo} />
    </ScrollView>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
  onPress,
  ultima,
}: {
  icono: NombreIcono;
  etiqueta: string;
  valor?: string;
  onPress?: () => void;
  ultima?: boolean;
}) {
  const contenido = (
    <View style={[estilos.fila, !ultima && estilos.filaBorde]}>
      <Icono nombre={icono} color={colores.acento} tamano={22} />
      <View style={{ flex: 1 }}>
        <Text style={estilos.etiqueta}>{etiqueta}</Text>
        {valor ? (
          <Text style={estilos.valor} numberOfLines={2}>
            {valor}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icono nombre="chevron-forward" color={colores.textoTenue} tamano={20} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {contenido}
    </Pressable>
  ) : (
    contenido
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.m, gap: espacio.s, flexGrow: 1 },
  cabecera: { alignItems: 'center', gap: espacio.s, paddingVertical: espacio.m },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 34, fontWeight: '800', color: colores.blanco },
  nombre: { fontSize: tamanoTexto.grande + 2, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: espacio.m, minHeight: 56 },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colores.borde },
  etiqueta: { fontSize: tamanoTexto.normal - 1, fontWeight: '600', color: colores.texto },
  valor: { fontSize: tamanoTexto.dato - 1, color: colores.textoSuave },
});
