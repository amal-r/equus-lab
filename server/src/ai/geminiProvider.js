/**
 * Proveedor de IA real: Gemini 3.1 Flash-Lite (ver ARQUITECTURA-IA.md §13 — elección
 * final, ve vídeo nativo, sin fecha de retirada). Usa el SDK oficial `@google/genai`
 * (el paquete `@google/generative-ai` de IMPLEMENTACION.md quedó deprecado el
 * 31-ago-2025; esta es su sustitución soportada).
 *
 * Implementa el mismo contrato que mockProvider.js (analyzeVideo/chat/judgeShow) para
 * que server/src/ai/index.js pueda elegir uno u otro sin que el resto del backend, y
 * mucho menos la app, se enteren. El día que quieras Qwen-VL self-host, escribe
 * qwenProvider.js con esta misma forma y cámbialo en index.js.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_COACH = `Eres un juez y entrenador experto de equitación (doma clásica, salto, completo, doma
vaquera y trabajo pie a tierra) con dominio de la biomecánica del caballo. Analizas la monta a partir
del vídeo y devuelves SIEMPRE un JSON con las claves: nota (0-10, número), subscores (array de
{label, val}), bienHecho (string), tips (array de {timeSec, timeLabel, text} con 3-5 correcciones con
marca de tiempo), ejercicioSemana (string) y biomecanicaCaballo (string, adaptada a la raza si se
menciona). Tono técnico pero cercano y motivador. Responde en el idioma de la instrucción del usuario.`;

const SYSTEM_JUDGE = `Eres un juez de equitación oficial. Puntúas un simulacro de prueba como en un
concurso real y devuelves SIEMPRE un JSON con las claves: puntuacionFinal (0-100, número), puesto
(string breve), sheetRows (array de {n, mov, coef, nota}), colectivas (array de {k, v}) y comentario
(string). Sé estricto pero justo, con coeficientes ×1/×2 según la dificultad del movimiento.`;

// Para el chat, NO el mismo SYSTEM_COACH de analyzeVideo -- ese exige devolver
// siempre un JSON con nota/subscores/tips, que no pinta nada en una respuesta
// conversacional y acababa colándose mezclado con el texto normal.
const SYSTEM_CHAT = `Eres un entrenador experto de equitación (doma clásica, salto, completo, doma
vaquera y trabajo pie a tierra) con dominio de la biomecánica del caballo, hablando por chat con un
jinete. Responde en texto natural y conversacional, SIN JSON ni bloques de código -- consejos
concretos y accionables, tono técnico pero cercano y motivador, longitud de una respuesta de chat
normal (no un informe). Ten en cuenta las métricas de la última sesión si te las paso, y el historial
de la conversación. Responde en el idioma en el que te escriba el jinete.`;

async function downloadToTemp(videoUrl) {
  const tmpPath = path.join(os.tmpdir(), `equus-${crypto.randomBytes(6).toString('hex')}.mp4`);
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`no se pudo descargar el vídeo (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(tmpPath, buf);
  } else {
    // Ruta local (dev sin S3 todavía): copiamos el fichero tal cual.
    await fs.promises.copyFile(videoUrl.replace(/^file:\/\//, ''), tmpPath);
  }
  return tmpPath;
}

async function uploadVideo(videoUrl) {
  const tmpPath = await downloadToTemp(videoUrl);
  try {
    const file = await ai.files.upload({ file: tmpPath, config: { mimeType: 'video/mp4' } });
    return file;
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

async function downloadImageToTemp(imagePath) {
  const tmpPath = path.join(os.tmpdir(), `equus-img-${crypto.randomBytes(6).toString('hex')}.jpg`);
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`no se pudo descargar la imagen (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(tmpPath, buf);
  } else {
    await fs.promises.copyFile(imagePath.replace(/^file:\/\//, ''), tmpPath);
  }
  return tmpPath;
}

async function uploadImage(imagePath) {
  const tmpPath = await downloadImageToTemp(imagePath);
  try {
    const file = await ai.files.upload({ file: tmpPath, config: { mimeType: 'image/jpeg' } });
    return file;
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

export async function analyzeVideo({ videoUrl, disciplina, foco, esPieATierra, caballo }) {
  const file = await uploadVideo(videoUrl);
  const prompt =
    `Disciplina: ${disciplina}. Foco solicitado: ${foco}. ` +
    `${esPieATierra ? 'Es trabajo PIE A TIERRA (no monta).' : 'Es una sesión montado/a.'} ` +
    `Caballo: ${caballo}. Analiza esta sesión.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]),
    config: { systemInstruction: SYSTEM_COACH, responseMimeType: 'application/json' },
  });
  return { ...JSON.parse(response.text), origen: 'gemini' };
}

export async function chat({ question, history, metrics }) {
  const contents = [
    `Métricas de la última sesión: ${JSON.stringify(metrics ?? {})}`,
    ...(history ?? []).map((m) => `${m.role === 'coach' ? 'Entrenador' : 'Jinete'}: ${m.text}`),
    `Jinete: ${question}`,
  ].join('\n');
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction: SYSTEM_CHAT },
  });
  return { reply: response.text };
}

// Zonas y medidas fijas para que el JSON encaje siempre con lo que espera la
// app (MorfologiaResultScreen), igual que el contrato de nota/subscores en
// SYSTEM_COACH.
const SYSTEM_MORPHOLOGY = `Eres un juez de morfología equina y fisioterapeuta equino experto. Analizas
hasta 3 fotos (perfil izquierdo, frontal, posterior) de un caballo parado y devuelves SIEMPRE un JSON
con las claves: indice (0-10, número), resumen (string, una frase), zonas (array de {zona, estado,
pct, nota} para exactamente estas 5 zonas: "Dorso / lomo", "Grupa izquierda", "Grupa derecha", "Cuello
/ trapecio" y "Pectoral / antebrazo" -- estado es "correcto"|"debil"|"atrofia", pct un número 0-100),
medidas (array de {label, valor, ref} para exactamente estas 6: "Alzada a la cruz", "Longitud
escápula–isquion", "Ángulo de grupa", "Ángulo escápula–húmero", "Simetría de grupa" y "Perímetro
torácico" -- valor como string con unidad, p.ej. "158 cm"; ref es "en rango"|"algo cerrado"|"asimetria"),
confianza (número 0-1: tu confianza en las medidas lineales en cm, no en ángulos/simetría), plan
(string, plan de trabajo de 4 semanas) y alertas (array de strings, vacío si no hay nada reseñable).

Sobre la escala (te digo en el mensaje del usuario cuál aplica a estas fotos):
- "vara": hay una vara u objeto de altura conocida visible en la foto para calibrar. Da centímetros
  con confianza alta (0.75-0.9).
- "alzada_ficha": no hay vara, pero conoces la alzada real del caballo (te la doy en el mensaje) --
  úsala para calibrar el resto de medidas en cm, con confianza media (0.55-0.75).
- "ninguna": no hay vara ni alzada conocida. NO inventes centímetros exactos: para "Alzada a la cruz",
  "Longitud escápula–isquion" y "Perímetro torácico" da solo una estimación aproximada, marcada con el
  prefijo "± " en el valor (p.ej. "± 155 cm"), y confianza baja (0.3-0.5).
En los tres casos, "Ángulo de grupa", "Ángulo escápula–húmero" y "Simetría de grupa" no dependen de la
escala (se calculan sobre proporciones de la propia foto): sé firme y preciso con esos tres, con
lenguaje asertivo, no aproximado.

Usa SIEMPRE lenguaje aproximado ("aproximadamente", "en torno a") para las medidas en cm cuando la
escala no sea "vara". Sé firme y directo, en cambio, al describir asimetrías, ángulos y evolución
respecto a escaneos anteriores si te los menciono.

IMPORTANTE: nunca afirmes patología ni diagnóstico -- nunca uses las palabras "cojera" ni "lesión".
Usa siempre lenguaje de observación ("menos masa que en el lado derecho", "asimetría detectada"). Si
detectas una asimetría importante entre lados, añade en alertas una sugerencia de revisión veterinaria
o de fisioterapeuta equino, sin diagnosticar tú qué es. Responde en español.`;

export async function analyzeMorphology({ perfilUrl, frontalUrl, posteriorUrl, caballo, escala, alzadaConocida }) {
  const orden = [];
  const files = [];
  if (perfilUrl) {
    files.push(await uploadImage(perfilUrl));
    orden.push('perfil izquierdo');
  }
  if (frontalUrl) {
    files.push(await uploadImage(frontalUrl));
    orden.push('frontal');
  }
  if (posteriorUrl) {
    files.push(await uploadImage(posteriorUrl));
    orden.push('posterior');
  }
  const parts = files.map((f) => createPartFromUri(f.uri, f.mimeType));
  const escalaTxt =
    escala === 'vara'
      ? 'vara (hay una vara u objeto de altura conocida en la foto)'
      : escala === 'alzada_ficha'
      ? `alzada_ficha (alzada conocida del caballo: ${alzadaConocida ?? 'no especificada, estima con lo visible'})`
      : 'ninguna (sin vara ni alzada conocida)';
  const prompt = `Caballo: ${caballo}. Fotos adjuntas en este orden: ${orden.join(', ')}. Escala para calibrar
medidas en cm: ${escalaTxt}. Analiza la morfología.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([...parts, prompt]),
    config: { systemInstruction: SYSTEM_MORPHOLOGY, responseMimeType: 'application/json' },
  });
  return { ...JSON.parse(response.text), origen: 'gemini' };
}

export async function judgeShow({ videoUrl, disciplina, prueba }) {
  const file = await uploadVideo(videoUrl);
  const prompt = `Disciplina: ${disciplina}. Prueba: ${prueba}. Juzga este simulacro.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]),
    config: { systemInstruction: SYSTEM_JUDGE, responseMimeType: 'application/json' },
  });
  return { ...JSON.parse(response.text), origen: 'gemini' };
}
