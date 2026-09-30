import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { iniciarSesion } from '@/api/auth';
import { errorDeCampo, mensajeDeError } from '@/api/errores';
import { API_URL } from '@/config';
import { useSesion } from '@/sesion/almacen';
import { Aviso } from '@/ui/Aviso';
import { Boton } from '@/ui/Boton';
import { Campo } from '@/ui/Campo';
import { Icono } from '@/ui/Icono';
import { colores, espacio, radio, tamanoTexto } from '@/ui/tema';

type Paso = 'credenciales' | 'codigo';

/**
 * Un solo formulario en dos pasos. Si la cuenta tiene 2FA, el servidor
 * contesta `requiere_2fa` y aquí se pide el código; luego se repite el mismo
 * login con el código (o uno de recuperación). Ver docs/API.md.
 */
export default function Login() {
  const guardar = useSesion((s) => s.guardar);

  const [paso, setPaso] = useState<Paso>('credenciales');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [usarRecuperacion, setUsarRecuperacion] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>();

  async function entrar() {
    setError(null);
    setErrorCodigo(undefined);

    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    if (paso === 'codigo' && !codigo.trim()) {
      setErrorCodigo('Escribe el código.');
      return;
    }

    setCargando(true);
    try {
      const respuesta = await iniciarSesion({
        email: email.trim(),
        password,
        ...(paso === 'codigo' && (usarRecuperacion ? { recovery_code: codigo.trim() } : { code: codigo.trim() })),
      });

      if ('requiere_2fa' in respuesta) {
        setPaso('codigo');
        return;
      }

      await guardar(respuesta.token, respuesta.user);
    } catch (e) {
      const deCodigo = errorDeCampo(e, 'code');
      if (deCodigo) {
        setErrorCodigo(deCodigo);
        setCodigo('');
      } else {
        setError(mensajeDeError(e));
      }
    } finally {
      setCargando(false);
    }
  }

  function volverACredenciales() {
    setPaso('credenciales');
    setCodigo('');
    setError(null);
    setErrorCodigo(undefined);
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.encabezado}>
            <View style={estilos.logo}>
              <Icono nombre="water" color={colores.blanco} tamano={44} />
            </View>
            <Text style={estilos.marca}>SCMP Campo</Text>
            <Text style={estilos.subtitulo}>Captura de muestras de agua en campo</Text>
          </View>

          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>{paso === 'codigo' ? 'Verificación en dos pasos' : 'Inicia sesión'}</Text>

            {error ? <Aviso texto={error} /> : null}

            {paso === 'credenciales' ? (
              <>
                <Campo
                  etiqueta="Correo"
                  placeholder="tu.correo@uaslp.mx"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                <Campo
                  etiqueta="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!verPassword}
                  autoComplete="password"
                  onSubmitEditing={entrar}
                />
                <Pressable onPress={() => setVerPassword(!verPassword)} hitSlop={8} style={estilos.filaEnlace}>
                  <Icono nombre={verPassword ? 'eye-off-outline' : 'eye-outline'} color={colores.acento} tamano={20} />
                  <Text style={estilos.enlace}>{verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={estilos.explicacion}>
                  {usarRecuperacion
                    ? 'Escribe uno de tus códigos de recuperación. Cada uno sirve una sola vez.'
                    : 'Escribe el código de 6 dígitos de tu app de autenticación.'}
                </Text>
                <Campo
                  etiqueta={usarRecuperacion ? 'Código de recuperación' : 'Código'}
                  value={codigo}
                  onChangeText={setCodigo}
                  error={errorCodigo}
                  autoFocus
                  autoCapitalize="none"
                  keyboardType={usarRecuperacion ? 'default' : 'number-pad'}
                  maxLength={usarRecuperacion ? 50 : 6}
                  autoComplete="one-time-code"
                  onSubmitEditing={entrar}
                  style={usarRecuperacion ? undefined : estilos.codigo}
                />
                <Pressable
                  onPress={() => {
                    setUsarRecuperacion(!usarRecuperacion);
                    setCodigo('');
                    setErrorCodigo(undefined);
                  }}
                  hitSlop={8}
                  style={estilos.filaEnlace}
                >
                  <Icono nombre={usarRecuperacion ? 'phone-portrait-outline' : 'key-outline'} color={colores.acento} tamano={20} />
                  <Text style={estilos.enlace}>
                    {usarRecuperacion ? 'Usar el código de la app' : 'No tengo mi teléfono: usar un código de recuperación'}
                  </Text>
                </Pressable>
              </>
            )}

            <Boton
              titulo={paso === 'codigo' ? 'Verificar' : 'Entrar'}
              icono={paso === 'codigo' ? 'shield-checkmark-outline' : 'log-in-outline'}
              onPress={entrar}
              cargando={cargando}
            />

            {paso === 'codigo' ? (
              <Boton titulo="Volver" variante="texto" icono="arrow-back" onPress={volverACredenciales} deshabilitado={cargando} />
            ) : (
              <Text style={estilos.nota}>¿Olvidaste tu contraseña? Recupérala desde el sitio web.</Text>
            )}
          </View>

          <Text style={estilos.servidor}>Servidor: {API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.primario },
  contenido: { padding: espacio.l, gap: espacio.l, flexGrow: 1, justifyContent: 'center' },
  encabezado: { alignItems: 'center', gap: espacio.xs },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.s,
  },
  marca: { fontSize: 32, fontWeight: '800', color: colores.blanco, letterSpacing: 0.5 },
  subtitulo: { fontSize: tamanoTexto.normal - 1, color: '#CBD5E1', textAlign: 'center' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radio.l + 4, padding: espacio.l, gap: espacio.m },
  tituloTarjeta: { fontSize: tamanoTexto.grande + 2, fontWeight: '800', color: colores.texto },
  explicacion: { fontSize: tamanoTexto.normal, color: colores.texto, lineHeight: 24 },
  codigo: { fontSize: 28, letterSpacing: 8, fontWeight: '700', textAlign: 'center' },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: espacio.xs },
  enlace: { flexShrink: 1, fontSize: tamanoTexto.dato + 1, color: colores.acento, fontWeight: '600' },
  nota: { fontSize: tamanoTexto.dato, color: colores.textoSuave, textAlign: 'center' },
  servidor: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
});
