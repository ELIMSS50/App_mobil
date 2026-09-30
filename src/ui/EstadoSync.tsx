import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useEstadoCola } from '@/cola/estado';

import { Icono, type NombreIcono } from './Icono';
import { colores, espacio, tamanoTexto } from './tema';

/**
 * Siempre a la vista: si hay señal y cuántas capturas faltan por enviar
 * (DISENO §5.3). Tocarla abre la lista de capturas del teléfono.
 */
export function EstadoSync() {
  const { enLinea, sincronizando, conteo } = useEstadoCola();
  const { pendientes, errores } = conteo;

  const partes = [enLinea ? 'En línea' : 'Sin conexión'];
  if (pendientes) partes.push(`${pendientes} por enviar`);
  if (errores) partes.push(`${errores} por corregir`);
  if (!pendientes && !errores) partes.push('todo enviado');

  const [fondo, icono]: [string, NombreIcono] = errores
    ? [colores.error, 'alert-circle']
    : !enLinea
      ? [colores.aviso, 'cloud-offline']
      : pendientes
        ? [colores.acento, 'cloud-upload']
        : [colores.exito, 'cloud-done'];

  return (
    <Pressable
      onPress={() => router.push('/capturas')}
      style={({ pressed }) => [estilos.barra, { backgroundColor: fondo }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`Estado de envío: ${partes.join(', ')}`}
    >
      <View style={estilos.fila}>
        {sincronizando ? <ActivityIndicator size="small" color={colores.blanco} /> : <Icono nombre={icono} color={colores.blanco} tamano={20} />}
        <Text style={estilos.texto} numberOfLines={1}>
          {sincronizando ? 'Enviando…' : partes.join(' · ')}
        </Text>
      </View>
      <View style={estilos.fila}>
        <Text style={estilos.texto}>Capturas</Text>
        <Icono nombre="chevron-forward" color={colores.blanco} tamano={18} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacio.m,
    minHeight: 44,
    gap: espacio.s,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, flexShrink: 1 },
  texto: { color: colores.blanco, fontWeight: '700', fontSize: tamanoTexto.dato },
});
