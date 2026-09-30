import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { clienteConsultas } from '@/consultas';
import { useSesion } from '@/sesion/almacen';

SplashScreen.preventAutoHideAsync();

export default function Raiz() {
  const estado = useSesion((s) => s.estado);
  const restaurar = useSesion((s) => s.restaurar);

  useEffect(() => {
    restaurar();
  }, [restaurar]);

  useEffect(() => {
    if (estado !== 'cargando') SplashScreen.hideAsync();
    // Lo consultado con una cuenta no debe verlo la siguiente.
    if (estado === 'sin-sesion') clienteConsultas.clear();
  }, [estado]);

  if (estado === 'cargando') return null;

  const conSesion = estado === 'con-sesion';

  return (
    <QueryClientProvider client={clienteConsultas}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={conSesion}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!conSesion}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
