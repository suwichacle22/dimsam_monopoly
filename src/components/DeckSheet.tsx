import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import * as C from "~/art/tiles/setC";
import { cx } from "~/lib/format";

type Deck = "treasure" | "special";

/** Both card piles: last drawn, drawn so far this cycle, and what is still in the pile. */
export function DeckSheet({ token, initial, onClose }: { token: string; initial: Deck; onClose: () => void }) {
  const [deck, setDeck] = useState<Deck>(initial);
  const data = useQuery(api.game.decks, { token });
  const d = data?.[deck];
  const total = d ? d.drawn.length + d.remaining.length : 0;
  const last = d?.drawn[d.drawn.length - 1];
  const treasure = deck === "treasure";
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-cocoa-2/40" onClick={onClose}>
      <div className="card w-full sm:max-w-md max-h-[88dvh] flex flex-col rounded-b-none sm:rounded-b-3xl pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 p-3 pb-0">
          {(["treasure", "special"] as Deck[]).map((k) => (
            <button
              key={k}
              onClick={() => setDeck(k)}
              className={cx("flex-1 flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left", deck === k ? "border-caramel bg-cream-2" : "border-cocoa/15")}
            >
              <span className="w-9 h-9 rounded-lg overflow-hidden shrink-0">{k === "treasure" ? <C.TileTreasure animate={false} /> : <C.TileToyBag animate={false} />}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-cocoa leading-tight">{k === "treasure" ? "หีบขนม" : "ถุงของเล่น"}</span>
                <span className="block text-[11px] text-cocoa/60">
                  {data ? `เหลือ ${data[k].remaining.length} / ${data[k].drawn.length + data[k].remaining.length} ใบ` : "…"}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
          {!d ? (
            <p className="text-cocoa/60 text-sm">กำลังโหลด…</p>
          ) : (
            <>
              <section className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: treasure ? "#f2c66d" : "#ffd66b", background: treasure ? "#5f8f6b" : "#8b6fd1" }}>
                <div className="px-3 pt-2 text-white/90 text-xs font-semibold">ใบล่าสุดที่จั่ว</div>
                <div className="m-2 mt-1 bg-white/95 rounded-xl p-3 text-cocoa-2 text-sm leading-relaxed min-h-[52px]">
                  {last ? last.text : <span className="text-cocoa/50">ยังไม่มีใครจั่วกองนี้ในรอบนี้</span>}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-cocoa mb-1">
                  จั่วไปแล้วรอบนี้ <span className="text-cocoa/50 font-normal">({d.drawn.length})</span>
                </h3>
                {d.drawn.length === 0 ? (
                  <p className="text-xs text-cocoa/50">ยังไม่มี</p>
                ) : (
                  <ol className="flex flex-col gap-1">
                    {[...d.drawn].reverse().map((c, i) => (
                      <li key={`${c.id}-${i}`} className={cx("text-sm rounded-xl px-3 py-[6px] border", i === 0 ? "border-caramel bg-cream-2 text-cocoa" : "border-cocoa/10 text-cocoa/70 line-through decoration-cocoa/30")}>
                        <span className="text-[10px] text-cocoa/40 tabular-nums mr-2">#{d.drawn.length - i}</span>
                        {c.text}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-cocoa mb-1">
                  ยังอยู่ในกอง <span className="text-cocoa/50 font-normal">({d.remaining.length} · เรียงตามตัวอักษร ไม่ใช่ลำดับจริง)</span>
                </h3>
                <ul className="flex flex-col gap-1">
                  {d.remaining.map((c) => (
                    <li key={c.id} className="text-sm rounded-xl px-3 py-[6px] border border-cocoa/10 text-cocoa-2/90 bg-white">
                      {c.text}
                    </li>
                  ))}
                </ul>
                {d.remaining.length === 0 && total > 0 && <p className="text-xs text-cocoa/60 mt-1">กองหมดแล้ว ครั้งต่อไปที่จั่วจะสับการ์ดใหม่ทั้งหมด</p>}
              </section>
            </>
          )}
        </div>
        <button className="w-full py-3 text-sm text-cocoa/60 border-t border-cocoa/10" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}
