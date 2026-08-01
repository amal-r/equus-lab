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
    config: { systemInstruction: SYSTEM_COACH },
  });
  return { reply: response.text };
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
