import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { FotoCaptura } from './modelo';

// Las fotos se comprimen en el teléfono: el servidor ya las optimiza, pero
// subir 8 MB con datos móviles desde el campo es lo que falla. 1600 px de lado
// mayor alcanzan para ver el pozo, el brocal o la etiqueta del envase.
const LADO_MAXIMO = 1600;
const CALIDAD = 0.7;

const carpeta = new Directory(Paths.document, 'fotos');

export type OrigenFoto = 'camara' | 'galeria';

export type ResultadoFoto =
  | { ok: true; foto: FotoCaptura }
  | { ok: false; motivo: 'cancelada' | 'sin-permiso' };

/**
 * Toma o elige la foto, la comprime y la deja en la carpeta de la app con el
 * UUID de la captura, para que sobreviva hasta que se envíe (fase 4: cola).
 */
export async function obtenerFoto(origen: OrigenFoto, uuidCaptura: string): Promise<ResultadoFoto> {
  const permiso =
    origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return { ok: false, motivo: 'sin-permiso' };

  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
  const elegido =
    origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
  if (elegido.canceled || !elegido.assets[0]) return { ok: false, motivo: 'cancelada' };

  const original = elegido.assets[0];
  const horizontal = original.width >= original.height;
  const contexto = ImageManipulator.manipulate(original.uri);
  if (Math.max(original.width, original.height) > LADO_MAXIMO) {
    contexto.resize(horizontal ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
  }
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ compress: CALIDAD, format: SaveFormat.JPEG });

  if (!carpeta.exists) carpeta.create({ intermediates: true, idempotent: true });
  const destino = new File(carpeta, `${uuidCaptura}.jpg`);
  if (destino.exists) destino.delete();
  new File(guardada.uri).move(destino);

  return { ok: true, foto: { uri: destino.uri, width: guardada.width, height: guardada.height } };
}

export function borrarFoto(foto: FotoCaptura | null): void {
  if (!foto) return;
  try {
    const f = new File(foto.uri);
    if (f.exists) f.delete();
  } catch {
    // Un archivo que ya no existe no es un problema.
  }
}
