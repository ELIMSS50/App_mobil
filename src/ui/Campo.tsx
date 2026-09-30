import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { Icono } from './Icono';
import { ALTO_TOCABLE, colores, espacio, radio, tamanoTexto } from './tema';

interface Props extends TextInputProps {
  etiqueta: string;
  error?: string;
  /** Texto de ayuda bajo el campo (se oculta si hay error). */
  ayuda?: string;
  /** Unidad a la derecha del valor (°C, mg/l…). */
  sufijo?: string | null;
}

export function Campo({ etiqueta, error, ayuda, sufijo, style, onFocus, onBlur, ...props }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const colorBorde = error ? colores.error : enfocado ? colores.acento : colores.bordeFuerte;

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={[estilos.caja, { borderColor: colorBorde }]}>
        <TextInput
          placeholderTextColor={colores.textoTenue}
          style={[estilos.entrada, style]}
          accessibilityLabel={etiqueta}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {sufijo ? <Text style={estilos.sufijo}>{sufijo}</Text> : null}
      </View>
      {error ? (
        <View style={estilos.filaError}>
          <Icono nombre="alert-circle" color={colores.error} tamano={18} />
          <Text style={estilos.error}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={estilos.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { fontSize: tamanoTexto.dato + 1, fontWeight: '600', color: colores.texto },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ALTO_TOCABLE,
    borderWidth: 2,
    borderRadius: radio.m,
    backgroundColor: colores.blanco,
  },
  entrada: {
    flex: 1,
    minHeight: ALTO_TOCABLE - 4,
    paddingHorizontal: espacio.m,
    fontSize: tamanoTexto.grande,
    color: colores.texto,
  },
  sufijo: { paddingRight: espacio.m, fontSize: tamanoTexto.normal, fontWeight: '600', color: colores.textoSuave },
  filaError: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  error: { flex: 1, fontSize: tamanoTexto.dato, color: colores.error, fontWeight: '600' },
  ayuda: { fontSize: tamanoTexto.pequeno, color: colores.textoSuave },
});
