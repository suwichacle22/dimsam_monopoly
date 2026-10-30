import { useEffect, useState } from "react";
import { cx } from "~/lib/format";
import { getTheme, setTheme, type Theme } from "~/lib/theme";

/** Small pill button that flips between dark and light mode. */
/** `compact` shows only the icon on phones (label from sm up). */
export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => setThemeState(getTheme()), []);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className={cx("px-2 py-1 rounded-lg border border-cocoa/20", className)}
      aria-pressed={dark}
      title={dark ? "โหมดมืด" : "โหมดสว่าง"}
      onClick={() => {
        const next: Theme = dark ? "light" : "dark";
        setTheme(next);
        setThemeState(next);
      }}
    >
      {dark ? "🌙" : "☀️"}
      <span className={cx(compact && "hidden sm:inline")}>{dark ? " โหมดมืด" : " โหมดสว่าง"}</span>
    </button>
  );
}
