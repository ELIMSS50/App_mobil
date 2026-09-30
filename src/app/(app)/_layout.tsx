import { Stack } from 'expo-router';

import { useSincronizacionAutomatica } from '@/cola/useSincronizacionAutomatica';
import { colores } from '@/ui/tema';

export default function LayoutApp() {
  useSincronizacionAutomatica();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.primario },
        headerTintColor: colores.blanco,
        headerTitleStyle: { fontWeight: '700', fontSize: 19 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis proyectos' }} />
      <Stack.Screen name="unirse" options={{ title: 'Unirme a un proyecto', presentation: 'modal' }} />
      <Stack.Screen name="perfil" options={{ title: 'Mi cuenta' }} />
      <Stack.Screen name="proyecto/[id]/index" options={{ title: 'Proyecto' }} />
      <Stack.Screen name="proyecto/[id]/mapa-sin-conexion" options={{ title: 'Mapa sin conexión' }} />
      <Stack.Screen name="proyecto/[id]/captura" options={{ title: 'Nueva captura' }} />
      <Stack.Screen name="proyecto/[id]/solicitar-punto" options={{ title: 'Solicitar punto nuevo' }} />
      <Stack.Screen name="capturas" options={{ title: 'Mis capturas' }} />
      <Stack.Screen name="solicitudes" options={{ title: 'Mis solicitudes' }} />
    </Stack>
  );
}
