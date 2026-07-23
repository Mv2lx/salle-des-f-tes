import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const IconDashboard = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IconUsers = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M17.5 20a5 5 0 0 0-3-4.6" /></svg>
);
export const IconHall = (p: P) => (
  <svg {...base} {...p}><path d="M3 21V9l9-6 9 6v12" /><path d="M3 21h18" /><rect x="9" y="13" width="6" height="8" /><path d="M7 9h.01M17 9h.01" /></svg>
);
export const IconCalendarPlus = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4M12 12v6M9 15h6" /></svg>
);
export const IconTag = (p: P) => (
  <svg {...base} {...p}><path d="M20.5 13.3 12 21.8 2.2 12V3h9l9.3 9.3a1 1 0 0 1 0 1z" /><circle cx="7" cy="7" r="1.4" /></svg>
);
export const IconPackage = (p: P) => (
  <svg {...base} {...p}><path d="M21 8 12 3 3 8l9 5 9-5z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></svg>
);
export const IconInvoice = (p: P) => (
  <svg {...base} {...p}><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M14 2v5h5M8 12h8M8 16h6M8 8h3" /></svg>
);
export const IconCash = (p: P) => (
  <svg {...base} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
);
export const IconExpense = (p: P) => (
  <svg {...base} {...p}><path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 7l2.5-4h13L21 7" /><path d="M12 12v5M9.5 14.5 12 12l2.5 2.5" /></svg>
);
export const IconReport = (p: P) => (
  <svg {...base} {...p}><path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17" /><path d="M4 21h18M8 17v-5M12 17V8M16 17v-8" /></svg>
);
export const IconSearch = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = (p: P) => (
  <svg {...base} {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
);
export const IconEdit = (p: P) => (
  <svg {...base} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const IconPrint = (p: P) => (
  <svg {...base} {...p}><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M6 17h12v4H6z" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconAlert = (p: P) => (
  <svg {...base} {...p}><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconTrend = (p: P) => (
  <svg {...base} {...p}><path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" /></svg>
);
export const IconDownload = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></svg>
);
export const IconFilter = (p: P) => (
  <svg {...base} {...p}><path d="M4 5h16M7 12h10M10 19h4" /></svg>
);
export const IconHistory = (p: P) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 3" /></svg>
);
export const IconSun = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></svg>
);
export const IconLog = (p: P) => (
  <svg {...base} {...p}><path d="M8 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8" /><path d="M8 3 4 6v13l4 3" /><path d="M12 8h5M12 12h5M12 16h5" /></svg>
);
export const IconSettings = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
export const IconEye = (p: P) => (
  <svg {...base} {...p}><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconEyeOff = (p: P) => (
  <svg {...base} {...p}><path d="M3 3l18 18" /><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 4.1M6.6 6.6C3.8 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.7 10.7 0 0 0 5.4-1.4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);
export const IconUpload = (p: P) => (
  <svg {...base} {...p}><path d="M12 16V4" /><path d="m6.5 9.5 5.5-5.5 5.5 5.5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const IconKey = (p: P) => (
  <svg {...base} {...p}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.9 12.1 8.6-8.6" /><path d="M15 8l2 2M18 5l2 2" /></svg>
);
export const IconMoon = (p: P) => (
  <svg {...base} {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
);
export const IconSunMoon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v2M4.2 5.2l1.4 1.4M3 12h2M4.2 18.8l1.4-1.4" /><circle cx="8.5" cy="12" r="4" /><path d="M20 15.5A5.5 5.5 0 0 1 14.5 10a5.5 5.5 0 1 0 5.5 5.5z" /></svg>
);
export const IconLock = (p: P) => (
  <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /><path d="M12 14.5v3" /></svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.5 2.7 3.8 6 3.8 9.5s-1.3 6.8-3.8 9.5c-2.5-2.7-3.8-6-3.8-9.5s1.3-6.8 3.8-9.5z" /></svg>
);
