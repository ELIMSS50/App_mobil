import { api } from './cliente';
import type { RespuestaSolicitud, Solicitud } from './tipos';

export interface NuevaSolicitud {
  lat: number;
  lng: number;
  alt: number | null;
  clave_identificacion: string;
  descripcion: string;
}

export async function solicitarPunto(proyectoId: number, s: NuevaSolicitud): Promise<RespuestaSolicitud> {
  const { data } = await api.post<RespuestaSolicitud>(`/proyectos/${proyectoId}/puntos-muestreo/solicitar`, {
    ...s,
    descripcion: s.descripcion.trim() || null,
  });
  return data;
}

/** Mis solicitudes, las más recientes primero; de un proyecto o de todos. */
export async function listarSolicitudes(proyectoId?: number): Promise<Solicitud[]> {
  const { data } = await api.get<{ data: Solicitud[] }>('/solicitudes', {
    params: proyectoId ? { proyecto: proyectoId } : undefined,
  });
  return data.data;
}
