import { Directory, File, Paths } from 'expo-file-system';

/**
 * expo-image-picker devuelve URIs que apuntan a la caché de la app (o directamente
 * a un recurso temporal del sistema): el SO puede borrarlas en cualquier momento, y
 * SIEMPRE se pierden al actualizar la app (build nueva de TestFlight/App Store), aunque
 * el usuario no reinstale nada. Para que un vídeo o foto analizados sigan viéndose en
 * futuras sesiones, hay que copiarlos a Paths.document (persistente entre actualizaciones)
 * en cuanto se eligen, antes de guardar esa ruta en el análisis/escaneo.
 */
function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// Ojo: nada de tocar Paths/Directory a nivel de módulo (fuera de la función).
// SubirScreen y MorfologiaScreen -- que importan este fichero -- se cargan
// en el arranque de la app (RootNavigator importa todas las pantallas de
// golpe), así que cualquier llamada nativa aquí arriba se ejecutaría en
// CADA apertura de la app, antes de que se pinte nada; si esa llamada falla
// o el módulo nativo aún no está listo en ese instante, se lleva por delante
// el arranque entero. Todo el trabajo con el filesystem va dentro de la
// función, que solo se llama cuando el usuario elige de verdad una foto/vídeo.
export async function persistPickedFile(sourceUri: string, ext: string): Promise<string> {
  let dest: File | undefined;
  try {
    const mediaDir = new Directory(Paths.document, 'media');
    if (!mediaDir.exists) {
      try {
        mediaDir.create();
      } catch {
        // Dos fotos del escaneo pueden elegirse casi a la vez (MorfologiaScreen
        // no bloquea los otros dos huecos mientras uno está copiando) y ambas
        // llamadas pueden ver `exists === false` antes de que la otra termine
        // de crear la carpeta -- si ya existe para entonces, no pasa nada.
      }
    }
    const source = new File(sourceUri);
    dest = new File(mediaDir, uniqueName(ext));
    await source.copy(dest);
    return dest.uri;
  } catch (err) {
    console.warn('[persistMedia] no se pudo copiar a almacenamiento persistente, se usa la URI original del picker', err);
    if (dest?.exists) {
      try {
        dest.delete();
      } catch {
        // limpieza best-effort de una copia a medias; si tampoco se puede borrar, se queda huérfana.
      }
    }
    // Mejor seguir con la URI original del picker (se puede perder tras una
    // actualización) que dejar roto todo el flujo de subir vídeo / escanear.
    return sourceUri;
  }
}
