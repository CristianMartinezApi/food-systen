import { cn } from "../../../../shared/utils";

export type PrintMode = "THERMAL" | "A4";

type PrintModeModalProps = {
    isOpen: boolean;
    targetLabel: string;
    selectedMode: PrintMode;
    onSelectMode: (mode: PrintMode) => void;
    onClose: () => void;
    onConfirm: () => void;
    showDirectToggle?: boolean;
    directEnabled?: boolean;
    directToggleLabel?: string;
    onToggleDirectEnabled?: (enabled: boolean) => void;
};

export function PrintModeModal({
    isOpen,
    targetLabel,
    selectedMode,
    onSelectMode,
    onClose,
    onConfirm,
    showDirectToggle = false,
    directEnabled = false,
    directToggleLabel = "Sempre imprimir direto sem perguntar",
    onToggleDirectEnabled,
}: PrintModeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-slate-950">Formato de impressão</h3>
                <p className="mt-2 text-sm text-slate-500">Escolha como deseja imprimir {targetLabel}.</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400">A escolha fica salva para as próximas impressões.</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onSelectMode("THERMAL")}
                        className={cn(
                            "h-11 rounded-lg border text-xs font-semibold transition-all",
                            selectedMode === "THERMAL" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
                        )}
                    >
                        Termica 80mm
                    </button>
                    <button
                        onClick={() => onSelectMode("A4")}
                        className={cn(
                            "h-11 rounded-lg border text-xs font-semibold transition-all",
                            selectedMode === "A4" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
                        )}
                    >
                        A4
                    </button>
                </div>

                {showDirectToggle && (
                    <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={directEnabled}
                            onChange={(e) => onToggleDirectEnabled?.(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">{directToggleLabel}</span>
                    </label>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="h-10 px-4 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.12em]"
                    >
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
