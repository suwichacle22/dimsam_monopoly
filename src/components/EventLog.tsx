import { useEffect, useRef } from "react";
import type { GameView } from "~/lib/game";
import { cx } from "~/lib/format";

const ICON: Record<string, string> = {
  roll: "🎲",
  again: "🔁",
  offer: "🤝",
  land: "🐾",
  buy: "🏷️",
  money: "💰",
  card: "🃏",
  jail: "🛁",
  skip: "💤",
  build: "🏠",
  sell: "💸",
  broke: "⚠️",
  rent_due: "🏠",
  tab: "📝",
  offset: "🔁",
  repay: "💵",
  shuffle: "🔀",
  finish: "🏆",
  start: "🎉",
  move: "🐾",
};

export function EventLog({ view, resultHidden, className }: { view: GameView; resultHidden?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = view.events.filter((e) => e.kind !== "card_money" && e.kind !== "rent" && e.kind !== "pass_start" && e.kind !== "tax" && e.kind !== "sale" && e.kind !== "txn" && !(resultHidden && e.at === view.game.actionAt));
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [shown.length]);
  return (
    <div ref={ref} className={cx("card p-3 overflow-y-auto text-sm flex flex-col gap-1", className)}>
      {shown.map((e) => (
        <div key={e.id} className={cx("flex gap-2 leading-snug", e.kind === "finish" && "font-semibold text-berry", e.kind === "broke" && "text-berry")}>
          <span className="shrink-0 w-5 text-center">{ICON[e.kind] ?? "•"}</span>
          <span className="text-cocoa-2/90">{e.text}</span>
        </div>
      ))}
      {view.events.length === 0 && <p className="text-cocoa/50">ยังไม่มีเหตุการณ์</p>}
    </div>
  );
}
