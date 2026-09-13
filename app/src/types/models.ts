export type Lang = 'es' | 'en';
export type CoachTone = 'Cercano' | 'Técnico' | 'Exigente';
export type Disciplina = 'Doma clásica' | 'Salto' | 'Completo' | 'Doma vaquera' | string;

/** Disciplinas fijas de partida. En cualquier selector, el usuario puede además escribir
 * la suya propia — se guarda en `customDisciplinas` (store) y la IA la usa tal cual. */
export const DISCIPLINAS_BASE: Disciplina[] = ['Doma clásica', 'Salto', 'Completo', 'Doma vaquera'];
export type HorseType = 'Yegua' | 'Semental' | 'Castrado' | 'Macho' | 'Pony';
export type Nivel = 'Iniciación' | 'Medio' | 'Avanzado' | 'Iniciado' | '';
export type PlanTier = 'free' | 'premium' | 'pro' | 'elite';
export type Ciclo = 'mensual' | 'anual';
export type SubEstado = 'gratis' | 'activa' | 'cancelada';

export interface Horse {
  id: string;
  nombre: string;
  edad?: string;
  tipo: HorseType;
  raza?: string;
  disciplina: Disciplina;
  alzada?: string;
  nivel?: Nivel;
  notaMedia?: string;
  sesiones: number;
}

export interface RiderProfile {
  nombre: string;
  email: string;
  edad: string;
  aniosMontando: string;
  nivel: Nivel;
  disciplinasPracticadas: Record<string, boolean>;
  avatarUri?: string;
}

export interface ChatMessage {
  id: string;
  role: 'coach' | 'user';
  text: string;
  ts: number;
}

export interface AnalysisTip {
  timeSec: number;
  timeLabel: string;
  text: string;
}

export interface AnalysisResult {
  id: string;
  fecha: string; // ISO
  horseId?: string;
  caballo: string;
  disciplina: Disciplina;
  foco: string;
  ejercicio: string;
  esPieATierra: boolean;
  nota: number;
  subscores: { label: string; val: number }[];
  bienHecho: string;
  tips: AnalysisTip[];
  ejercicioSemana: string;
  videoUri?: string;
  origen: 'ondevice' | 'gemini';
}

export type MorphEstado = 'correcto' | 'debil' | 'atrofia';
export type MorphRef = 'en rango' | 'algo cerrado' | 'asimetria';

export interface MorphZona {
  zona: string;
  estado: MorphEstado;
  pct: number;
  nota: string;
}

export interface MorphMedida {
  label: string;
  valor: string;
  ref: MorphRef;
}

export interface MorphImages {
  perfil?: string;
  frontal?: string;
  posterior?: string;
}

export interface MorphScan {
  id: string;
  fecha: string; // ISO
  horseId?: string;
  caballo: string;
  images: MorphImages;
  indice: number;
  resumen: string;
  zonas: MorphZona[];
  medidas: MorphMedida[];
  plan: string;
  alertas: string[];
  origen: 'ondevice' | 'gemini';
}

export interface Veredicto {
  id: string;
  fecha: string;
  disciplina: Disciplina;
  prueba: string;
  caballo: string;
  puntuacionFinal: number;
  puesto: string;
  sheetRows: { n: string; mov: string; coef: string; nota: number }[];
  colectivas: { k: string; v: number }[];
  comentario: string;
}

export interface NotifPrefs {
  analisis: boolean;
  retos: boolean;
  concursos: boolean;
  marketing: boolean;
}

export interface PlanDef {
  id: PlanTier;
  nombre: string;
  minMes: number;
  clipMaxMin: number;
  precioMensual: number;
  precioAnual: number;
}

export const PLAN_DEFS: Record<Exclude<PlanTier, 'free'>, PlanDef> = {
  premium: { id: 'premium', nombre: 'Premium', minMes: 300, clipMaxMin: 20, precioMensual: 9.99, precioAnual: 95.9 },
  pro: { id: 'pro', nombre: 'Pro', minMes: 800, clipMaxMin: 40, precioMensual: 19.99, precioAnual: 191.99 },
  elite: { id: 'elite', nombre: 'Elite', minMes: 2000, clipMaxMin: 90, precioMensual: 34.99, precioAnual: 339.99 },
};

// Cupo gratis DE POR VIDA por cuenta -- no se resetea nunca (ni a diario ni de
// ninguna otra forma). Al agotarlo, la app tiene que ofrecer Premium directamente.
export const FREE_LIMITS = {
  clipMaxMin: 3,
  analisisGratisTotal: 1,
  preguntasChatGratisTotal: 3,
};

// El escaneo morfológico sí se resetea cada mes (no es "de por vida" como el
// análisis de vídeo gratis): 1 al mes en gratis, más al mes en Premium.
export const MORPH_LIMITS = {
  scansPorMesGratis: 1,
  scansPorMesPremium: 10,
};

export type RootScreen =
  | 'welcome'
  | 'login'
  | 'register'
  | 'forgot'
  | 'home'
  | 'subir'
  | 'procesando'
  | 'resultado'
  | 'comparacion'
  | 'chat'
  | 'progreso'
  | 'concursos'
  | 'veredicto'
  | 'perfil'
  | 'editarPerfil'
  | 'nuevoCaballo'
  | 'ajustesMenu'
  | 'ajustesNivel'
  | 'ajustesNotif'
  | 'ajustesSuscripcion';
