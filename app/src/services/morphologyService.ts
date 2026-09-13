import { analyzeMorphology, AnalyzeMorphologyInput } from '../ondevice/analyzeMorphology';
import { MorphScan } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

interface RunMorphologyArgs extends AnalyzeMorphologyInput {
  isPremium: boolean;
}

/**
 * Igual que analysisService.runAnalysis, pero para el escaneo morfológico:
 * - Plan gratis → siempre on-device, coste 0, sin red.
 * - Premium → `/api/morphology` en el backend (valida cuota mensual y llama a Gemini
 *   con las 3 fotos). Si el backend falla o no está configurado, cae al on-device.
 */
export async function runMorphologyScan(args: RunMorphologyArgs): Promise<MorphScan> {
  if (args.isPremium && HAS_BACKEND) {
    try {
      const form = new FormData();
      if (args.images.perfil) form.append('perfil', { uri: args.images.perfil, name: 'perfil.jpg', type: 'image/jpeg' } as unknown as Blob);
      if (args.images.frontal) form.append('frontal', { uri: args.images.frontal, name: 'frontal.jpg', type: 'image/jpeg' } as unknown as Blob);
      if (args.images.posterior)
        form.append('posterior', { uri: args.images.posterior, name: 'posterior.jpg', type: 'image/jpeg' } as unknown as Blob);
      form.append('caballo', args.caballo);
      const result = await apiFetch<MorphScan>('/api/morphology', { method: 'POST', body: form });
      // El backend borra las fotos tras generar el informe (ver server/routes/morphology.js):
      // para poder seguir viéndolas en el resultado, usamos las copias locales del dispositivo.
      return { ...result, images: args.images };
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'no_backend') throw err;
    }
  }
  return analyzeMorphology(args);
}
