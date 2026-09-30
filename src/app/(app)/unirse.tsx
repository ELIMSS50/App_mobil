import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorDeCampo, mensajeDeError } from '@/api/errores';
import { unirseAProyecto } from '@/api/proyectos';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { Campo } from '@/ui/Campo';
import { Icono } from '@/ui/Icono';
import { colores, espacio, tamanoTexto } from '@/ui/tema';

export default function Unirse() {
  const consultas = useQueryClient();
  const [clave, setClave] = useState('');

  const unirse = useMutation({
    mutationFn: () => unirseAProyecto(clave.trim()),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['proyectos'] }),
  });

  const errorClave = unirse.error ? errorDeCampo(unirse.error, 'claveAcceso') : undefined;

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.ilustracion}>
          <Icono nombre={unirse.data ? 'checkmark-done' : 'key'} color={unirse.data ? colores.exito : colores.acento} tamano={40} />
        </View>
        <Text style={estilos.titulo}>{unirse.data ? '¡Listo!' : 'Únete a un proyecto'}</Text>
        <Text style={estilos.explicacion}>
          {unirse.data ? 'Ya puedes ver el proyecto en tu lista.' : 'Escribe la clave de acceso que te dio tu profesor.'}
        </Text>

        {unirse.data ? (
          <Aviso tipo="exito" titulo={unirse.data.data.nombre} texto={unirse.data.message} />
        ) : (
          <Campo
            etiqueta="Clave de acceso"
            placeholder="Ej. A1B2C3"
            value={clave}
            onChangeText={setClave}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            autoFocus
            error={errorClave}
            onSubmitEditing={() => clave.trim() && unirse.mutate()}
            style={estilos.clave}
          />
        )}

        {unirse.error && !errorClave ? <Aviso texto={mensajeDeError(unirse.error)} /> : null}

        {unirse.data ? (
          <Boton titulo="Ver mis proyectos" icono="arrow-forward" onPress={() => router.back()} />
        ) : (
          <Boton
            titulo="Unirme"
            icono="enter-outline"
            onPress={() => unirse.mutate()}
            cargando={unirse.isPending}
            deshabilitado={!clave.trim()}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espacio.l, gap: espacio.m },
  ilustracion: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colores.acentoFondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacio.m,
  },
  titulo: { fontSize: tamanoTexto.titulo - 2, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  explicacion: { fontSize: tamanoTexto.normal, color: colores.textoSuave, textAlign: 'center', marginBottom: espacio.s },
  clave: { fontSize: 26, letterSpacing: 6, fontWeight: '700', textAlign: 'center' },
});
