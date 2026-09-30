import { QueryClient } from '@tanstack/react-query';

export const clienteConsultas = new QueryClient({
  defaultOptions: {
    // En campo la señal va y viene: un reintento corto y nada de refrescar
    // cada vez que la app vuelve al frente (eso lo hace el sincronizador).
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
  },
});
