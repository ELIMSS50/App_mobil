import { api } from './cliente';
import type { DetalleProyecto, InfoMapa, PozosDeProyecto, Proyecto, RecursosMapa } from './tipos';

export async function listarProyectos(): Promise<Proyecto[]> {
  const { data } = await api.get<{ data: Proyecto[] }>('/proyectos');
  return data.data;
}

export async function obtenerProyecto(id: number): Promise<DetalleProyecto> {
  const { data } = await api.get<{ data: DetalleProyecto }>(`/proyectos/${id}`);
  return data.data;
}

export async function unirseAProyecto(claveAcceso: string): Promise<{ message: string; data: { id: number; nombre: string } }> {
  const { data } = await api.post('/proyectos/unirse', { claveAcceso });
  return data;
}

export async function listarPozos(id: number): Promise<PozosDeProyecto> {
  const { data } = await api.get<PozosDeProyecto>(`/proyectos/${id}/puntos-muestreo`);
  return data;
}

export async function infoMapa(id: number): Promise<InfoMapa> {
  const { data } = await api.get<{ data: InfoMapa }>(`/proyectos/${id}/mapa`);
  return data.data;
}

export async function listarRecursosMapa(): Promise<RecursosMapa> {
  const { data } = await api.get<{ data: RecursosMapa }>('/mapas/recursos');
  return data.data;
}
