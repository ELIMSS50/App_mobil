import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { borrarCache } from '@/almacen/cache';
import type { Usuario } from '@/api/tipos';

const CLAVE_TOKEN = 'scmp.token';
const CLAVE_USUARIO = 'scmp.usuario';

type Estado = 'cargando' | 'sin-sesion' | 'con-sesion';

interface Sesion {
  estado: Estado;
  token: string | null;
  usuario: Usuario | null;
  /** Lee la sesión guardada en el teléfono al abrir la app. */
  restaurar: () => Promise<void>;
  guardar: (token: string, usuario: Usuario) => Promise<void>;
  /** Borra la sesión local (sin avisar al servidor; para eso, cerrarSesion). */
  olvidar: () => Promise<void>;
}

/**
 * El token vive en SecureStore (Keystore de Android), nunca en AsyncStorage.
 * El usuario se guarda junto para poder abrir la app sin señal: en campo no
 * se puede depender de un GET /me para saber quién es.
 */
export const useSesion = create<Sesion>((set) => ({
  estado: 'cargando',
  token: null,
  usuario: null,

  restaurar: async () => {
    try {
      const [token, usuario] = await Promise.all([
        SecureStore.getItemAsync(CLAVE_TOKEN),
        SecureStore.getItemAsync(CLAVE_USUARIO),
      ]);

      if (token && usuario) {
        set({ estado: 'con-sesion', token, usuario: JSON.parse(usuario) as Usuario });
        return;
      }
    } catch {
      // Datos dañados: se trata como si no hubiera sesión.
    }
    set({ estado: 'sin-sesion', token: null, usuario: null });
  },

  guardar: async (token, usuario) => {
    await SecureStore.setItemAsync(CLAVE_TOKEN, token);
    await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario));
    set({ estado: 'con-sesion', token, usuario });
  },

  olvidar: async () => {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
    await SecureStore.deleteItemAsync(CLAVE_USUARIO);
    // Los mapas descargados se quedan: son de la zona, no de la cuenta.
    borrarCache();
    set({ estado: 'sin-sesion', token: null, usuario: null });
  },
}));
