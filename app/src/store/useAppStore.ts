import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnalysisResult,
  ChatMessage,
  Ciclo,
  CoachTone,
  Disciplina,
  DISCIPLINAS_BASE,
  Horse,
  Lang,
  NotifPrefs,
  PLAN_DEFS,
  PlanTier,
  RiderProfile,
  SubEstado,
  Veredicto,
} from '../types/models';
import { FREE_LIMITS } from '../types/models';
import { apiFetch } from '../services/apiClient';
import { HAS_BACKEND } from '../services/config';
import { clearToken } from '../services/session';
import { resetUserIdentity } from '../services/purchases';

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface AppState {
  hasHydrated: boolean;
  theme: 'light' | 'dark';
  lang: Lang;
  toneSel: CoachTone | null;

  hasSession: boolean;
  isDemo: boolean;
  // Id real del usuario en el backend (solo existe si HAS_BACKEND y se hizo
  // login/registro de verdad contra /api/auth). Se usa como appUserID de
  // RevenueCat para que el webhook (ver server/routes/webhooks.js) sepa a
  // qué cuenta atribuir cada compra.
  backendUserId: string | null;

  rider: RiderProfile;
  horses: Horse[];

  // Flujo "Subir vídeo" (efímero, no persiste)
  selectedHorseId: string | null;
  disciplinaSel: Disciplina;
  focoSel: string;
  customDisciplinas: string[];
  videoUri: string | null;
  videoName: string | null;
  videoDurationSec: number | null;

  concDisciplina: Disciplina;

  planTier: PlanTier;
  ciclo: Ciclo;
  subEstado: SubEstado;
  usoMin: number;
  usoTotal: number;

  // Limite gratis de por vida (no se resetea nunca): 1 analisis y 3 preguntas de
  // chat POR CUENTA, no por dia. Una cuenta nueva (deleteAccount) empieza de cero.
  analisisTotal: number;
  chatTotal: number;

  analyses: AnalysisResult[];
  currentAnalysisId: string | null;
  veredictos: Veredicto[];

  messages: ChatMessage[];
  notif: NotifPrefs;

  setHasHydrated: (v: boolean) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  setTone: (t: CoachTone) => void;

  loginWithEmail: (email: string) => void;
  registerWithEmail: (name: string, email: string) => void;
  enterDemo: () => void;
  logout: () => void;
  deleteAccount: () => void;
  /** Se llama solo al confirmar una compra real (ver AjustesSuscripcionScreen). */
  setBackendUserId: (id: string) => void;

  updateRiderProfile: (partial: Partial<RiderProfile>) => void;
  toggleDisciplinaPracticada: (label: string) => void;

  addHorse: (h: Omit<Horse, 'id' | 'sesiones'>) => void;
  updateHorse: (id: string, partial: Partial<Horse>) => void;
  deleteHorse: (id: string) => void;

  setSelectedHorse: (id: string | null) => void;
  setDisciplinaSel: (d: Disciplina) => void;
  setFocoSel: (f: string) => void;
  /** Añade (si no existe ya) y selecciona una disciplina escrita libremente por el jinete. */
  addCustomDisciplina: (nombre: string) => void;
  setVideo: (uri: string, name: string, durationSec: number) => void;
  clearVideo: () => void;
  setConcDisciplina: (d: Disciplina) => void;

  canStartFreeAnalysis: () => boolean;
  registerFreeAnalysis: () => void;
  canAskChat: () => boolean;
  registerChatQuestion: () => void;

  addAnalysis: (result: AnalysisResult) => void;
  setCurrentAnalysis: (id: string | null) => void;
  addVeredicto: (v: Veredicto) => void;

  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'ts'>) => void;

  toggleNotif: (k: keyof NotifPrefs) => void;

  setCiclo: (c: Ciclo) => void;
  /** Confirma la compra de `tier` — solo debe llamarse tras un pago real (o su simulación explícita), nunca al limitarse a previsualizar un plan. */
  subscribe: (tier: Exclude<PlanTier, 'free'>) => void;
  cancelSubscription: () => void;
  reactivateSubscription: () => void;
  buyExtraPack: () => void;
}

const defaultRider: RiderProfile = {
  nombre: 'Laura',
  email: '',
  edad: '28',
  aniosMontando: '9',
  nivel: 'Medio',
  disciplinasPracticadas: { 'Doma clásica': true, Salto: true, Completo: false, 'Doma vaquera': false },
};

const defaultHorses: Horse[] = [
  { id: 'h1', nombre: 'Ondina', edad: '8', tipo: 'Yegua', raza: 'PRE', disciplina: 'Doma clásica', notaMedia: '7,4', sesiones: 15 },
  { id: 'h2', nombre: 'Trueno', edad: '6', tipo: 'Castrado', raza: 'KWPN', disciplina: 'Salto', notaMedia: '6,9', sesiones: 9 },
];

const defaultNotif: NotifPrefs = { analisis: true, retos: true, concursos: false, marketing: false };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      theme: 'light',
      lang: 'es',
      toneSel: null,

      hasSession: false,
      isDemo: false,
      backendUserId: null,

      rider: defaultRider,
      horses: defaultHorses,

      selectedHorseId: 'h1',
      disciplinaSel: 'Doma clásica',
      focoSel: 'Todo el conjunto',
      customDisciplinas: [],
      videoUri: null,
      videoName: null,
      videoDurationSec: null,

      concDisciplina: 'Doma clásica',

      planTier: 'free',
      ciclo: 'mensual',
      subEstado: 'gratis',
      usoMin: 0,
      usoTotal: 0,

      analisisTotal: 0,
      chatTotal: 0,

      analyses: [],
      currentAnalysisId: null,
      veredictos: [],

      messages: [],
      notif: defaultNotif,

      setHasHydrated: (v) => set({ hasHydrated: v }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (l) => set({ lang: l }),
      setTone: (t) => set({ toneSel: t }),

      loginWithEmail: (email) => set((s) => ({ hasSession: true, isDemo: false, rider: { ...s.rider, email } })),
      registerWithEmail: (name, email) =>
        set((s) => ({ hasSession: true, isDemo: false, rider: { ...s.rider, nombre: name || s.rider.nombre, email } })),
      setBackendUserId: (id) => set({ backendUserId: id }),
      enterDemo: () => set((s) => ({ hasSession: true, isDemo: true, rider: { ...s.rider, nombre: s.rider.nombre || 'Demo' } })),
      logout: () => {
        void clearToken();
        void resetUserIdentity();
        set({ hasSession: false, isDemo: false, backendUserId: null, messages: [] });
      },
      deleteAccount: () => {
        // Mejor esfuerzo: si hay cuenta real en el backend, pedimos borrarla
        // tambien alli. No bloqueamos el borrado local por si falla la red.
        if (HAS_BACKEND && get().backendUserId) {
          void apiFetch('/api/account', { method: 'DELETE' }).catch(() => {});
        }
        void clearToken();
        void resetUserIdentity();
        set({
          hasSession: false,
          isDemo: false,
          backendUserId: null,
          rider: defaultRider,
          horses: defaultHorses,
          analyses: [],
          veredictos: [],
          messages: [],
          planTier: 'free',
          subEstado: 'gratis',
          usoMin: 0,
          usoTotal: 0,
          analisisTotal: 0,
          chatTotal: 0,
        });
      },

      updateRiderProfile: (partial) => set((s) => ({ rider: { ...s.rider, ...partial } })),
      toggleDisciplinaPracticada: (label) =>
        set((s) => ({
          rider: {
            ...s.rider,
            disciplinasPracticadas: { ...s.rider.disciplinasPracticadas, [label]: !s.rider.disciplinasPracticadas[label] },
          },
        })),

      addHorse: (h) =>
        set((s) => ({ horses: [...s.horses, { ...h, id: genId(), sesiones: 0, notaMedia: undefined }] })),
      updateHorse: (id, partial) => set((s) => ({ horses: s.horses.map((h) => (h.id === id ? { ...h, ...partial } : h)) })),
      deleteHorse: (id) =>
        set((s) => ({
          horses: s.horses.filter((h) => h.id !== id),
          selectedHorseId: s.selectedHorseId === id ? s.horses.find((h) => h.id !== id)?.id ?? null : s.selectedHorseId,
        })),

      setSelectedHorse: (id) => set({ selectedHorseId: id }),
      setDisciplinaSel: (d) => set({ disciplinaSel: d, focoSel: 'Todo el conjunto' }),
      setFocoSel: (f) => set({ focoSel: f }),
      addCustomDisciplina: (nombreRaw) =>
        set((s) => {
          const nombre = nombreRaw.trim();
          if (!nombre) return {};
          const yaExiste = [...DISCIPLINAS_BASE, ...s.customDisciplinas].some((d) => d.toLowerCase() === nombre.toLowerCase());
          const customDisciplinas = yaExiste ? s.customDisciplinas : [...s.customDisciplinas, nombre];
          return { customDisciplinas, disciplinaSel: nombre, focoSel: 'Todo el conjunto' };
        }),
      setVideo: (uri, name, durationSec) => set({ videoUri: uri, videoName: name, videoDurationSec: durationSec }),
      clearVideo: () => set({ videoUri: null, videoName: null, videoDurationSec: null }),
      setConcDisciplina: (d) => set({ concDisciplina: d }),

      canStartFreeAnalysis: () => get().planTier !== 'free' || get().analisisTotal < FREE_LIMITS.analisisGratisTotal,
      registerFreeAnalysis: () => set((s) => ({ analisisTotal: s.analisisTotal + 1 })),
      canAskChat: () => get().planTier !== 'free' || get().chatTotal < FREE_LIMITS.preguntasChatGratisTotal,
      registerChatQuestion: () => set((s) => ({ chatTotal: s.chatTotal + 1 })),

      addAnalysis: (result) =>
        set((s) => ({
          analyses: [result, ...s.analyses],
          currentAnalysisId: result.id,
          horses: s.horses.map((h) => {
            const matches = result.horseId ? h.id === result.horseId : h.nombre === result.caballo;
            return matches ? { ...h, sesiones: h.sesiones + 1, notaMedia: result.nota.toFixed(1).replace('.', ',') } : h;
          }),
        })),
      setCurrentAnalysis: (id) => set({ currentAnalysisId: id }),
      addVeredicto: (v) => set((s) => ({ veredictos: [v, ...s.veredictos] })),

      addChatMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: genId(), ts: Date.now() }] })),

      toggleNotif: (k) => set((s) => ({ notif: { ...s.notif, [k]: !s.notif[k] } })),

      setCiclo: (c) => set({ ciclo: c }),
      subscribe: (tier) => {
        const def = PLAN_DEFS[tier];
        set({ planTier: def.id, subEstado: 'activa', usoMin: 0, usoTotal: def.minMes });
      },
      cancelSubscription: () => set({ subEstado: 'cancelada' }),
      reactivateSubscription: () => set({ subEstado: 'activa' }),
      buyExtraPack: () => set((s) => ({ usoTotal: s.usoTotal + 100 })),
    }),
    {
      name: 'equus-lab-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        toneSel: s.toneSel,
        hasSession: s.hasSession,
        isDemo: s.isDemo,
        backendUserId: s.backendUserId,
        rider: s.rider,
        horses: s.horses,
        planTier: s.planTier,
        ciclo: s.ciclo,
        subEstado: s.subEstado,
        usoMin: s.usoMin,
        usoTotal: s.usoTotal,
        analisisTotal: s.analisisTotal,
        chatTotal: s.chatTotal,
        analyses: s.analyses,
        veredictos: s.veredictos,
        notif: s.notif,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
