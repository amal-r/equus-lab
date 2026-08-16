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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

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

  analisisHoy: number;
  chatHoy: number;
  lastUsageResetDate: string;

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

  ensureDailyReset: () => void;
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

      analisisHoy: 0,
      chatHoy: 0,
      lastUsageResetDate: todayKey(),

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
      enterDemo: () => set((s) => ({ hasSession: true, isDemo: true, rider: { ...s.rider, nombre: s.rider.nombre || 'Demo' } })),
      logout: () => set({ hasSession: false, isDemo: false, messages: [] }),
      deleteAccount: () =>
        set({
          hasSession: false,
          isDemo: false,
          rider: defaultRider,
          horses: defaultHorses,
          analyses: [],
          veredictos: [],
          messages: [],
          planTier: 'free',
          subEstado: 'gratis',
          usoMin: 0,
          usoTotal: 0,
        }),

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

      ensureDailyReset: () => {
        const today = todayKey();
        if (get().lastUsageResetDate !== today) {
          set({ analisisHoy: 0, chatHoy: 0, lastUsageResetDate: today });
        }
      },
      canStartFreeAnalysis: () => {
        get().ensureDailyReset();
        return get().planTier !== 'free' || get().analisisHoy < FREE_LIMITS.analisisPorDia;
      },
      registerFreeAnalysis: () => set((s) => ({ analisisHoy: s.analisisHoy + 1 })),
      canAskChat: () => {
        get().ensureDailyReset();
        return get().planTier !== 'free' || get().chatHoy < FREE_LIMITS.preguntasChatPorDia;
      },
      registerChatQuestion: () => set((s) => ({ chatHoy: s.chatHoy + 1 })),

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
        rider: s.rider,
        horses: s.horses,
        planTier: s.planTier,
        ciclo: s.ciclo,
        subEstado: s.subEstado,
        usoMin: s.usoMin,
        usoTotal: s.usoTotal,
        analisisHoy: s.analisisHoy,
        chatHoy: s.chatHoy,
        lastUsageResetDate: s.lastUsageResetDate,
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
