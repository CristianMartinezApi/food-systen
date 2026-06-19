export const shopSuccessToastStyle = {
  borderRadius: "20px",
  background: "#be123c",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  padding: "16px 22px",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "0 14px 36px rgba(159,18,57,0.45)",
} as const;

export const shopSuccessToastOptions = {
  style: shopSuccessToastStyle,
};

export const shopErrorToastStyle = {
  borderRadius: "20px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.06em",
  padding: "16px 22px",
  border: "1px solid rgba(244,63,94,0.45)",
  boxShadow: "0 14px 36px rgba(17,24,39,0.45)",
} as const;

export const shopErrorToastOptions = {
  style: shopErrorToastStyle,
};
