import { StyleSheet, Text, View } from 'react-native';

import { Icono, type NombreIcono } from './Icono';
import { colores, espacio, radio, tamanoTexto, tonos } from './tema';

interface Props {
  texto: string;
  tipo?: 'error' | 'exito' | 'info' | 'aviso';
  titulo?: string;
}

const ICONOS: Record<NonNullable<Props['tipo']>, NombreIcono> = {
  error: 'alert-circle',
  exito: 'checkmark-circle',
  info: 'information-circle',
  aviso: 'warning',
};

export function Aviso({ texto, tipo = 'error', titulo }: Props) {
  const { color, fondo } = tonos[tipo];

  return (
    <View accessibilityRole="alert" style={[estilos.caja, { backgroundColor: fondo, borderLeftColor: color }]}>
      <Icono nombre={ICONOS[tipo]} color={color} tamano={24} />
      <View style={estilos.cuerpo}>
        {titulo ? <Text style={[estilos.titulo, { color }]}>{titulo}</Text> : null}
        <Text style={[estilos.texto, { color: titulo ? colores.texto : color }]}>{texto}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    gap: espacio.s,
    borderRadius: radio.m,
    borderLeftWidth: 5,
    padding: espacio.m,
    alignItems: 'flex-start',
  },
  cuerpo: { flex: 1, gap: 2 },
  titulo: { fontSize: tamanoTexto.normal, fontWeight: '700' },
  texto: { fontSize: tamanoTexto.dato + 1, lineHeight: 22 },
});
