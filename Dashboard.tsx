"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowDownToLine, BarChart3, CheckCircle2, ChevronRight, CloudSun,
  Droplets, Globe2, Leaf, MapPin, Menu, RefreshCw, Satellite, Sprout, Target,
  TrendingUp, Wheat, X, LayoutDashboard, ClipboardList, CalendarDays, ShieldCheck,
  FlaskConical, FileText, Settings2, CircleHelp, Search, Bell, ArrowUpRight,
  ThermometerSun, Layers3, Tractor, CircleAlert, BookOpen, Clock3, Save
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";
import MetricCard from "@/components/MetricCard";
import RotationCard from "@/components/RotationCard";
import {
  environmentSeries, initialCalendarTasks, initialField, initialPreferences,
  type AppPreferences, type CalendarTask, type EnvironmentPoint, type FieldProfile, type RotationOption
} from "@/lib/data";
import { analyzeRotations } from "@/lib/analysis";
import { readStorage, removeStorage, storageKeys, writeStorage } from "@/lib/storage";

type ModuleId = "resumen" | "parcela" | "rotaciones" | "ambiente" | "calendario" | "suelo" | "informes" | "guia" | "ajustes";

const navGroups = [
  {
    title: "GENERAL",
    items: [
      { id: "resumen" as ModuleId, label: "Resumen", icon: LayoutDashboard },
      { id: "parcela" as ModuleId, label: "Mi explotación", icon: MapPin },
      { id: "calendario" as ModuleId, label: "Calendario agrícola", icon: CalendarDays }
    ]
  },
  {
    title: "ANÁLISIS AGRÍCOLA",
    items: [
      { id: "rotaciones" as ModuleId, label: "Rotación de cultivos", icon: RefreshCw },
      { id: "ambiente" as ModuleId, label: "Datos ambientales", icon: Satellite },
      { id: "suelo" as ModuleId, label: "Salud del suelo", icon: Layers3 }
    ]
  },
  {
    title: "HERRAMIENTAS",
    items: [
      { id: "informes" as ModuleId, label: "Informes", icon: FileText },
      { id: "guia" as ModuleId, label: "Guía de uso", icon: BookOpen },
      { id: "ajustes" as ModuleId, label: "Configuración", icon: Settings2 }
    ]
  }
];

const moduleMeta: Record<ModuleId, { title: string; subtitle: string; icon: typeof Leaf; kicker: string }> = {
  resumen: { title: "Resumen general", subtitle: "Una vista clara del estado de tu explotación y tus tareas principales.", icon: LayoutDashboard, kicker: "PANEL PRINCIPAL" },
  parcela: { title: "Mi explotación", subtitle: "Administra la información básica de tu parcela para contextualizar el análisis.", icon: MapPin, kicker: "PERFIL AGRÍCOLA" },
  calendario: { title: "Calendario agrícola", subtitle: "Organiza campañas, ventanas de siembra y actividades por revisar.", icon: CalendarDays, kicker: "PLANIFICACIÓN" },
  rotaciones: { title: "Rotación de cultivos", subtitle: "Compara secuencias candidatas y revisa los criterios detrás de cada alternativa.", icon: RefreshCw, kicker: "ANÁLISIS DE ROTACIONES" },
  ambiente: { title: "Datos ambientales", subtitle: "Explora tendencias ilustrativas y conoce qué fuentes conviene integrar.", icon: Satellite, kicker: "OBSERVACIÓN DE LA TIERRA" },
  suelo: { title: "Salud del suelo", subtitle: "Revisa prácticas de manejo y factores que requieren evaluación local.", icon: Layers3, kicker: "CONSERVACIÓN DEL SUELO" },
  informes: { title: "Informes", subtitle: "Genera y descarga un resumen de la evaluación actual.", icon: FileText, kicker: "DOCUMENTACIÓN" },
  guia: { title: "Guía de uso", subtitle: "Conoce el flujo de trabajo y el alcance de esta versión demostrativa.", icon: BookOpen, kicker: "CENTRO DE AYUDA" },
  ajustes: { title: "Configuración", subtitle: "Revisa las preferencias y el estado de las fuentes de datos del proyecto.", icon: Settings2, kicker: "PREFERENCIAS" }
};

const calendarStatusLabel: Record<CalendarTask["status"], string> = {
  pending: "Por planificar",
  progress: "En curso",
  done: "Completada"
};

const soilPractices = [
  "Rotación de cultivos planificada",
  "Cobertura del suelo entre campañas",
  "Análisis de suelo reciente",
  "Manejo de residuos vegetales",
  "Plan de riego revisado"
];

type CalendarDraft = {
  title: string;
  desc: string;
  date: string;
};

type ReportPayload = {
  product: string;
  reportType: string;
  generatedAt: string;
  status: string;
  field: FieldProfile;
  selectedRotation: RotationOption | null;
  alternatives: RotationOption[];
  environmentalSeries: EnvironmentPoint[];
  soilNotes: string;
  preferences: AppPreferences;
  disclaimer: string;
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function nextCalendarStatus(status: CalendarTask["status"]): CalendarTask["status"] {
  if (status === "pending") return "progress";
  if (status === "progress") return "done";
  return "pending";
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = Array.isArray(value)
    ? value.join(" > ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildReportCsv(report: ReportPayload): string {
  const rows: unknown[][] = [
    ["Informe", report.reportType],
    ["Producto", report.product],
    ["Generado", report.generatedAt],
    ["Estado", report.status],
    [],
    ["Parcela", report.field.farmName],
    ["Ubicación", report.field.location],
    ["Superficie (ha)", report.field.hectares],
    ["Suelo", report.field.soil],
    ["Disponibilidad de agua", report.field.water],
    ["Cultivo anterior", report.field.previousCrop],
    ["Prioridad", report.field.priority],
    ["Alternativa seleccionada", report.selectedRotation?.name || "Ninguna"],
    ["Notas de campo", report.soilNotes],
    [],
    ["Alternativas"],
    ["Nombre", "Secuencia", "Puntuación", "Agua", "Suelo", "Resumen", "Etiquetas"],
    ...report.alternatives.map((option) => [
      option.name,
      option.sequence,
      option.score,
      option.water,
      option.soil,
      option.summary,
      option.tags
    ]),
    [],
    ["Serie ambiental"],
    ["Mes", "Lluvia (mm)", "Temperatura (°C)", "Índice vegetal"],
    ...report.environmentalSeries.map((item) => [item.month, item.rain, item.temperature, item.vegetation]),
    [],
    ["Aviso", report.disclaimer]
  ];

  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Dashboard() {
  const [field, setField] = useState<FieldProfile>(initialField);
  const [rotations, setRotations] = useState<RotationOption[]>(analyzeRotations(initialField));
  const [selectedRotation, setSelectedRotation] = useState("a");
  const [activeModule, setActiveModule] = useState<ModuleId>("resumen");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [preferences, setPreferences] = useState<AppPreferences>(initialPreferences);
  const [draftPreferences, setDraftPreferences] = useState<AppPreferences>(initialPreferences);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>(initialCalendarTasks);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [calendarDraft, setCalendarDraft] = useState<CalendarDraft>({ title: "", desc: "", date: "" });
  const [environmentData, setEnvironmentData] = useState<EnvironmentPoint[]>(environmentSeries);
  const [environmentDraft, setEnvironmentDraft] = useState<EnvironmentPoint[]>(environmentSeries);
  const [editingEnvironment, setEditingEnvironment] = useState(false);
  const [environmentCustomized, setEnvironmentCustomized] = useState(false);
  const [soilNotes, setSoilNotes] = useState("");
  const [soilNotesDraft, setSoilNotesDraft] = useState("");
  const [editingSoilNotes, setEditingSoilNotes] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const selected = useMemo(() => rotations.find((r) => r.id === selectedRotation) || rotations[0], [rotations, selectedRotation]);
  const averageScore = rotations.length > 0 ? Math.round(rotations.reduce((sum, r) => sum + r.score, 0) / rotations.length) : 0;
  const currentMeta = moduleMeta[activeModule];
  const observationSourceTitle = preferences.observationSource === "local"
    ? "Datos locales manuales"
    : preferences.observationSource === "none"
      ? "Sin fuente configurada"
      : "Observaciones NASA";
  const observationSourceDetail = preferences.observationSource === "local"
    ? "Fuente manual configurada por el usuario"
    : preferences.observationSource === "none"
      ? "Solo series ambientales de demostración"
      : "Integración pendiente";
  const observationSourceStatus = preferences.observationSource === "local" ? "Disponible" : "Pendiente";
  const observationNextStep = preferences.observationSource === "local"
    ? "Documentar la procedencia y la fecha de los datos locales antes de usarlos en una decisión de manejo."
    : preferences.observationSource === "none"
      ? "Configurar una fuente de observación (NASA Earthdata o datos locales) para contextualizar el análisis."
      : "Elegir un producto NASA adecuado para la ubicación y el periodo, verificar su resolución y documentar la procedencia de cada variable.";

  useEffect(() => {
    const storedField = readStorage<Partial<FieldProfile>>(storageKeys.field, {}) || {};
    const storedRotation = readStorage<string>(storageKeys.selectedRotation, "");
    if (storedField && Object.keys(storedField).length > 0) {
      const mergedField: FieldProfile = {
        ...initialField,
        ...storedField,
        farmName: typeof storedField.farmName === "string" && storedField.farmName.trim() ? storedField.farmName : initialField.farmName,
        location: typeof storedField.location === "string" && storedField.location.trim() ? storedField.location : initialField.location,
        hectares: Number.isFinite(Number(storedField.hectares)) ? Math.max(0, Number(storedField.hectares)) : initialField.hectares
      };
      const storedRotations = analyzeRotations(mergedField);
      setField(mergedField);
      setRotations(storedRotations);
      if (storedRotation && storedRotations.some((option) => option.id === storedRotation)) {
        setSelectedRotation(storedRotation);
      }
    } else if (storedRotation) {
      setSelectedRotation(storedRotation);
    }

    const storedPreferences = readStorage<Partial<AppPreferences>>(storageKeys.preferences, {}) || {};
    const mergedPreferences: AppPreferences = {
      ...initialPreferences,
      ...storedPreferences,
      appName: String(storedPreferences.appName || initialPreferences.appName).trim() || initialPreferences.appName,
      dataMode: storedPreferences.dataMode === "local" ? "local" : "demo",
      observationSource: storedPreferences.observationSource === "local" || storedPreferences.observationSource === "none" ? storedPreferences.observationSource : "nasa",
      exportFormat: storedPreferences.exportFormat === "csv" ? "csv" : "json"
    };
    setPreferences(mergedPreferences);
    setDraftPreferences(mergedPreferences);
    document.title = `${mergedPreferences.appName} | Agricultura resiliente`;

    const storedTasks = readStorage<CalendarTask[]>(storageKeys.calendar, initialCalendarTasks);
    if (Array.isArray(storedTasks)) {
      const tasksById = new Map<string, CalendarTask>();
      storedTasks.forEach((task) => {
        if (task && typeof task.id === "string") tasksById.set(task.id, task);
      });
      setCalendarTasks(initialCalendarTasks.map((task) => {
        const stored = tasksById.get(task.id);
        const storedStatus = stored?.status;
        const status: CalendarTask["status"] = storedStatus === "progress" || storedStatus === "done" ? storedStatus : "pending";
        return {
          ...task,
          title: typeof stored?.title === "string" && stored.title.trim() ? stored.title : task.title,
          desc: typeof stored?.desc === "string" ? stored.desc : task.desc,
          date: typeof stored?.date === "string" ? stored.date : "",
          status
        };
      }));
    }

    const storedEnvironment = readStorage<EnvironmentPoint[]>(storageKeys.environment, []);
    if (Array.isArray(storedEnvironment) && storedEnvironment.length > 0) {
      const environmentByMonth = new Map<string, EnvironmentPoint>();
      storedEnvironment.forEach((point) => {
        if (point && typeof point.month === "string") environmentByMonth.set(point.month, point);
      });
      const normalized = environmentSeries.map((defaultPoint) => {
        const storedPoint = environmentByMonth.get(defaultPoint.month);
        const storedRain = Number(storedPoint?.rain);
        const storedTemperature = Number(storedPoint?.temperature);
        const storedVegetation = Number(storedPoint?.vegetation);
        return {
          month: defaultPoint.month,
          rain: Number.isFinite(storedRain) ? Math.max(0, storedRain) : defaultPoint.rain,
          temperature: Number.isFinite(storedTemperature) ? storedTemperature : defaultPoint.temperature,
          vegetation: Number.isFinite(storedVegetation) ? Math.min(100, Math.max(0, storedVegetation)) : defaultPoint.vegetation
        };
      });
      setEnvironmentData(normalized);
      setEnvironmentDraft(normalized);
      setEnvironmentCustomized(true);
    }

    const storedSoilNotes = readStorage<string>(storageKeys.soilNotes, "");
    if (typeof storedSoilNotes === "string") {
      setSoilNotes(storedSoilNotes);
      setSoilNotesDraft(storedSoilNotes);
    }
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  function updateField<K extends keyof FieldProfile>(key: K, value: FieldProfile[K]) {
    setField((current) => ({ ...current, [key]: value }));
  }

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3500);
  }

  async function runAnalysis() {
    const cleanField: FieldProfile = {
      ...field,
      farmName: field.farmName.trim(),
      location: field.location.trim(),
      hectares: Math.max(0, Number(field.hectares) || 0)
    };
    if (!cleanField.farmName || !cleanField.location) {
      notify("Completa el nombre y la ubicación de la parcela antes de analizar.");
      return;
    }

    setField(cleanField);
    writeStorage(storageKeys.field, cleanField);

    if (preferences.dataMode === "local") {
      const localRotations = analyzeRotations(cleanField);
      const firstId = localRotations[0]?.id || "a";
      setRotations(localRotations);
      setSelectedRotation(firstId);
      writeStorage(storageKeys.selectedRotation, firstId);
      notify("Análisis local actualizado con los datos de la parcela.");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanField)
      });
      if (!response.ok) throw new Error("No se pudo consultar el análisis");
      const result = await response.json() as { rotations?: RotationOption[] };
      const nextRotations = Array.isArray(result.rotations) ? result.rotations : analyzeRotations(cleanField);
      const firstId = nextRotations[0]?.id || "a";
      setRotations(nextRotations);
      setSelectedRotation(firstId);
      writeStorage(storageKeys.selectedRotation, firstId);
      notify("Análisis actualizado con los datos de la parcela.");
    } catch {
      const localRotations = analyzeRotations(cleanField);
      const firstId = localRotations[0]?.id || "a";
      setRotations(localRotations);
      setSelectedRotation(firstId);
      writeStorage(storageKeys.selectedRotation, firstId);
      notify("Análisis local actualizado. La API no respondió.");
    } finally {
      setAnalyzing(false);
    }
  }

  function savePreferences() {
    const cleaned: AppPreferences = {
      ...draftPreferences,
      appName: draftPreferences.appName.trim() || initialPreferences.appName
    };
    setPreferences(cleaned);
    setDraftPreferences(cleaned);
    const stored = writeStorage(storageKeys.preferences, cleaned);
    document.title = `${cleaned.appName} | Agricultura resiliente`;
    notify(stored ? "Preferencias guardadas y aplicadas." : "Preferencias aplicadas en esta sesión; el navegador bloqueó el almacenamiento.");
  }

  function downloadReport() {
    const report: ReportPayload = {
      product: preferences.appName,
      reportType: "Informe de comparación de rotaciones",
      generatedAt: new Date().toISOString(),
      status: preferences.dataMode === "local" ? "LOCAL_ANALYSIS" : "DEMO_DATA",
      field,
      selectedRotation: selected ?? null,
      alternatives: rotations,
      environmentalSeries: environmentData,
      soilNotes,
      preferences,
      disclaimer: "Datos ambientales y puntuaciones demostrativas. No son datos oficiales de la NASA ni asesoría agronómica. Validar con fuentes locales y especialistas."
    };
    const datePart = new Date().toISOString().slice(0, 10);
    const baseName = preferences.appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "terraciclo";

    if (preferences.exportFormat === "csv") {
      downloadTextFile(buildReportCsv(report), `${baseName}-informe-${datePart}.csv`, "text/csv;charset=utf-8");
      notify("Informe CSV descargado.");
      return;
    }

    downloadTextFile(JSON.stringify(report, null, 2), `${baseName}-informe-${datePart}.json`, "application/json");
    notify("Informe JSON descargado.");
  }

  function selectRotation(id: string) {
    setSelectedRotation(id);
    writeStorage(storageKeys.selectedRotation, id);
  }

  function updateCalendarDate(id: string, date: string) {
    setCalendarTasks((current) => {
      const next = current.map((task) => task.id === id ? { ...task, date } : task);
      writeStorage(storageKeys.calendar, next);
      return next;
    });
  }

  function cycleCalendarStatus(id: string) {
    setCalendarTasks((current) => {
      const next = current.map((task) => task.id === id ? { ...task, status: nextCalendarStatus(task.status) } : task);
      writeStorage(storageKeys.calendar, next);
      return next;
    });
  }

  function startCalendarEdit(task: CalendarTask) {
    setEditingCalendarId(task.id);
    setCalendarDraft({ title: task.title, desc: task.desc, date: task.date });
  }

  function cancelCalendarEdit() {
    setEditingCalendarId(null);
    setCalendarDraft({ title: "", desc: "", date: "" });
  }

  function saveCalendarTask(id: string) {
    const title = calendarDraft.title.trim();
    if (!title) {
      notify("El título de la fase no puede estar vacío.");
      return;
    }
    const next = calendarTasks.map((task) => task.id === id ? { ...task, title, desc: calendarDraft.desc.trim(), date: calendarDraft.date } : task);
    setCalendarTasks(next);
    const stored = writeStorage(storageKeys.calendar, next);
    setEditingCalendarId(null);
    setCalendarDraft({ title: "", desc: "", date: "" });
    notify(stored ? "Fase del calendario guardada." : "Fase aplicada en esta sesión; el navegador bloqueó el almacenamiento.");
  }

  function startEnvironmentEdit() {
    setEnvironmentDraft(environmentData);
    setEditingEnvironment(true);
  }

  function cancelEnvironmentEdit() {
    setEnvironmentDraft(environmentData);
    setEditingEnvironment(false);
  }

  function updateEnvironmentDraft(index: number, key: "rain" | "temperature" | "vegetation", value: number) {
    setEnvironmentDraft((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, [key]: Number.isFinite(value) ? value : 0 } : point));
  }

  function saveEnvironmentData() {
    const cleaned: EnvironmentPoint[] = environmentDraft.map((point) => ({
      month: point.month,
      rain: Math.max(0, Number(point.rain) || 0),
      temperature: Number(point.temperature) || 0,
      vegetation: Math.min(100, Math.max(0, Number(point.vegetation) || 0))
    }));
    setEnvironmentData(cleaned);
    setEnvironmentDraft(cleaned);
    setEnvironmentCustomized(true);
    setEditingEnvironment(false);
    const stored = writeStorage(storageKeys.environment, cleaned);
    notify(stored ? "Serie ambiental guardada en este navegador." : "Serie ambiental aplicada en esta sesión; el navegador bloqueó el almacenamiento.");
  }

  function resetEnvironmentData() {
    setEnvironmentData(environmentSeries);
    setEnvironmentDraft(environmentSeries);
    setEnvironmentCustomized(false);
    setEditingEnvironment(false);
    const removed = removeStorage(storageKeys.environment);
    notify(removed ? "Serie ambiental de demostración restaurada." : "Serie restaurada en esta sesión; el navegador no permitió borrar los datos guardados.");
  }

  function saveSoilNotes() {
    const cleaned = soilNotesDraft.trim();
    setSoilNotes(cleaned);
    setSoilNotesDraft(cleaned);
    setEditingSoilNotes(false);
    const stored = writeStorage(storageKeys.soilNotes, cleaned);
    notify(stored ? "Notas de campo guardadas." : "Notas aplicadas en esta sesión; el navegador bloqueó el almacenamiento.");
  }

  function cancelSoilNotes() {
    setSoilNotesDraft(soilNotes);
    setEditingSoilNotes(false);
  }

  function runSearch() {
    const query = normalizeText(searchText.trim());
    if (!query) return;
    const match = navGroups.flatMap((group) => group.items).find((item) => {
      const meta = moduleMeta[item.id];
      return [item.label, meta.title, meta.subtitle, meta.kicker].some((value) => normalizeText(value).includes(query));
    });
    if (match) {
      setSearchText("");
      goTo(match.id);
      return;
    }
    notify(`No se encontró un módulo para “${searchText.trim()}”.`);
  }

  function goTo(target: ModuleId) {
    setActiveModule(target);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const fieldForm = (
    <section className="panel-card">
      <div className="panel-heading">
        <div><div className="section-kicker"><MapPin size={15} /> PERFIL AGRÍCOLA</div><h2 className="section-title">Datos de la parcela</h2><p className="section-subtitle">Esta información se usa para personalizar la comparación de rotaciones.</p></div>
        <span className="demo-badge">EDITABLE</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="field-label">Nombre de la parcela<input className="field-input" value={field.farmName} onChange={(e) => updateField("farmName", e.target.value)} /></label>
        <label className="field-label">Ubicación<input className="field-input" value={field.location} onChange={(e) => updateField("location", e.target.value)} /></label>
        <label className="field-label">Tipo de suelo<select className="field-input" value={field.soil} onChange={(e) => updateField("soil", e.target.value)}><option>Franco</option><option>Arenoso</option><option>Arcilloso</option><option>Limosa</option></select></label>
        <label className="field-label">Disponibilidad de agua<select className="field-input" value={field.water} onChange={(e) => updateField("water", e.target.value)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
        <label className="field-label">Cultivo anterior<select className="field-input" value={field.previousCrop} onChange={(e) => updateField("previousCrop", e.target.value)}><option>Maíz</option><option>Leguminosa</option><option>Papa</option><option>Arroz</option><option>Otro</option></select></label>
        <label className="field-label">Prioridad principal<select className="field-input" value={field.priority} onChange={(e) => updateField("priority", e.target.value)}><option>Conservar suelo</option><option>Ahorrar agua</option><option>Diversificar cultivos</option></select></label>
        <label className="field-label">Superficie (hectáreas)<input className="field-input" type="number" min="0" step="0.1" value={field.hectares} onChange={(e) => updateField("hectares", Math.max(0, Number(e.target.value)))} /></label>
      </div>
      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-500">Usa datos aproximados si todavía no tienes un análisis técnico del terreno.</p><button disabled={analyzing} onClick={runAnalysis} className="primary-button justify-center disabled:opacity-60"><RefreshCw size={16} className={analyzing ? "animate-spin" : ""} />{analyzing ? "Actualizando..." : "Guardar y analizar"}</button></div>
    </section>
  );

  function renderModule() {
    if (activeModule === "resumen") {
      return <>
        <section className="hero-panel">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> AGRICULTURA BASADA EN DATOS</div>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">Cultiva con visión.<br /><span className="text-emerald-300">Planifica con confianza.</span></h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">Una vista sencilla para entender tu parcela y entrar directamente a las herramientas importantes.</p>
            <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => goTo("rotaciones")} className="hero-button">Comparar rotaciones <ChevronRight size={17} /></button><button onClick={() => goTo("parcela")} className="hero-secondary">Configurar parcela</button></div>
          </div>
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-globe"><Sprout size={72} strokeWidth={1.2} /></div><div className="hero-caption"><Satellite size={14} /> Tierra · Datos · Decisiones</div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Wheat} label="Superficie registrada" value={`${field.hectares} ha`} detail="Área declarada de la parcela" />
          <MetricCard icon={Droplets} label="Disponibilidad de agua" value={field.water} detail="Dato introducido por el usuario" accent="blue" />
          <MetricCard icon={Activity} label="Índice de contexto" value={`${averageScore} / 100`} detail="Puntuación heurística de demostración" accent="amber" />
          <MetricCard icon={Target} label="Alternativas evaluadas" value={`${rotations.length}`} detail="Reglas transparentes de ejemplo" />
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><div className="section-kicker"><ArrowUpRight size={15} /> ACCESOS RÁPIDOS</div><h2 className="section-title">¿Qué quieres hacer hoy?</h2><p className="section-subtitle">Cada módulo tiene su propio espacio para que el panel no se sature.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { id: "parcela" as ModuleId, icon: MapPin, title: "Actualizar mi parcela", desc: "Ubicación, suelo, agua y cultivo anterior", tone: "green" },
              { id: "rotaciones" as ModuleId, icon: RefreshCw, title: "Comparar rotaciones", desc: "Revisar alternativas y puntuaciones", tone: "blue" },
              { id: "ambiente" as ModuleId, icon: Satellite, title: "Ver datos ambientales", desc: "Explorar tendencias de demostración", tone: "amber" },
              { id: "calendario" as ModuleId, icon: CalendarDays, title: "Planificar campaña", desc: "Consultar tareas y fechas por revisar", tone: "green" },
              { id: "suelo" as ModuleId, icon: Layers3, title: "Revisar salud del suelo", desc: "Buenas prácticas y lista de verificación", tone: "blue" },
              { id: "informes" as ModuleId, icon: FileText, title: "Generar informe", desc: "Exportar los datos de esta evaluación", tone: "amber" }
            ].map((item) => <button key={item.id} onClick={() => goTo(item.id)} className="quick-link text-left"><div className={`quick-icon quick-${item.tone}`}><item.icon size={21} /></div><div className="min-w-0 flex-1"><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p></div><ChevronRight size={17} className="text-slate-300" /></button>)}
          </div>
        </section>
        <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <div className="panel-card">
            <div className="panel-heading"><div><div className="section-kicker"><ClipboardList size={15} /> ACTIVIDAD RECIENTE</div><h2 className="section-title">Estado de tu espacio de trabajo</h2></div><span className="demo-badge">{preferences.dataMode === "local" ? "LOCAL" : "DEMO"}</span></div>
            <div className="mt-5 space-y-4">
              <div className="activity-row"><span className="activity-icon bg-emerald-50 text-emerald-700"><CheckCircle2 size={17} /></span><div className="flex-1"><p className="text-sm font-semibold text-slate-800">Perfil de parcela disponible</p><p className="mt-1 text-xs text-slate-500">{field.farmName} · {field.location}</p></div><span className="activity-status">Listo</span></div>
              <div className="activity-row"><span className="activity-icon bg-sky-50 text-sky-700"><RefreshCw size={17} /></span><div className="flex-1"><p className="text-sm font-semibold text-slate-800">Comparación de rotaciones</p><p className="mt-1 text-xs text-slate-500">{rotations.length} alternativas generadas con reglas de ejemplo</p></div><button onClick={() => goTo("rotaciones")} className="text-xs font-bold text-emerald-800">Abrir</button></div>
              <div className="activity-row"><span className={`activity-icon ${preferences.observationSource === "local" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><Satellite size={17} /></span><div className="flex-1"><p className="text-sm font-semibold text-slate-800">{observationSourceTitle}</p><p className="mt-1 text-xs text-slate-500">{observationSourceDetail}</p></div><span className={preferences.observationSource === "local" ? "activity-status" : "pending-status"}>{observationSourceStatus}</span></div>
            </div>
          </div>
          <div className="notice-panel"><div className="flex items-center gap-2 text-amber-800"><CircleAlert size={18} /><p className="font-bold">Antes de tomar una decisión</p></div><p className="mt-3 text-sm leading-6 text-slate-600">Las puntuaciones y las series ambientales de esta versión son ilustrativas. Confirma el tipo de suelo, el calendario local y las necesidades de agua con fuentes fiables o asesoría agronómica.</p><button onClick={() => goTo("guia")} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">Ver alcance del prototipo <ChevronRight size={16} /></button></div>
        </section>
      </>;
    }
    if (activeModule === "parcela") return fieldForm;
    if (activeModule === "rotaciones") return <>
      <div className="panel-card mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-800">Parcela analizada: {field.farmName}</h2><p className="mt-1 text-xs text-slate-500">{field.location} · Suelo {field.soil} · Agua {field.water} · Prioridad: {field.priority}</p></div><button disabled={analyzing} onClick={runAnalysis} className="primary-button justify-center"><RefreshCw size={16} className={analyzing ? "animate-spin" : ""} />Actualizar análisis</button></div>
      <div className="grid gap-5 xl:grid-cols-3">{rotations.map((option, index) => <RotationCard key={option.id} option={option} rank={index + 1} selected={selectedRotation === option.id} onSelect={() => selectRotation(option.id)} />)}</div>
      <div className="panel-card mt-5"><div className="section-kicker"><BarChart3 size={15} /> COMPARACIÓN</div><h2 className="section-title">Puntuación por alternativa</h2><p className="section-subtitle">Índice demostrativo basado en reglas, no probabilidad de éxito.</p><div className="chart-wrap mt-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={rotations.map((r) => ({ name: r.name.replace("Diversificación equilibrada", "Diversificación").replace("Uso eficiente del agua", "Uso de agua").replace("Protección del suelo", "Protección suelo"), score: r.score }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ede7" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0" }} /><Bar dataKey="score" name="Índice heurístico" fill="#2D6A4F" radius={[8, 8, 0, 0]} maxBarSize={56} /></BarChart></ResponsiveContainer></div></div>
    </>;
    if (activeModule === "ambiente") return <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="panel-card"><div className="panel-heading"><div><div className="section-kicker"><CloudSun size={15} /> CONTEXTO AMBIENTAL</div><h2 className="section-title">Tendencias de referencia</h2><p className="section-subtitle">{environmentCustomized ? "Serie ambiental guardada en este navegador." : "Serie ilustrativa de lluvia mensual y cobertura vegetal."}</p></div><span role="button" tabIndex={0} onClick={startEnvironmentEdit} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEnvironmentEdit(); } }} title="Editar serie ambiental" className="demo-badge cursor-pointer">{environmentCustomized ? "DATOS EDITADOS" : "DATOS DEMO"}</span></div><div className="chart-wrap mt-6"><ResponsiveContainer width="100%" height="100%"><AreaChart data={environmentData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2D6A4F" stopOpacity={0.25} /><stop offset="95%" stopColor="#2D6A4F" stopOpacity={0.02} /></linearGradient><linearGradient id="vegFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60A5FA" stopOpacity={0.2} /><stop offset="95%" stopColor="#60A5FA" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ede7" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0" }} /><Area type="monotone" dataKey="rain" name="Lluvia (mm)" stroke="#2D6A4F" strokeWidth={2.5} fill="url(#rainFill)" /><Area type="monotone" dataKey="vegetation" name={environmentCustomized ? "Índice vegetal" : "Índice vegetal ilustrativo"} stroke="#60A5FA" strokeWidth={2.5} fill="url(#vegFill)" /></AreaChart></ResponsiveContainer></div><p className="mt-4 text-xs leading-5 text-slate-500">{environmentCustomized ? "Estos valores fueron editados y guardados localmente; no son observaciones oficiales de NASA." : "Los valores son ficticios y no corresponden a observaciones oficiales de NASA."}</p>{editingEnvironment && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Editar serie ambiental</p><p className="mt-1 text-xs text-slate-500">Ajusta lluvia, temperatura e índice vegetal. Se guardarán como serie local y se usarán en el gráfico y en el informe.</p></div><button type="button" onClick={resetEnvironmentData} className="text-xs font-bold text-slate-500">Restaurar demo</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{environmentDraft.map((point, index) => <div key={point.month} className="rounded-xl bg-white p-3"><p className="text-xs font-bold text-slate-600">{point.month}</p><div className="mt-2 grid grid-cols-3 gap-2"><label className="text-[10px] font-semibold text-slate-500">Lluvia (mm)<input type="number" min="0" step="1" value={point.rain} onChange={(event) => updateEnvironmentDraft(index, "rain", Number(event.target.value))} className="field-input mt-1 px-2 py-1 text-xs" /></label><label className="text-[10px] font-semibold text-slate-500">Temp. (°C)<input type="number" step="1" value={point.temperature} onChange={(event) => updateEnvironmentDraft(index, "temperature", Number(event.target.value))} className="field-input mt-1 px-2 py-1 text-xs" /></label><label className="text-[10px] font-semibold text-slate-500">Veget. (%)<input type="number" min="0" max="100" step="1" value={point.vegetation} onChange={(event) => updateEnvironmentDraft(index, "vegetation", Number(event.target.value))} className="field-input mt-1 px-2 py-1 text-xs" /></label></div></div>)}</div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={saveEnvironmentData} className="primary-button">Guardar datos</button><button type="button" onClick={cancelEnvironmentEdit} className="secondary-button">Cancelar</button></div></div></div>)}</div><div className="panel-card"><div className="section-kicker"><Satellite size={15} /> FUENTES Y CALIDAD</div><h2 className="section-title">Estado de los datos</h2><div className="mt-5 space-y-3"><div className="source-row"><span className={`source-dot ${preferences.observationSource === "local" ? "bg-emerald-500" : "bg-amber-400"}`} /><div><p className="text-sm font-semibold">{observationSourceTitle}</p><p className="text-xs text-slate-500">{observationSourceDetail}</p></div><span className={preferences.observationSource === "local" ? "activity-status" : "pending-status"}>{observationSourceStatus}</span></div><div className="source-row"><span className="source-dot bg-emerald-500" /><div><p className="text-sm font-semibold">Perfil de parcela</p><p className="text-xs text-slate-500">Datos guardados en este navegador</p></div><span className="activity-status">Disponible</span></div><div className="source-row"><span className="source-dot bg-emerald-500" /><div><p className="text-sm font-semibold">{environmentCustomized ? "Serie ambiental local" : "Serie ambiental de muestra"}</p><p className="text-xs text-slate-500">{environmentCustomized ? "Serie editada y guardada en el navegador" : "Solo para probar los gráficos"}</p></div><span className="activity-status">Disponible</span></div></div><div className="notice-panel mt-6"><p className="font-bold text-slate-800">Siguiente paso recomendado</p><p className="mt-2 text-sm leading-6 text-slate-600">{observationNextStep}</p></div></div></div>;
    if (activeModule === "suelo") return <div className="grid gap-5 lg:grid-cols-2"><div className="panel-card"><div className="section-kicker"><Layers3 size={15} /> LISTA DE VERIFICACIÓN</div><h2 className="section-title">Prácticas para revisar</h2><p className="section-subtitle">Marca las prácticas que ya se consideran en la parcela. Esto no equivale a un análisis de laboratorio.</p><SoilChecklist onOpenNotes={() => setEditingSoilNotes(true)} /></div><div className="panel-card"><div className="section-kicker"><FlaskConical size={15} /> EVALUACIÓN TÉCNICA</div><h2 className="section-title">Datos que conviene recopilar</h2><div className="mt-5 space-y-4">{[{title:"Análisis de suelo reciente",desc:"pH, materia orgánica, nutrientes y textura."},{title:"Historial de cultivos",desc:"Cultivos previos, fertilización y manejo de residuos."},{title:"Riesgo de erosión",desc:"Pendiente, cobertura vegetal y exposición a lluvias."},{title:"Disponibilidad de agua",desc:"Fuente, estacionalidad y restricciones de riego."}].map((item) => <div key={item.title} className="insight-row"><div className="insight-icon bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} /></div><div><p className="font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p></div></div>)}</div><p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">La idoneidad de las prácticas depende de la especie, el clima, el terreno y la recomendación agronómica local.</p></div>{editingSoilNotes && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-2xl"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas de campo</p><p className="mt-1 text-xs text-slate-500">Observaciones, análisis pendientes o prácticas a revisar. Se incluyen en el informe exportado.</p><textarea className="field-input mt-4 min-h-[120px] resize-y" value={soilNotesDraft} onChange={(e) => setSoilNotesDraft(e.target.value)} placeholder="Escribe tus observaciones..." /><p className="mt-3 text-xs text-slate-500">{soilNotesDraft !== soilNotes ? "Cambios sin guardar." : soilNotes ? "Notas guardadas en este navegador." : "Sin notas guardadas."}</p><div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" onClick={cancelSoilNotes} className="secondary-button">Cancelar</button><button type="button" onClick={saveSoilNotes} className="primary-button"><Save size={16} /> Guardar notas</button></div></div></div>)}</div>;
    if (activeModule === "calendario") return <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><div className="panel-card"><div className="section-kicker"><CalendarDays size={15} /> CAMPAÑA AGRÍCOLA</div><h2 className="section-title">Planificador de actividades</h2><p className="section-subtitle">Ejemplo de tareas para adaptar a la temporada y al cultivo real.</p><div className="mt-6 space-y-3">{calendarTasks.map((item) => {
      const isEditing = editingCalendarId === item.id;
      const activeDate = isEditing ? calendarDraft.date : item.date;
      const parsedDate = activeDate ? new Date(`${activeDate}T00:00:00`) : null;
      const dateValue = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
      const phaseNumber = item.phase.match(/\d+/)?.[0];
      const dayLabel = dateValue ? String(dateValue.getDate()).padStart(2, "0") : (phaseNumber ? phaseNumber.padStart(2, "0") : item.phase);
      const monthLabel = dateValue ? dateValue.toLocaleDateString("es-PE", { month: "short" }).replace(".", "").toUpperCase() : item.phase;
      return (
        <div key={item.id} className="calendar-item">
          <div className="calendar-date relative" title={activeDate ? `Fecha: ${activeDate}` : "Haz clic para asignar una fecha"}>
            <strong>{dayLabel}</strong>
            <span>{monthLabel}</span>
            <input
              aria-label={`Fecha para ${isEditing ? calendarDraft.title : item.title}`}
              type="date"
              value={activeDate}
              onChange={(e) => isEditing ? setCalendarDraft((current) => ({ ...current, date: e.target.value })) : updateCalendarDate(item.id, e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  aria-label="Título de la fase"
                  value={calendarDraft.title}
                  onChange={(e) => setCalendarDraft((current) => ({ ...current, title: e.target.value }))}
                  maxLength={80}
                  className="field-input"
                />
                <textarea
                  aria-label="Descripción de la fase"
                  value={calendarDraft.desc}
                  onChange={(e) => setCalendarDraft((current) => ({ ...current, desc: e.target.value }))}
                  maxLength={240}
                  className="field-input min-h-[64px] resize-y"
                />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button type="button" onClick={() => saveCalendarTask(item.id)} className="text-xs font-bold text-emerald-800">Guardar cambios</button>
                  <button type="button" onClick={cancelCalendarEdit} className="text-xs font-bold text-slate-500">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p
                  role="button"
                  tabIndex={0}
                  title="Haz clic para editar el título y la descripción"
                  onClick={() => startCalendarEdit(item)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startCalendarEdit(item); } }}
                  className="cursor-pointer font-semibold text-slate-800"
                >{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
              </>
            )}
          </div>
          <button type="button" onClick={() => cycleCalendarStatus(item.id)} title="Cambiar estado" className={item.status === "done" ? "activity-status" : "pending-status"}>{calendarStatusLabel[item.status]}</button>
        </div>
      );
    })}</div></div><div className="notice-panel h-fit"><div className="flex items-center gap-2 text-emerald-800"><Clock3 size={18}/><p className="font-bold">Personaliza las fechas</p></div><p className="mt-3 text-sm leading-6 text-slate-600">Haz clic en el título de una fase para editar su texto, en la fecha para ajustarla y en el estado para marcarla como completada. Al editar una fase, usa "Guardar cambios" para conservar el texto y la fecha. Este calendario es una plantilla de planificación, no un calendario de siembra específico para Huánuco; ajusta las fechas según la especie, la altitud, la temporada y la orientación técnica local.</p><button onClick={() => goTo("parcela")} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">Revisar datos de parcela <ChevronRight size={16}/></button></div></div>;
    if (activeModule === "informes") return <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]"><div className="panel-card"><div className="section-kicker"><FileText size={15} /> INFORME DE EVALUACIÓN</div><h2 className="section-title">Resumen listo para exportar</h2><p className="section-subtitle">El archivo contiene los datos actuales de la parcela, las alternativas y la serie ambiental vigente.</p><div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Parcela</p><p className="mt-2 text-lg font-bold text-slate-900">{field.farmName}</p><p className="mt-1 text-sm text-slate-500">{field.location} · {field.hectares} ha</p><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Alternativas</p><p className="mt-1 font-bold">{rotations.length}</p></div><div><p className="text-xs text-slate-500">Seleccionada</p><p className="mt-1 font-bold">{selected?.name || "Ninguna"}</p></div></div></div><button onClick={downloadReport} className="primary-button mt-5 w-full justify-center"><ArrowDownToLine size={17}/> Descargar informe {preferences.exportFormat.toUpperCase()}</button></div><div className="panel-card"><div className="section-kicker"><ShieldCheck size={15} /> TRANSPARENCIA</div><h2 className="section-title">Incluido en el archivo</h2><div className="mt-5 space-y-3">{["Fecha de generación del informe","Perfil agrícola editable","Alternativas y puntuaciones heurísticas",environmentCustomized ? "Serie ambiental editada y guardada" : "Serie ambiental ficticia para demostración","Aviso de limitaciones y validación"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-700"><CheckCircle2 size={17} className="text-emerald-700"/>{item}</div>)}</div><p className="mt-6 text-xs leading-5 text-slate-500">La exportación actual es {preferences.exportFormat.toUpperCase()}. Incluye los datos de la parcela, las alternativas y la serie ambiental. No genera un PDF en esta versión.</p></div></div>;
    if (activeModule === "guia") return <div className="grid gap-5 lg:grid-cols-2"><div className="panel-card"><div className="section-kicker"><BookOpen size={15}/ > CÓMO EMPEZAR</div><h2 className="section-title">Flujo de trabajo recomendado</h2><div className="mt-6 space-y-5">{[{n:"01",title:"Completa el perfil de parcela",desc:"Registra ubicación, suelo, agua y cultivo anterior."},{n:"02",title:"Actualiza la comparación",desc:"Ejecuta el análisis para ver cómo cambian las puntuaciones heurísticas."},{n:"03",title:"Revisa cada alternativa",desc:"Lee la secuencia, los criterios y las limitaciones; no elijas solo por la puntuación."},{n:"04",title:"Exporta y valida",desc:"Descarga el informe y contrasta las opciones con fuentes locales o asesoría agronómica."}].map((item) => <div key={item.n} className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-800">{item.n}</div><div><p className="font-bold text-slate-800">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{item.desc}</p></div></div>)}</div></div><div className="panel-card"><div className="section-kicker"><CircleHelp size={15}/> ALCANCE DEL MVP</div><h2 className="section-title">Qué funciona y qué falta</h2><div className="mt-5 space-y-4"><div className="rounded-xl bg-emerald-50 p-4"><p className="font-bold text-emerald-900">Implementado en esta demo</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-emerald-900/80"><li>Navegación por módulos</li><li>Formulario de parcela y API de análisis</li><li>Comparador y gráficos interactivos</li><li>Exportación JSON/CSV</li></ul></div><div className="rounded-xl bg-amber-50 p-4"><p className="font-bold text-amber-900">Pendiente de desarrollo</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-amber-900/80"><li>Conexión y validación de datos NASA</li><li>Sincronización de usuarios y parcelas en la nube</li><li>Validación agronómica especializada</li><li>PDF y calendario con fechas reales</li></ul></div></div></div></div>;
    return <div className="panel-card max-w-3xl">
      <div className="section-kicker"><Settings2 size={15}/> CONFIGURACIÓN DEL PROYECTO</div>
      <h2 className="section-title">Preferencias y estado</h2>
      <div className="mt-6 divide-y divide-slate-100">
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="pref-app-name" className="text-sm font-semibold text-slate-700">Nombre de la plataforma</label>
          <input id="pref-app-name" value={draftPreferences.appName} onChange={(e) => setDraftPreferences((current) => ({ ...current, appName: e.target.value }))} maxLength={40} className="w-full bg-transparent p-0 text-sm text-slate-500 outline-none sm:max-w-[320px] sm:text-right" />
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-semibold text-slate-700">Idioma</span><span className="text-sm text-slate-500">Español</span></div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="pref-data-mode" className="text-sm font-semibold text-slate-700">Modo de datos</label>
          <select id="pref-data-mode" title="Seleccionar modo de datos" value={draftPreferences.dataMode} onChange={(e) => setDraftPreferences((current) => ({ ...current, dataMode: e.target.value === "local" ? "local" : "demo" }))} className="w-full cursor-pointer appearance-none bg-transparent p-0 text-sm text-slate-500 outline-none sm:max-w-[320px] sm:text-right">
            <option value="demo">Demostración con API</option>
            <option value="local">Solo análisis local</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="pref-source" className="text-sm font-semibold text-slate-700">Fuente de observaciones</label>
          <select id="pref-source" title="Seleccionar fuente de observaciones" value={draftPreferences.observationSource} onChange={(e) => setDraftPreferences((current) => ({ ...current, observationSource: e.target.value === "local" ? "local" : e.target.value === "none" ? "none" : "nasa" }))} className="w-full cursor-pointer appearance-none bg-transparent p-0 text-sm text-slate-500 outline-none sm:max-w-[320px] sm:text-right">
            <option value="nasa">NASA Earthdata — pendiente de integrar</option>
            <option value="local">Datos locales manuales</option>
            <option value="none">Sin fuente configurada</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="pref-format" className="text-sm font-semibold text-slate-700">Formato de exportación</label>
          <select id="pref-format" title="Seleccionar formato de exportación" value={draftPreferences.exportFormat} onChange={(e) => setDraftPreferences((current) => ({ ...current, exportFormat: e.target.value === "csv" ? "csv" : "json" }))} className="w-full cursor-pointer appearance-none bg-transparent p-0 text-sm text-slate-500 outline-none sm:max-w-[320px] sm:text-right">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>
      <button onClick={savePreferences} className="primary-button mt-5"><Settings2 size={16}/> Guardar preferencias</button>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-slate-900">
      <aside className="sidebar hidden lg:flex">
        <button onClick={() => goTo("resumen")} className="brand-lockup text-left">
          <div className="brand-icon"><Leaf size={23} /></div>
          <div><p className="text-lg font-extrabold tracking-tight">{preferences.appName}</p><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Agricultura inteligente</p></div>
        </button>
        <div className="mt-10 flex-1 overflow-y-auto">
          {navGroups.map((group) => <div key={group.title} className="mb-7"><p className="sidebar-label">{group.title}</p><nav className="mt-3 space-y-1">{group.items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goTo(id)} className={`nav-item ${activeModule === id ? "nav-item-active" : ""}`}><Icon size={18}/><span>{label}</span>{activeModule === id && <ChevronRight className="ml-auto" size={16}/>}</button>)}</nav></div>)}
        </div>
        <div className="sidebar-bottom">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-emerald-200"><Satellite size={17}/><span className="text-xs font-semibold">Versión demostrativa</span></div><p className="mt-2 text-xs leading-5 text-slate-300">{environmentCustomized ? "Serie ambiental editada y guardada en este navegador. Revísala antes de usarla en una decisión." : preferences.observationSource === "local" ? "Fuente de datos locales seleccionada. Las series ambientales siguen siendo de demostración." : preferences.observationSource === "none" ? "No hay una fuente de observación configurada. Las series ambientales son de demostración." : "Los datos ambientales aún no están conectados a una fuente real."}</p></div>
          <div className="mt-5 flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-950"><Leaf size={19}/></div><div><p className="text-sm font-semibold text-white">{preferences.appName}</p><p className="text-xs text-slate-400">Workspace agrícola</p></div></div>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="topbar">
          <div className="flex items-center gap-3 lg:hidden"><button aria-label="Abrir menú" onClick={() => setMobileMenu(!mobileMenu)} className="rounded-xl border border-slate-200 p-2">{mobileMenu ? <X size={19}/> : <Menu size={19}/>}</button><button onClick={() => goTo("resumen")} className="flex items-center gap-2"><div className="brand-icon brand-icon-small"><Leaf size={17}/></div><span className="font-extrabold">{preferences.appName}</span></button></div>
          <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><Globe2 size={16}/><span>Espacio de trabajo</span><span className="mx-1 text-slate-300">/</span><span className="font-semibold text-slate-800">{currentMeta.title}</span></div>
          <div className="ml-auto flex items-center gap-3">
            <div className="search-box hidden xl:flex"><Search size={15}/><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar módulo..." onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} /></div>
            <span className="status-dot"/><span className="hidden text-xs font-medium text-slate-600 sm:inline">Sistema operativo · {preferences.dataMode === "local" ? "Local" : "Demo"}</span>
            <button aria-label="Exportar informe" onClick={downloadReport} className="primary-button"><ArrowDownToLine size={16}/><span className="hidden sm:inline">Exportar</span></button>
          </div>
        </header>
        {mobileMenu && <div className="mobile-menu lg:hidden">{navGroups.flatMap((group) => group.items).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goTo(id)} className={`nav-item ${activeModule === id ? "nav-item-active" : ""}`}><Icon size={18}/>{label}</button>)}</div>}
        <main className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><div className="section-kicker"><currentMeta.icon size={15}/> {currentMeta.kicker}</div><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{currentMeta.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{currentMeta.subtitle}</p></div>
            {activeModule !== "resumen" && <button onClick={() => goTo("resumen")} className="secondary-button"><LayoutDashboard size={15}/> Volver al resumen</button>}
          </div>
          {renderModule()}
          <footer className="flex flex-col gap-3 border-t border-slate-200 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><div className="brand-icon brand-icon-small"><Leaf size={15}/></div><span className="font-bold text-slate-700">{preferences.appName}</span><span>· NASA Space Apps Challenge 2026</span></div><p>Prototipo educativo · Datos simulados · Validar con fuentes locales.</p></footer>
        </main>
      </div>
      {toast && <div role="status" className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    </div>
  );
}

function SoilChecklist({ onOpenNotes }: { onOpenNotes: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    const stored = readStorage<string[]>(storageKeys.soilChecklist, []);
    if (Array.isArray(stored)) {
      setChecked(stored.filter((item) => soilPractices.includes(item)));
    }
  }, []);

  function togglePractice(item: string, isChecked: boolean) {
    setChecked((current) => {
      const next = isChecked ? (current.includes(item) ? current : [...current, item]) : current.filter((value) => value !== item);
      writeStorage(storageKeys.soilChecklist, next);
      return next;
    });
  }

  return <div className="mt-5 space-y-3">{soilPractices.map((item) => <label key={item} className="check-row"><input type="checkbox" checked={checked.includes(item)} onChange={(e) => togglePractice(item, e.target.checked)} /><span>{item}</span></label>)}<button type="button" onClick={onOpenNotes} title="Haz clic para editar las notas de campo" className="mt-4 w-full text-left text-xs text-slate-500">{checked.length} de {soilPractices.length} prácticas marcadas. La selección se guarda automáticamente en este navegador.</button></div>;
}
