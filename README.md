# TerraCiclo 🌱

Plataforma demostrativa para apoyar la planificación de rotaciones de cultivos con datos del terreno y contexto ambiental.

## Requisitos
- Node.js 18.17 o superior (recomendado Node.js 20 LTS)
- npm

## Instalación y ejecución
```bash
npm install
npm run dev
```
Abre http://localhost:3000.

Para validar la compilación:
```bash
npm run build
npm start
```

## Qué incluye
- Dashboard de resumen con accesos rápidos y navegación modular.
- Módulos separados: explotación, calendario agrícola, rotaciones, datos ambientales, salud del suelo, informes, guía y configuración.
- Formulario editable de parcela con guardado en el navegador.
- Comparador de alternativas de rotación con evaluación por reglas transparentes y selección persistente.
- Calendario con fechas, estados, títulos y descripciones editables y guardables.
- Lista de verificación de prácticas del suelo con guardado automático y notas de campo con guardado manual.
- Preferencias de nombre, modo de análisis, fuente de observaciones y formato de exportación.
- Gráficos de datos ambientales con serie mensual editable y persistente.
- Descarga de un reporte en JSON o CSV según la preferencia, incluyendo notas de campo y la serie ambiental vigente.
- API de análisis en `POST /api/analyze`.

## Importante sobre los datos
La información mostrada en el dashboard es **simulada y se identifica como demostración**. No hay una conexión activa a servicios de la NASA en esta versión. La integración real requiere seleccionar los productos de Earthdata/NASA adecuados, revisar licencias, resolución, cobertura y configurar credenciales cuando el servicio las requiera.

Las series ambientales, el calendario y las notas de campo se pueden editar y guardar en el navegador, pero siguen siendo datos locales de trabajo y no sustituyen una fuente oficial ni una recomendación agronómica.

Las puntuaciones son una evaluación heurística de demostración, no asesoría agronómica profesional ni una predicción científica. Las decisiones de cultivo deben validarse con información local y especialistas.

## Estructura
```text
app/
  api/analyze/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  Dashboard.tsx
  MetricCard.tsx
  RotationCard.tsx
lib/
  analysis.ts
  data.ts
  storage.ts
```
