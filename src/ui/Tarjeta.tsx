import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icono, type NombreIcono } from './Icono';
import { colores, espacio, radio, sombra, tamanoTexto, tonos, type Tono } from './tema';

interface PropsTarjeta {
  children: ReactNode;
  onPress?: () => void;
  deshabilitada?: boolean;
  /** Barra de color a la izquierda para marcar el estado. */
  tono?: Tono;
  style?: StyleProp<ViewStyle>;
  etiquetaAccesible?: string;
}

/** Contenedor blanco con sombra suave. Con `onPress` se vuelve tocable. */
export function Tarjeta({ children, onPress, deshabilitada, tono, style, etiquetaAccesible }: PropsTarjeta) {
  const borde = tono ? { borderLeftWidth: 5, borderLeftColor: tonos[tono].color } : null;

  if (!onPress) return <View style={[estilos.tarjeta, borde, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible}
      style={({ pressed }) => [estilos.tarjeta, borde, style, pressed && { opacity: 0.8 }]}
    >
      {children}
    </Pressable>
  );
}

/** Pastilla de estado: "En cola", "Aprobada", "Folio 41"… */
export function Insignia({ texto, tono = 'neutro', icono }: { texto: string; tono?: Tono; icono?: NombreIcono }) {
  const { color, fondo } = tonos[tono];
  return (
    <View style={[estilos.insignia, { backgroundColor: fondo }]}>
      {icono ? <Icono nombre={icono} color={color} tamano={15} /> : null}
      <Text style={[estilos.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

/** Ícono + texto en una línea, para datos de una tarjeta. */
export function Dato({ icono, texto, color = colores.textoSuave, fuerte }: { icono: NombreIcono; texto: string; color?: string; fuerte?: boolean }) {
  return (
    <View style={estilos.dato}>
      <Icono nombre={icono} color={color} tamano={17} />
      <Text style={[estilos.datoTexto, { color }, fuerte && { fontWeight: '700' }]}>{texto}</Text>
    </View>
  );
}

/** Título pequeño en mayúsculas que separa grupos de una lista. */
export function TituloSeccion({ texto, derecha }: { texto: string; derecha?: ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.seccionTexto} accessibilityRole="header">
        {texto.toUpperCase()}
      </Text>
      {derecha}
    </View>
  );
}

/** Pantalla o lista vacía: ícono grande, título y explicación. */
export function Vacio({ icono, titulo, texto, children }: { icono: NombreIcono; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <View style={estilos.vacio}>
      <View style={estilos.vacioIcono}>
        <Icono nombre={icono} color={colores.acento} tamano={40} />
      </View>
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {texto ? <Text style={estilos.vacioTexto}>{texto}</Text> : null}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.l,
    padding: espacio.m,
    gap: espacio.s,
    ...sombra,
  },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radio.total,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  insigniaTexto: { fontSize: tamanoTexto.pequeno - 1, fontWeight: '700' },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datoTexto: { flexShrink: 1, fontSize: tamanoTexto.dato },
  seccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espacio.m,
    marginBottom: espacio.xs,
  },
  seccionTexto: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: colores.textoSuave },
  vacio: { alignItems: 'center', gap: espacio.s, paddingVertical: espacio.xl, paddingHorizontal: espacio.m },
  vacioIcono: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colores.acentoFondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.s,
  },
  vacioTitulo: { fontSize: tamanoTexto.grande, fontWeight: '700', color: colores.texto, textAlign: 'center' },
  vacioTexto: { fontSize: tamanoTexto.normal - 1, color: colores.textoSuave, textAlign: 'center', lineHeight: 22 },
});
