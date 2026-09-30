import { Pressable, StyleSheet, Text } from 'react-native';

import { Icono, type NombreIcono } from './Icono';
import { colores } from './tema';

/** Botón de la barra superior: ícono y, si cabe, un texto corto. */
export function BotonCabecera({ icono, texto, etiqueta, onPress }: { icono: NombreIcono; texto?: string; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [estilos.boton, pressed && { opacity: 0.6 }]}
    >
      <Icono nombre={icono} color={colores.blanco} tamano={24} />
      {texto ? <Text style={estilos.texto}>{texto}</Text> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, minHeight: 44 },
  texto: { color: colores.blanco, fontSize: 16, fontWeight: '600' },
});
