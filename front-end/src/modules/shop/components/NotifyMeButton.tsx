"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import toast from "react-hot-toast";
import { getTenantSlug } from "../../../shared/utils/tenant";
import { getExistingPushSubscription, isPushSupported, subscribeToOrderNotifications } from "../../../shared/utils/push";
import { shopErrorToastOptions, shopSuccessToastOptions } from "../utils/toast";

type Status = "checking" | "hidden" | "idle" | "subscribing" | "subscribed";

export function NotifyMeButton({ className }: { className?: string }) {
    const [status, setStatus] = useState<Status>("checking");

    useEffect(() => {
        let cancelled = false;

        async function checkState() {
            if (!isPushSupported() || Notification.permission === "denied") {
                if (!cancelled) setStatus("hidden");
                return;
            }

            const existing = await getExistingPushSubscription().catch(() => null);
            if (!cancelled) setStatus(existing ? "subscribed" : "idle");
        }

        checkState();
        return () => {
            cancelled = true;
        };
    }, []);

    if (status === "checking" || status === "hidden") {
        return null;
    }

    if (status === "subscribed") {
        return (
            <div className={`flex items-center gap-2 text-emerald-600 ${className || ""}`}>
                <BellRing size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Notificações ativadas</span>
            </div>
        );
    }

    const handleClick = async () => {
        setStatus("subscribing");
        try {
            const slug = getTenantSlug();
            const phone = localStorage.getItem("@FoodSystem:customerPhone") || "";
            const accessToken = localStorage.getItem(`@FoodSystem:customerAccessToken:${slug}`) || "";

            if (!phone || !accessToken) {
                toast.error("Não foi possível ativar as notificações agora.", shopErrorToastOptions);
                setStatus("idle");
                return;
            }

            const subscribed = await subscribeToOrderNotifications({ phone, accessToken });
            if (subscribed) {
                toast.success("Notificações ativadas!", shopSuccessToastOptions);
                setStatus("subscribed");
            } else {
                toast.error("Permissão de notificação não concedida.", shopErrorToastOptions);
                setStatus("idle");
            }
        } catch (error) {
            console.error("Erro ao ativar notificações:", error);
            toast.error("Erro ao ativar notificações.", shopErrorToastOptions);
            setStatus("idle");
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={status === "subscribing"}
            className={
                className ||
                "flex items-center justify-center gap-2 h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-body font-bold text-label uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60"
            }
        >
            <Bell size={16} />
            {status === "subscribing" ? "Ativando..." : "Avisar quando o status mudar"}
        </button>
    );
}
