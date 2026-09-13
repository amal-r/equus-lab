# Prompt — Cámara, etiqueta del chat y medidas estimadas

Pega esto en Visual Studio Code (Claude / Copilot) con la carpeta del proyecto abierta.

---

Tres cambios en **Equus Lab**. El diseño de referencia está en el prototipo `Equus Lab.dc.html`.

## 1. Capturar desde cámara, no solo desde galería

Hoy solo se puede elegir del carrete. Añade en cada punto de captura **dos botones**: "📷 Cámara" y
"🖼️ Galería".

**Dónde:**
- Pantalla **Nueva sesión** (subir vídeo): "Grabar" (cámara de vídeo) y "Galería".
- Pantalla **Escaneo morfológico**: en cada una de las tres tomas (perfil, frontal, posterior),
  "Cámara" y "Galería".

**Cómo (Expo):**
```js
import * as ImagePicker from 'expo-image-picker';

// Cámara — foto (escaneo morfológico)
async function tomarFoto() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return alert('Necesitamos acceso a la cámara para escanear al caballo.');
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (!r.canceled) return r.assets[0];
}

// Cámara — vídeo (nueva sesión)
async function grabarVideo() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return alert('Necesitamos acceso a la cámara para grabar la sesión.');
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: 180,          // 3 min en plan gratuito
    quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });
  if (!r.canceled) return r.assets[0];
}
```

**Permisos** — añádelos en `app.json`, con textos en español (Apple rechaza los genéricos):
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Equus Lab usa la cámara para grabar tus sesiones y escanear la morfología de tu caballo.",
        "NSMicrophoneUsageDescription": "Se graba el audio junto al vídeo de la sesión.",
        "NSPhotoLibraryUsageDescription": "Equus Lab accede a tus fotos y vídeos para analizar las sesiones que elijas."
      }
    },
    "android": { "permissions": ["CAMERA", "READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO"] }
  }
}
```

Si el usuario deniega el permiso, muestra un aviso con un enlace a Ajustes del sistema y deja la
opción de galería disponible. Respeta el tope de duración también en los vídeos grabados con cámara.

## 2. Etiqueta "Chat" bajo el icono del sombrero

En la cabecera de **Inicio**, el botón del 🎓 no se entiende. Colócale debajo la palabra **"Chat"**
en 10 px, peso 700, color texto al 55%, centrada bajo el círculo, y pon `accessibilityLabel="Chat con
tu entrenador IA"`. Mantén el punto verde de notificación.

## 3. Medidas morfológicas: dejar claro que son estimadas

Las medidas salen de una foto, así que son aproximaciones. En la pantalla de resultado de morfología:

- Añade la etiqueta **"ESTIMADO"** junto al título "Medidas y proporciones".
- Debajo de la tabla, incluye esta nota:
  > 📐 Medidas **estimadas a partir de las fotos**, no tomadas con cinta. Sirven para comparar
  > escaneos del mismo caballo y ver su evolución; para cifras exactas, mide en persona. Los ángulos
  > y la simetría sí son fiables porque se calculan sobre proporciones.

**Además, en el código:**
- Trata las cifras en centímetros como derivadas: solo muéstralas si hay **referencia de escala**
  (la vara de altura conocida o la alzada del caballo ya guardada en su ficha). Sin referencia,
  muestra solo proporciones y ángulos, y oculta los centímetros.
- Guarda en cada escaneo un campo `escala: 'vara' | 'alzada_ficha' | 'ninguna'` y un
  `confianza: 0-1`. Si la confianza es baja, marca las medidas con "±" o con un aviso.
- Los ángulos, los porcentajes de simetría y los deltas entre escaneos **no** dependen de la escala:
  esos preséntalos como dato firme, y son el verdadero valor de la función.
- El prompt del modelo debe reflejarlo: pídele que hable de "aproximadamente" en las medidas
  lineales y que sea taxativo solo en asimetrías y evolución.
