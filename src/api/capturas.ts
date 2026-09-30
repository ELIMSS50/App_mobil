import { medicionesConValor, normalizarNumero, type Captura } from '@/captura/modelo';

import { api } from './cliente';
import type { Formulario, MuestraServidor, RespuestaCaptura } from './tipos';

export async function obtenerFormulario(proyectoId: number): Promise<Formulario> {
  const { data } = await api.get<{ data: Formulario }>(`/proyectos/${proyectoId}/formulario`);
  return data.data;
}

/**
 * Multipart siempre (lleve foto o no), con los arreglos como
 * mediciones[0][idParametro] y los booleanos como "1"/"0", que es lo que
 * Laravel acepta. El orden de `mediciones` es el de medicionesConValor(): con
 * él se ubican los errores 422 (mediciones.N.valor).
 */
export async function enviarCaptura(c: Captura): Promise<RespuestaCaptura> {
  const datos = new FormData();
  const poner = (clave: string, valor: string | number | boolean | null | undefined) => {
    if (valor === null || valor === undefined || valor === '') return;
    datos.append(clave, typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor));
  };

  poner('uuid_cliente', c.uuid);
  poner('lat', c.lat);
  poner('lng', c.lng);
  poner('fechaHoraToma', c.fechaHoraToma);
  poner('modoCaptura', c.modoCaptura);
  poner('observaciones', c.observaciones.trim());

  medicionesConValor(c).forEach((m, i) => {
    poner(`mediciones[${i}][idParametro]`, m.idParametro);
    poner(`mediciones[${i}][valor]`, normalizarNumero(m.valor));
    poner(`mediciones[${i}][origen]`, 'CAMPO');
    poner(`mediciones[${i}][numRepeticion]`, m.numRepeticion);
  });

  c.envases.forEach((envase, i) => {
    for (const [campo, valor] of Object.entries(envase)) poner(`muestras_colectadas[${i}][${campo}]`, valor);
  });

  if (c.foto) {
    // Forma de React Native para adjuntar un archivo local.
    datos.append('fotografia', { uri: c.foto.uri, name: `${c.uuid}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  }

  const { data } = await api.post<RespuestaCaptura>(`/proyectos/${c.proyectoId}/muestras`, datos, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Una foto con poca señal tarda: más margen que el resto de la API.
    timeout: 120000,
  });
  return data;
}

/** Mis capturas del proyecto según el servidor (pendientes de asignar o ya asignadas). */
export async function listarMisMuestras(proyectoId: number): Promise<MuestraServidor[]> {
  const { data } = await api.get<{ data: MuestraServidor[] }>(`/proyectos/${proyectoId}/muestras`);
  return data.data;
}
