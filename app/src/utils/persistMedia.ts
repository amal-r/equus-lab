import { Directory, File, Paths } from 'expo-file-system';

/**
 * expo-image-picker devuelve URIs que apuntan a la caché de la app (o directamente
 * a un recurso temporal del sistema): el SO puede borrarlas en cualquier momento, y
 * SIEMPRE se pierden al actualizar la app (build nueva de TestFlight/App Store), aunque
 * el usuario no reinstale nada. Para que un vídeo o foto analizados sigan viéndose en
 * futuras sesiones, hay que copiarlos a Paths.document (persistente entre actualizaciones)
 * en cuanto se eligen, antes de guardar esa ruta en el análisis/escaneo.
 */
const MEDIA_DIR = new Directory(Paths.document, 'media');

function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function persistPickedFile(sourceUri: string, ext: string): Promise<string> {
  if (!MEDIA_DIR.exists) MEDIA_DIR.create();
  const source = new File(sourceUri);
  const dest = new File(MEDIA_DIR, uniqueName(ext));
  await source.copy(dest);
  return dest.uri;
}
