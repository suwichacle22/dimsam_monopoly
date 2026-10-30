import * as C from "~/art/tiles/setC";

export function CardToast({ card, onClose }: { card: { deck: string; text: string; seat: number } | null; onClose: () => void }) {
  if (!card) return null;
  const treasure = card.deck === "treasure";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-6" onClick={onClose}>
      <div
        className="card-flip w-full max-w-xs rounded-3xl border-4 overflow-hidden shadow-2xl"
        style={{ background: treasure ? "#5f8f6b" : "#8b6fd1", borderColor: treasure ? "#f2c66d" : "#ffd66b" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-white/90 overflow-hidden shrink-0">{treasure ? <C.TileTreasure animate /> : <C.TileToyBag animate />}</div>
          <div className="text-white font-bold text-xl">{treasure ? "หีบขนม" : "ถุงของเล่น"}</div>
        </div>
        <div className="m-4 mt-2 bg-paper/95 rounded-2xl p-4 text-cocoa-2 text-base leading-relaxed">{card.text}</div>
        <button className="w-full py-3 text-white/90 text-sm" onClick={onClose}>
          แตะเพื่อปิด
        </button>
      </div>
    </div>
  );
}
