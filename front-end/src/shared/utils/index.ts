import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const normalizeMoneyInput = (value: string) => {
  const onlyValidChars = value.replace(/[^\d.,]/g, "");
  const decimalWithComma = onlyValidChars.replace(/\./g, ",");
  const firstCommaIndex = decimalWithComma.indexOf(",");

  if (firstCommaIndex === -1) return decimalWithComma;

  const integerPart = decimalWithComma.slice(0, firstCommaIndex);
  const decimalPart = decimalWithComma.slice(firstCommaIndex + 1).replace(/,/g, "");
  return `${integerPart},${decimalPart}`;
};

export const parseMoneyInput = (value: string | number | null | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toMoneyInputValue = (value: string | number | null | undefined) => {
  if (value == null) return "";
  return String(value).replace(".", ",");
};

export const formatMoneyInputRealtime = (value: string) => {
  if (!value) return "0,00";

  const onlyDigits = value.replace(/\D/g, "");
  if (!onlyDigits) return "0,00";

  const numericValue = Number(onlyDigits);
  const actualValue = numericValue / 100;

  return actualValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const normalizeAssetUrl = (value: string | null | undefined) => {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const withApiOrigin = (pathname: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    try {
      return apiUrl.startsWith("http")
        ? `${new URL(apiUrl).origin}${pathname}`
        : pathname;
    } catch {
      return pathname;
    }
  };

  if (raw.startsWith('/uploads/')) {
    return withApiOrigin(`/api${raw}`);
  }

  if (raw.startsWith('/api/uploads/')) {
    return withApiOrigin(raw);
  }

  if (raw.startsWith('uploads/')) {
    return withApiOrigin(`/api/${raw}`);
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith('/api/uploads/')) {
        return `${parsed.origin}${parsed.pathname}${parsed.search}`;
      }
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${parsed.origin}/api${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return raw;
    }
  }

  return raw;
};
