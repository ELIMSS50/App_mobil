import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icono } from './Icono';
import { colores, espacio, radio, tamanoTexto } from './tema';

interface Props {
  etiqueta: string;
  opciones: string[];
  valor: string | null;
  onCambio: (v: string | null) => void;
}

/** Enum como botones grandes: más fácil que una lista desplegable con guantes. */
export function Opciones({ etiqueta, opciones, valor, onCambio }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.fila} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const activa = o === valor;
          return (
            <Pressable
              key={o}
              onPress={() => onCambio(activa ? null : o)}
              style={({ pressed }) => [estilos.chip, activa && estilos.chipActivo, pressed && { opacity: 0.75 }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
            >
              {activa ? <Icono nombre="checkmark" color={colores.blanco} tamano={18} /> : null}
              <Text style={[estilos.chipTexto, activa && { color: colores.blanco }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface PropsSiNo {
  etiqueta: string;
  valor: boolean | null;
  onCambio: (v: boolean | null) => void;
}

export function SiNo({ etiqueta, valor, onCambio }: PropsSiNo) {
  const aTexto = valor === null ? null : valor ? 'Sí' : 'No';
  return (
    <Opciones
      etiqueta={etiqueta}
      opciones={['Sí', 'No']}
      valor={aTexto}
      onCambio={(v) => onCambio(v === null ? null : v === 'Sí')}
    />
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { fontSize: tamanoTexto.dato + 1, fontWeight: '600', color: colores.texto },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: espacio.m,
    borderRadius: radio.total,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    backgroundColor: colores.blanco,
  },
  chipActivo: { backgroundColor: colores.acento, borderColor: colores.acento },
  chipTexto: { fontSize: tamanoTexto.normal, fontWeight: '600', color: colores.texto },
});
