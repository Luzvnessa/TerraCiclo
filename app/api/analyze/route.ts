import { NextResponse } from "next/server";
import { analyzeRotations } from "@/lib/analysis";
import type { FieldProfile } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<FieldProfile>;
    const field: FieldProfile = {
      farmName: String(body.farmName || "Parcela sin nombre").slice(0, 100),
      location: String(body.location || "Ubicación no especificada").slice(0, 100),
      soil: String(body.soil || "Franco"),
      water: String(body.water || "Media"),
      previousCrop: String(body.previousCrop || "Maíz"),
      priority: String(body.priority || "Conservar suelo"),
      hectares: Number.isFinite(Number(body.hectares)) ? Math.max(0, Number(body.hectares)) : 0
    };
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      field,
      rotations: analyzeRotations(field),
      dataStatus: "DEMO",
      disclaimer: "Resultados heurísticos de demostración; validar con información local y asesoría agronómica."
    });
  } catch {
    return NextResponse.json({ error: "No se pudo analizar la parcela. Verifica los datos enviados." }, { status: 400 });
  }
}
