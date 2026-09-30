import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icono, type NombreIcono } from './Icono';
import { ALTO_TOCABLE, colores, espacio, radio, tamanoTexto } from './tema';

interface Props {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  variante?: 'primario' | 'secundario' | 'peligro' | 'texto';
  icono?: NombreIcono;
}

const aspecto = {
  primario: { fondo: colores.primario, texto: colores.blanco, borde: colores.primario },
  secundario: { fondo: colores.tarjeta, texto: colores.primario, borde: colores.bordeFuerte },
  peligro: { fondo: colores.tarjeta, texto: colores.error, borde: colores.error },
  texto: { fondo: 'transparent', texto: colores.acento, borde: 'transparent' },
};

export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario', icono }: Props) {
  const inactivo = deshabilitado || cargando;
  const a = aspecto[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        { backgroundColor: a.fondo, borderColor: a.borde },
        variante === 'texto' && estilos.soloTexto,
        pressed && { opacity: 0.75 },
        inactivo && { opacity: 0.5 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={a.texto} />
      ) : (
        <View style={estilos.fila}>
          {icono ? <Icono nombre={icono} color={a.texto} tamano={22} /> : null}
          <Text style={[estilos.titulo, { color: a.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: ALTO_TOCABLE,
    borderRadius: radio.m,
    borderWidth: 2,
    paddingHorizontal: espacio.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloTexto: { minHeight: 48 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  titulo: { fontSize: tamanoTexto.grande - 1, fontWeight: '700' },
});
