# Prompt — Nueva función: Escaneo morfológico del caballo

Pega esto en Visual Studio Code (Claude / Copilot) con la carpeta del proyecto abierta.

---

Añade a **Equus Lab** una nueva función: **Escaneo morfológico del caballo**. El diseño está en el
prototipo `Equus Lab.dc.html` (pantallas "Escaneo morfológico" y "Morfología · resultado"): replícalo
tal cual en estilo, colores y estructura.

## Qué hace
El usuario hace tres fotos del caballo parado y la IA devuelve un informe de conformación: índice
morfológico, mapa muscular con zonas marcadas, desarrollo por zona, medidas y proporciones, y un plan
de trabajo de 4 semanas. Permite comparar con escaneos anteriores para ver la evolución.

## Pantallas

### 1. Entrada
Tarjeta en Inicio, debajo de "Uso de hoy": icono 📐, título "Morfología del caballo", etiqueta NUEVO y
subtítulo "Escanea a {caballo} y detecta atrofias, asimetrías y desarrollo muscular". Navega a la
pantalla de escaneo.

### 2. `MorfologiaScreen` (captura)
- Selector de caballo (reutiliza el chip selector de la pantalla de subir vídeo).
- Tres tomas obligatorias, cada una abre la cámara o el carrete (`expo-image-picker`):
  1. **Perfil izquierdo** — cuerpo entero, cámara a la altura de la cruz.
  2. **Frontal** — de frente, aplomos visibles hasta el suelo.
  3. **Posterior** — desde atrás, para comparar grupa y muslos.
  Cada toma cambia a estado "Lista ✓" con borde verde cuando hay imagen.
- Aviso de encuadre: caballo parado y cuadrado, suelo llano, luz lateral; si se incluye una vara de
  altura conocida, la IA calibra en centímetros.
- Botón "Escanear morfología" (deshabilitado hasta tener las 3 tomas).
- Límite: **1 escaneo al mes en gratis**, mensual en Premium. El límite lo impone el backend.

### 3. `MorfologiaResultScreen`
- Cabecera oscura con **índice morfo** (0-10) y resumen en una frase.
- **Mapa muscular**: la foto de perfil con chips superpuestos por zona (verde correcto, ámbar débil,
  rojo atrofia) y leyenda.
- **Desarrollo por zona**: barra + porcentaje + nota por dorso/lomo, grupa izquierda, grupa derecha,
  cuello/trapecio y pectoral/antebrazo.
- **Medidas y proporciones**: alzada a la cruz, longitud escápula–isquion, ángulo de grupa, ángulo
  escápula–húmero, simetría de grupa y perímetro torácico, cada una con etiqueta "en rango / algo
  cerrado / asimetría".
- **Plan de 4 semanas** en tarjeta verde.
- **Descargo obligatorio**: orientativo, no sustituye a veterinario, fisioterapeuta equino ni técnico
  de sillas.
- Acciones: "Preguntar a la IA" (abre el chat con el contexto del escaneo) y "Nuevo escaneo".

## Implementación técnica

### On-device (plan gratis, coste 0)
Usa **pose/keypoints de animal** en el dispositivo para sacar los puntos anatómicos del caballo
(cruz, dorso, punta de anca, isquion, codo, corvejón, rodilla, casco):
- iOS: **Vision** `VNDetectAnimalBodyPoseRequest`.
- Android: modelo **TFLite** de keypoints animales (base AP-10K / DeepLabCut exportado).
A partir de los keypoints calcula en local:
- **Proporciones y ángulos** (alzada, longitud, ángulo de grupa y de espalda) por trigonometría.
- **Escala real** con la vara de referencia si está presente; si no, todo en proporciones relativas.
- **Simetría** comparando anchos y áreas izquierda/derecha en la toma posterior.
- **Masa muscular relativa** por área de contorno de cada zona, normalizada por la alzada.
Guarda cada escaneo en local para poder comparar (delta % frente al anterior).

### Backend (Premium)
Endpoint nuevo `POST /api/morphology`:
- Valida suscripción y cuota mensual de escaneos (igual que `/api/analyses`).
- Recibe las 3 imágenes por URL firmada + los keypoints ya calculados en el móvil.
- Llama al modelo con un system prompt de **juez de morfología y fisioterapeuta equino**; devuelve
  JSON con: `indice`, `resumen`, `zonas[{zona, estado, pct, nota}]`, `medidas[{label, valor, ref}]`,
  `plan`, `alertas[]`.
- Borra las imágenes tras generar el informe; conserva solo el informe.
- Añade el informe al contexto del chat para que el entrenador IA pueda responder sobre él.

### Modelo de datos
```
Scan { id, horseId, date, images[3], keypoints, indice, zonas[], medidas[], plan, provider }
```
Relaciónalo con el caballo para dibujar la evolución del índice en la pantalla de Progreso.

## Reglas
- Nunca afirmar patología ni diagnóstico: lenguaje de observación ("menos masa que la derecha",
  "asimetría detectada"), nunca "cojera" ni "lesión". Si la asimetría supera un umbral, sugerir
  revisión veterinaria.
- El descargo médico debe verse en la pantalla de resultado, no escondido en ajustes.
- El límite de escaneos lo impone el backend, no la app.
- Reutiliza los componentes ya existentes (chips de caballo, tarjetas, barras de progreso, cabecera
  oscura de resultado) en lugar de crear estilos nuevos.
