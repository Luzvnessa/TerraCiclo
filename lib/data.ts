export type FieldProfile = {
  farmName: string;
  location: string;
  soil: string;
  water: string;
  previousCrop: string;
  priority: string;
  hectares: number;
};

export type RotationOption = {
  id: string;
  name: string;
  sequence: string[];
  score: number;
  water: string;
  soil: string;
  summary: string;
  tags: string[];
};

export type AppPreferences = {
  appName: string;
  dataMode: "demo" | "local";
  observationSource: "nasa" | "local" | "none";
  exportFormat: "json" | "csv";
};

export type CalendarStatus = "pending" | "progress" | "done";

export type CalendarTask = {
  id: string;
  phase: string;
  title: string;
  desc: string;
  status: CalendarStatus;
  date: string;
};

export type EnvironmentPoint = {
  month: string;
  rain: number;
  temperature: number;
  vegetation: number;
};

export const initialField: FieldProfile = {
  farmName: "Parcela demostrativa Norte",
  location: "Huánuco, Perú",
  soil: "Franco",
  water: "Media",
  previousCrop: "Maíz",
  priority: "Conservar suelo",
  hectares: 4.5
};

export const initialPreferences: AppPreferences = {
  appName: "TerraCiclo",
  dataMode: "demo",
  observationSource: "nasa",
  exportFormat: "json"
};

export const initialCalendarTasks: CalendarTask[] = [
  {
    id: "fase-1",
    phase: "FASE 1",
    title: "Preparación y revisión del suelo",
    desc: "Confirmar análisis, drenaje y cobertura.",
    status: "pending",
    date: ""
  },
  {
    id: "fase-2",
    phase: "FASE 2",
    title: "Definir cultivo y ventana de siembra",
    desc: "Contrastar calendario local y disponibilidad de agua.",
    status: "pending",
    date: ""
  },
  {
    id: "fase-3",
    phase: "FASE 3",
    title: "Seguimiento del cultivo",
    desc: "Registrar lluvias, riego y observaciones de campo.",
    status: "pending",
    date: ""
  },
  {
    id: "fase-4",
    phase: "FASE 4",
    title: "Evaluación al cierre de campaña",
    desc: "Documentar rendimiento y aprendizajes para la próxima rotación.",
    status: "pending",
    date: ""
  }
];

export const environmentSeries: EnvironmentPoint[] = [
  { month: "Ene", rain: 82, temperature: 24, vegetation: 71 },
  { month: "Feb", rain: 88, temperature: 23, vegetation: 76 },
  { month: "Mar", rain: 74, temperature: 23, vegetation: 78 },
  { month: "Abr", rain: 51, temperature: 22, vegetation: 72 },
  { month: "May", rain: 32, temperature: 21, vegetation: 64 },
  { month: "Jun", rain: 18, temperature: 20, vegetation: 57 },
  { month: "Jul", rain: 14, temperature: 20, vegetation: 54 },
  { month: "Ago", rain: 17, temperature: 21, vegetation: 56 },
  { month: "Sep", rain: 28, temperature: 22, vegetation: 61 },
  { month: "Oct", rain: 46, temperature: 23, vegetation: 67 },
  { month: "Nov", rain: 63, temperature: 24, vegetation: 70 },
  { month: "Dic", rain: 77, temperature: 24, vegetation: 73 }
];

export const defaultRotations: RotationOption[] = [
  {
    id: "a",
    name: "Diversificación equilibrada",
    sequence: ["Maíz", "Frijol", "Avena de cobertura"],
    score: 86,
    water: "Media",
    soil: "Potencial de mejora",
    summary: "Alterna familias de cultivos e incorpora una opción de cobertura para reducir periodos de suelo desnudo.",
    tags: ["Diversidad", "Cobertura"]
  },
  {
    id: "b",
    name: "Uso eficiente del agua",
    sequence: ["Maíz", "Frijol caupí", "Cultivo de cobertura adaptado"],
    score: 79,
    water: "Baja a media",
    soil: "Mantenimiento",
    summary: "Prioriza revisar cultivos compatibles con una disponibilidad hídrica limitada y un calendario local.",
    tags: ["Agua", "Adaptación"]
  },
  {
    id: "c",
    name: "Protección del suelo",
    sequence: ["Maíz", "Leguminosa", "Cobertura vegetal"],
    score: 82,
    water: "Media",
    soil: "Potencial de mejora",
    summary: "Busca reducir la exposición del suelo y diversificar la secuencia; requiere validar especies y fechas localmente.",
    tags: ["Suelo", "Cobertura"]
  }
];
