export type IconName = "grid" | "users" | "invoice" | "folder" | "sparkles" | "settings" | "bell" | "arrow" | "chevron" | "wallet" | "clock" | "alert" | "check" | "mic" | "speaker" | "close" | "menu" | "search" | "refresh";
const paths: Record<IconName, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  invoice: "M6 3h12v18l-3-2-3 2-3-2-3 2V3z M9 7h6 M9 11h6 M9 15h3",
  folder: "M3 7V4h6l2 3h10v13H3V7z",
  sparkles: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z M20 2v4 M18 4h4",
  settings: "m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3H9z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  arrow: "M4 12h16 M14 6l6 6-6 6", chevron: "m9 5 7 7-7 7",
  wallet: "M3 6h17v15H3V6z M3 6V3h14v3 M15 11h6v5h-6v-5z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2",
  alert: "m12 3 10 18H2L12 3z M12 9v5 M12 17h.01",
  check: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 m-13 0 3 3 5-6",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  speaker: "M11 4 6 8H2v8h4l5 4V4z M15 8a6 6 0 0 1 0 8 M18 4a11 11 0 0 1 0 16",
  close: "m6 6 12 12 M6 18 18 6", menu: "M3 6h18 M3 12h18 M3 18h18",
  search: "M18 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 m-3 5 6 6",
  refresh: "M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 13-2l2 3 M4 16l2 3a8 8 0 0 0 13-2",
};
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 ${className}`}><path d={paths[name]} /></svg>;
}

