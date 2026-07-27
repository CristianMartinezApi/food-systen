export const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface OperatingShift {
  open: string;
  close: string;
}

export interface OperatingDay {
  enabled: boolean;
  shifts: OperatingShift[];
}

export type OperatingHours = Record<DayKey, OperatingDay>;

const DEFAULT_SHIFT: OperatingShift = { open: "18:00", close: "23:00" };

const createDefaultDay = (): OperatingDay => ({
  enabled: true,
  shifts: [{ ...DEFAULT_SHIFT }],
});

export const createDefaultOperatingHours = (): OperatingHours =>
  DAY_KEYS.reduce((acc, day) => {
    acc[day] = createDefaultDay();
    return acc;
  }, {} as OperatingHours);

const normalizeTime = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
};

const normalizeShift = (shift: any): OperatingShift => ({
  open: normalizeTime(shift?.open, DEFAULT_SHIFT.open),
  close: normalizeTime(shift?.close, DEFAULT_SHIFT.close),
});

export const normalizeOperatingHours = (value: any): OperatingHours => {
  const normalized = createDefaultOperatingHours();

  if (!value || typeof value !== "object") {
    return normalized;
  }

  DAY_KEYS.forEach((day) => {
    const raw = value[day];

    if (!raw || typeof raw !== "object") {
      return;
    }

    if (Array.isArray(raw.shifts)) {
      const shifts = raw.shifts
        .map(normalizeShift)
        .filter((shift: OperatingShift) => shift.open && shift.close)
        .sort((a: OperatingShift, b: OperatingShift) => toMinutes(a.open) - toMinutes(b.open));

      normalized[day] = {
        enabled: raw.enabled !== false,
        shifts: shifts.length > 0 ? shifts : [{ ...DEFAULT_SHIFT }],
      };
      return;
    }

    if (typeof raw.open === "string" || typeof raw.close === "string") {
      normalized[day] = {
        enabled: raw.closed === true ? false : raw.enabled !== false,
        shifts: [{
          open: normalizeTime(raw.open, DEFAULT_SHIFT.open),
          close: normalizeTime(raw.close, DEFAULT_SHIFT.close),
        }],
      };
    }
  });

  return normalized;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const DAY_LABELS: Record<DayKey, string> = {
  dom: "Domingo",
  seg: "Segunda-feira",
  ter: "Terça-feira",
  qua: "Quarta-feira",
  qui: "Quinta-feira",
  sex: "Sexta-feira",
  sab: "Sábado",
};

export const validateOperatingHours = (value: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["Informe os horários de funcionamento."] };
  }

  DAY_KEYS.forEach((day) => {
    const raw = value[day];
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.shifts)) {
      errors.push(`${DAY_LABELS[day]}: configuração ausente.`);
      return;
    }
    if (raw.enabled === false) return;
    if (raw.shifts.length === 0) {
      errors.push(`${DAY_LABELS[day]}: adicione um turno ou marque o dia como fechado.`);
      return;
    }

    const intervals: Array<{ start: number; end: number }> = [];
    raw.shifts.forEach((shift: any, index: number) => {
      const open = String(shift?.open || "");
      const close = String(shift?.close || "");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) {
        errors.push(`${DAY_LABELS[day]}, turno ${index + 1}: informe horários válidos.`);
        return;
      }
      const start = toMinutes(open);
      const rawEnd = toMinutes(close);
      if (start === rawEnd) {
        errors.push(`${DAY_LABELS[day]}, turno ${index + 1}: abertura e fechamento não podem ser iguais.`);
        return;
      }
      intervals.push({ start, end: rawEnd <= start ? rawEnd + 1440 : rawEnd });
    });

    intervals.sort((a, b) => a.start - b.start);
    for (let index = 1; index < intervals.length; index += 1) {
      if (intervals[index].start < intervals[index - 1].end) {
        errors.push(`${DAY_LABELS[day]}: existem turnos sobrepostos.`);
        break;
      }
    }
  });

  return { valid: errors.length === 0, errors };
};

const dayKeyFor = (date: Date) => DAY_KEYS[date.getDay() as number];

const isShiftActive = (currentMinutes: number, shift: OperatingShift) => {
  const open = toMinutes(shift.open);
  const close = toMinutes(shift.close);

  if (open === close) return false;

  if (open < close) {
    return currentMinutes >= open && currentMinutes < close;
  }

  return currentMinutes >= open || currentMinutes < close;
};

export const isRestaurantOpenNow = (value: any, date = new Date()) => {
  const operatingHours = normalizeOperatingHours(value);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const currentDay = dayKeyFor(date);
  const previousDay = DAY_KEYS[((date.getDay() + 6) % 7) as number];

  const today = operatingHours[currentDay];
  if (today.enabled && today.shifts.some((shift) => isShiftActive(currentMinutes, shift))) {
    return true;
  }

  const yesterday = operatingHours[previousDay];
  if (!yesterday.enabled) {
    return false;
  }

  return yesterday.shifts.some((shift) => {
    const open = toMinutes(shift.open);
    const close = toMinutes(shift.close);
    return open > close && currentMinutes < close;
  });
};

export const getOperatingHoursSummary = (value: any, dayIndex = new Date().getDay()) => {
  const operatingHours = normalizeOperatingHours(value);
  const day = operatingHours[DAY_KEYS[dayIndex]];

  if (!day) return "Sem horário cadastrado";

  const label = day.shifts
    .map((shift) => `${shift.open} - ${shift.close}`)
    .join(" • ");

  return day.enabled ? label : "Fechado";
};

export const getNextOpeningLabel = (value: any, date = new Date()) => {
  const operatingHours = normalizeOperatingHours(value);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  for (let offset = 0; offset < 7; offset += 1) {
    const next = new Date(date);
    next.setDate(date.getDate() + offset);
    const day = operatingHours[dayKeyFor(next)];

    if (!day.enabled) continue;

    for (const shift of day.shifts) {
      const open = toMinutes(shift.open);
      const close = toMinutes(shift.close);

      if (offset === 0) {
        if (currentMinutes < open) {
          return `hoje às ${shift.open}`;
        }

        if (open > close && currentMinutes < close) {
          return `até ${shift.close}`;
        }
      } else {
        return offset === 1 ? `amanhã às ${shift.open}` : `em ${offset} dias às ${shift.open}`;
      }
    }
  }

  return "Sem próximos horários";
};
