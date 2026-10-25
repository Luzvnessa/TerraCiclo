import { ArrowUpRight, Droplets, Leaf, Sprout } from "lucide-react";
import type { RotationOption } from "@/lib/data";

export default function RotationCard({ option, rank, onSelect, selected }: {
  option: RotationOption; rank: number; onSelect: () => void; selected: boolean;
}) {
  return (
    <article className={`rotation-card ${selected ? "rotation-card-selected" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Sprout size={22} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Alternativa {rank}</p>
            <h3 className="font-bold text-slate-900">{option.name}</h3>
          </div>
        </div>
        <div className="score-pill">{option.score}<span>/100</span></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {option.sequence.map((crop) => <span key={crop} className="crop-chip">{crop}</span>)}
      </div>
      <p className="mt-4 min-h-[60px] text-sm leading-6 text-slate-600">{option.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500"><Droplets size={14} /> Agua</div>
          <p className="mt-1 text-sm font-semibold text-slate-800">{option.water}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500"><Leaf size={14} /> Suelo</div>
          <p className="mt-1 text-sm font-semibold text-slate-800">{option.soil}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {option.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
      <button onClick={onSelect} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${selected ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>
        {selected ? "Seleccionada para el informe" : "Seleccionar alternativa"} <ArrowUpRight size={16} />
      </button>
    </article>
  );
}
