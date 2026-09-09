import { analyzeClip, AnalyzeClipInput, ProgressEvent } from '../ondevice/analyzeClip';
import { AnalysisResult } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

interface RunAnalysisArgs extends AnalyzeClipInput {
  isPremium: boolean;
}

/**
 * Orquesta el análisis de una sesión:
 * - Plan gratis → siempre on-device (MediaPipe simulado hoy, real mañana), coste 0, sin red.
 * - Plan Premium → intenta `/api/analyses` en el backend (que valida cuota y llama a Gemini).
 *   Si el backend no está configurado (EXPO_PUBLIC_API_URL vacío) o falla, cae a la simulación
 *   on-device para no romper la demo, marcando el resultado como simulado.
 */
export async function runAnalysis(args: RunAnalysisArgs, onProgress?: (e: ProgressEvent) => void): Promise<AnalysisResult> {
  if (args.isPremium && HAS_BACKEND) {
    try {
      onProgress?.({ pct: 20, step: 0, pointCount: 4, strideCount: 10 });
      // El vídeo viaja de verdad (multipart), no solo su ruta local -- esa ruta
      // no significa nada para un servidor remoto (ver server/routes/analyses.js).
      const form = new FormData();
      form.append('video', { uri: args.uri, name: 'session.mp4', type: 'video/mp4' } as unknown as Blob);
      form.append('durationSec', String(args.durationSec));
      form.append('disciplina', args.disciplina);
      form.append('foco', args.foco);
      form.append('esPieATierra', String(args.esPieATierra));
      form.append('caballo', args.caballo);
      const result = await apiFetch<AnalysisResult>('/api/analyses', { method: 'POST', body: form });
      onProgress?.({ pct: 100, step: 3, pointCount: 17, strideCount: 120 });
      // El backend no guarda el vídeo (borra su temporal tras analizarlo): para
      // reproducirlo en Resultado/Comparación usamos la copia que ya tenemos
      // en el propio dispositivo, la misma que se acaba de subir.
      return { ...result, videoUri: args.uri };
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'no_backend') throw err;
      // backend no disponible: seguimos con la simulación local para no bloquear la demo
    }
  }
  return analyzeClip(args, onProgress);
}
