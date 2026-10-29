export const baht = (n: number) => `${n.toLocaleString("en-US")} ฿`;
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const GROUP_COLORS: Record<string, string> = {
  purple: "#a26be0",
  blue: "#4fa7e8",
  pink: "#f06aa8",
  orange: "#f08a2b",
  red: "#e2443c",
  yellow: "#f5c518",
  green: "#5cb85c",
  deepblue: "#2d5bd1",
};

export const TYPE_LABEL: Record<string, string> = {
  start: "จุดเริ่มต้น",
  city: "เมือง",
  treasure: "หีบขนม",
  special_card: "ถุงของเล่น",
  tax: "ค่าใช้จ่าย",
  special_item: "ของเล่น",
  station: "ร้าน",
  jail: "อ่างอาบน้ำ",
  world_tour: "ไปเดินเล่น",
  go_to_jail: "โดนจับไปอาบน้ำ",
};

/** Board geometry: 11×11 grid, START bottom-right, counter-clockwise. */
export function gridPos(i: number): { row: number; col: number; side: "bottom" | "left" | "top" | "right"; corner: boolean } {
  if (i === 0) return { row: 11, col: 11, side: "bottom", corner: true };
  if (i < 10) return { row: 11, col: 11 - i, side: "bottom", corner: false };
  if (i === 10) return { row: 11, col: 1, side: "left", corner: true };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: "left", corner: false };
  if (i === 20) return { row: 1, col: 1, side: "top", corner: true };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: "top", corner: false };
  if (i === 30) return { row: 1, col: 11, side: "right", corner: true };
  return { row: 1 + (i - 30), col: 11, side: "right", corner: false };
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "data" in e && typeof (e as { data: unknown }).data === "string") {
    return (e as { data: string }).data;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
