const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

type DayKey = (typeof DAY_KEYS)[number];

export type OperatingShift = {
  open: string;
  close: string;
};

export type OperatingDay = {
  enabled: boolean;
  shifts: OperatingShift[];
};

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

const dayKeyFor = (date: Date) => DAY_KEYS[date.getDay() as number];

export const validateOperatingHours = (value: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["Horários de funcionamento são obrigatórios."] };
  }

  DAY_KEYS.forEach((day) => {
    const raw = value[day];
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.shifts)) {
      errors.push(`${DAY_LABELS[day]}: configuração ausente.`);
      return;
    }
    if (raw.enabled === false) return;
    if (raw.shifts.length === 0) {
      errors.push(`${DAY_LABELS[day]}: adicione ao menos um turno ou marque o dia como fechado.`);
      return;
    }

    const intervals: Array<{ start: number; end: number }> = [];
    raw.shifts.forEach((shift: any, index: number) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(shift?.open || "")) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(shift?.close || ""))) {
        errors.push(`${DAY_LABELS[day]}, turno ${index + 1}: horário inválido.`);
        return;
      }
      const start = toMinutes(shift.open);
      const rawEnd = toMinutes(shift.close);
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
          return `Hoje às ${shift.open}`;
        }

        if (open > close && currentMinutes < close) {
          return `Agora até ${shift.close}`;
        }
      } else {
        return offset === 1 ? `Amanhã às ${shift.open}` : `Em ${offset} dias às ${shift.open}`;
      }
    }
  }

  return "Sem próximos horários";
};

export const getCashSessionDeadline = (value: any, openedAt: Date, graceMinutes = 60, maximumHours = 20) => {
  const operatingHours = normalizeOperatingHours(value);
  const hardDeadline = new Date(openedAt.getTime() + maximumHours * 60 * 60 * 1000);
  const openedDay = new Date(openedAt);
  openedDay.setHours(0, 0, 0, 0);
  const previousCandidates: Date[] = [];
  const currentDayCandidates: Date[] = [];

  const appendDeadlines = (dayDate: Date, target: Date[], onlyOvernight = false) => {
    const day = operatingHours[dayKeyFor(dayDate)];
    if (!day?.enabled) return;
    for (const shift of day.shifts) {
      const openMinutes = toMinutes(shift.open);
      const closeMinutes = toMinutes(shift.close);
      const overnight = closeMinutes <= openMinutes;
      if (onlyOvernight && !overnight) continue;
      const openAt = new Date(dayDate);
      openAt.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
      const closeAt = new Date(dayDate);
      closeAt.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0);
      if (overnight) closeAt.setDate(closeAt.getDate() + 1);
      closeAt.setMinutes(closeAt.getMinutes() + graceMinutes);
      if (closeAt > openedAt && (!onlyOvernight || openedAt >= openAt)) target.push(closeAt);
    }
  };

  const previousDay = new Date(openedDay);
  previousDay.setDate(previousDay.getDate() - 1);
  appendDeadlines(previousDay, previousCandidates, true);
  appendDeadlines(openedDay, currentDayCandidates);

  const candidates = previousCandidates.length > 0 ? previousCandidates : currentDayCandidates;
  const scheduledDeadline = candidates.sort((a, b) => b.getTime() - a.getTime())[0];
  return scheduledDeadline && scheduledDeadline < hardDeadline ? scheduledDeadline : hardDeadline;
};

export const isCashSessionExpired = (value: any, openedAt: Date, now = new Date()) =>
  now >= getCashSessionDeadline(value, openedAt);
