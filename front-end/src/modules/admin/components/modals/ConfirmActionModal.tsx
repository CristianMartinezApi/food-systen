import { ReactNode } from "react";

type ConfirmActionModalProps = {
    isOpen: boolean;
    title: string;
    description: string;
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
};

export function ConfirmActionModal({
    isOpen,
    title,
    description,
    children,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onClose,
}: ConfirmActionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
                {children ? <div className="mt-4">{children}</div> : null}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
