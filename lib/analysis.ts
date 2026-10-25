import type { FieldProfile, RotationOption } from "./data";
import { defaultRotations } from "./data";

export function analyzeRotations(field: FieldProfile): RotationOption[] {
  return defaultRotations.map((option) => {
    let score = option.score;
    if (field.priority === "Ahorrar agua" && option.id === "b") score += 7;
    if (field.priority === "Conservar suelo" && option.id === "c") score += 6;
    if (field.water === "Baja" && option.id === "b") score += 5;
    if (field.soil === "Arenoso" && option.id === "c") score += 2;
    if (field.soil === "Arcilloso" && option.id === "a") score += 2;
    if (field.previousCrop === "Leguminosa" && option.id === "a") score -= 3;
    return { ...option, score: Math.max(55, Math.min(98, score)) };
  }).sort((a, b) => b.score - a.score);
}
