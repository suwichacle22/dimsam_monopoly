import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { RULE_LABELS, type CardEffect, type Rules } from "../../convex/defaults";
import { TILE_ART, ART_BY_TYPE } from "~/art/tiles";
import { useSession } from "~/lib/session";
import { cx, errorMessage, GROUP_COLORS, TYPE_LABEL } from "~/lib/format";
import { ThemeToggle } from "~/components/ThemeToggle";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

type Tab = "rules" | "tiles" | "cards";

function SettingsPage() {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!session?.password) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p>ต้องเข้าห้องด้วยรหัสก่อนถึงจะตั้งค่าได้</p>
        <Link to="/" className="btn-primary">
          ไปหน้าเข้าห้อง
        </Link>
      </main>
    );
  }
  return <Settings password={session.password} />;
}

function Settings({ password }: { password: string }) {
  const data = useQuery(api.admin.all, { password });
  const seed = useMutation(api.admin.seed);
  const [tab, setTab] = useState<Tab>("rules");
  useEffect(() => {
    seed({ password }).catch(() => {});
  }, [password, seed]);
  if (!data) return <div className="p-8 text-center text-cocoa/60">กำลังโหลด…</div>;
  return (
    <main className="max-w-5xl mx-auto p-3 sm:p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-cocoa">ตั้งค่าเกม</h1>
        <div className="flex items-center gap-2 text-sm text-cocoa/70">
          <ThemeToggle className="text-xs" />
          <Link to="/" className="btn-secondary text-sm">
            กลับหน้าห้อง
          </Link>
        </div>
      </header>
      <p className="text-sm text-cocoa/70">ทุกอย่างในนี้แก้ได้เลย มีผลกับเกมถัดไป (และค่าเช่า/กติกาจะมีผลกับเกมที่กำลังเล่นทันที)</p>
      <nav className="flex gap-2">
        {(["rules", "tiles", "cards"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("btn-secondary text-sm", tab === t && "bg-cream-2 border-caramel")}>
            {t === "rules" ? "กติกา" : t === "tiles" ? "แผนที่ (40 ช่อง)" : "การ์ด"}
          </button>
        ))}
      </nav>
      {tab === "rules" && <RulesEditor password={password} rules={data.rules as Rules} />}
      {tab === "tiles" && <TilesEditor password={password} tiles={data.tiles as TileDoc[]} />}
      {tab === "cards" && <CardsEditor password={password} cards={data.cards as Doc<"cards">[]} />}
      <DangerZone password={password} />
    </main>
  );
}

// ── rules ────────────────────────────────────────────────────────────────

function RulesEditor({ password, rules }: { password: string; rules: Rules }) {
  const update = useMutation(api.admin.updateRules);
  const [draft, setDraft] = useState<Rules>(rules);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setDraft(rules), [rules]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules);

  return (
    <section className="card p-4 flex flex-col gap-3">
      {(Object.keys(RULE_LABELS) as (keyof Rules)[]).map((key) => {
        const v = draft[key];
        return (
          <label key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="flex-1 text-sm text-cocoa">{RULE_LABELS[key]}</span>
            {typeof v === "boolean" ? (
              <input type="checkbox" className="w-5 h-5 accent-caramel" checked={v} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
            ) : Array.isArray(v) ? (
              <input
                className="input w-full sm:w-64"
                value={v.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [key]: e.target.value
                      .split(",")
                      .map((x) => Number(x.trim()))
                      .filter((x) => !Number.isNaN(x)),
                  })
                }
              />
            ) : (
              <input type="number" step="any" className="input w-full sm:w-40" value={v} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
            )}
          </label>
        );
      })}
      <div className="flex items-center gap-3 pt-2">
        <button
          className="btn-primary"
          disabled={!dirty}
          onClick={async () => {
            try {
              await update({ password, rules: draft });
              setMsg("บันทึกแล้ว");
            } catch (e) {
              setMsg(errorMessage(e));
            }
          }}
        >
          บันทึกกติกา
        </button>
        {msg && <span className="text-sm text-cocoa/70">{msg}</span>}
      </div>
    </section>
  );
}

// ── tiles ────────────────────────────────────────────────────────────────

type TileDoc = {
  _id?: unknown;
  index: number;
  name: string;
  type: Doc<"tiles">["type"];
  group?: Doc<"tiles">["group"];
  price?: number;
  housePrice?: number;
  sellBack?: number;
  rent?: number[];
  amount?: number;
  blurb?: string;
};

function TilesEditor({ password, tiles }: { password: string; tiles: TileDoc[] }) {
  return (
    <section className="flex flex-col gap-2">
      {tiles.map((t) => (
        <TileRow key={t.index} password={password} tile={t} />
      ))}
    </section>
  );
}

function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function TileRow({ password, tile }: { password: string; tile: TileDoc }) {
  const update = useMutation(api.admin.updateTile);
  const [d, setD] = useState<TileDoc>(tile);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setD(tile), [tile]);
  const Art = TILE_ART[tile.index] ?? ART_BY_TYPE[tile.type];
  const dirty = JSON.stringify(d) !== JSON.stringify(tile);

  async function save() {
    const { _id, ...rest } = d;
    const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as typeof rest;
    try {
      await update({ password, tile: clean });
      setMsg("บันทึกแล้ว");
    } catch (e) {
      setMsg(errorMessage(e));
    }
  }

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-xs text-cocoa/50 tabular-nums">{tile.index}</span>
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-cocoa/20 shrink-0">{Art && <Art animate={false} />}</div>
        <div style={{ background: tile.group ? GROUP_COLORS[tile.group] : "#e0c9a6" }} className="w-2 h-8 rounded-full" />
        <input className="input flex-1 font-semibold" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <span className="text-xs text-cocoa/60 hidden sm:block w-20">{TYPE_LABEL[tile.type]}</span>
        <button className="btn-secondary text-xs" onClick={() => setOpen(!open)}>
          {open ? "ย่อ" : "แก้ไข"}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Field label="ราคาที่ดิน" value={d.price} onChange={(v) => setD({ ...d, price: v })} />
          <Field label="ราคาบ้าน" value={d.housePrice} onChange={(v) => setD({ ...d, housePrice: v })} />
          <Field label="ขายคืน (ว่าง = ใช้ % จากกติกา)" value={d.sellBack} onChange={(v) => setD({ ...d, sellBack: v })} />
          <Field label="ค่าใช้จ่าย (ช่องภาษี)" value={d.amount} onChange={(v) => setD({ ...d, amount: v })} />
          {tile.type === "city" && (
            <>
              {["ที่ดินเปล่า", "บ้าน 1", "บ้าน 2", "บ้าน 3", "บ้าน 4", "แลนด์มาร์ก"].map((label, i) => (
                <Field
                  key={label}
                  label={`ค่าเช่า ${label}`}
                  value={d.rent?.[i]}
                  onChange={(v) => {
                    const rent = [...(d.rent ?? [0, 0, 0, 0, 0, 0])];
                    rent[i] = v ?? 0;
                    setD({ ...d, rent });
                  }}
                />
              ))}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-cocoa/60">สี</span>
                <select className="input" value={d.group ?? ""} onChange={(e) => setD({ ...d, group: (e.target.value || undefined) as TileDoc["group"] })}>
                  {Object.keys(GROUP_COLORS).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 col-span-2 sm:col-span-4">
            <span className="text-xs text-cocoa/60">คำบรรยายสั้นๆ</span>
            <input className="input" value={d.blurb ?? ""} onChange={(e) => setD({ ...d, blurb: e.target.value })} />
          </label>
          <div className="col-span-2 sm:col-span-4 flex items-center gap-3">
            <button className="btn-primary text-sm" disabled={!dirty} onClick={save}>
              บันทึกช่องนี้
            </button>
            {msg && <span className="text-xs text-cocoa/70">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-cocoa/60">{label}</span>
      <input type="number" className="input" value={value ?? ""} onChange={(e) => onChange(num(e.target.value))} />
    </label>
  );
}

// ── cards ────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<CardEffect["kind"], string> = {
  money: "ได้/เสียเงิน (ติดลบ = เสีย)",
  collect_each: "เก็บเงินจากผู้เล่นคนอื่น",
  skip: "พัก X ตา (+ เสียเงินได้)",
  move_to: "ไปช่องที่กำหนด",
  move_by: "เดินไปข้างหน้า/ถอยหลัง X ช่อง",
  roll_again: "ทอยลูกเต๋าอีกครั้ง",
  roll_even_odd: "ทอย: คู่โดนจับไปอาบน้ำ / คี่ไปจุดเริ่มต้น",
  roll_threshold: "ทอย: ≥ เกณฑ์ได้เงิน ไม่ถึงเสียเงิน",
  nearest: "ไปช่องประเภทที่ใกล้ที่สุด",
  go_to_jail: "โดนจับไปอาบน้ำ (+ เสีย/ได้เงินระหว่างทางได้)",
};

type CardDraft = { deck: "treasure" | "special"; text: string; effect: CardEffect; enabled: boolean };

function CardsEditor({ password, cards }: { password: string; cards: Doc<"cards">[] }) {
  const [adding, setAdding] = useState<"treasure" | "special" | null>(null);
  return (
    <section className="flex flex-col gap-4">
      {(["treasure", "special"] as const).map((deck) => (
        <div key={deck} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-cocoa">{deck === "treasure" ? "หีบขนม" : "ถุงของเล่น"} ({cards.filter((c) => c.deck === deck).length} ใบ)</h2>
            <button className="btn-secondary text-sm" onClick={() => setAdding(deck)}>
              + เพิ่มการ์ด
            </button>
          </div>
          {adding === deck && (
            <CardRow password={password} draft={{ deck, text: "", effect: { kind: "money", amount: 500 }, enabled: true }} onDone={() => setAdding(null)} />
          )}
          {cards
            .filter((c) => c.deck === deck)
            .map((c) => (
              <CardRow key={c._id} password={password} id={c._id} draft={{ deck: c.deck, text: c.text, effect: c.effect, enabled: c.enabled }} />
            ))}
        </div>
      ))}
    </section>
  );
}

function CardRow({ password, id, draft, onDone }: { password: string; id?: Doc<"cards">["_id"]; draft: CardDraft; onDone?: () => void }) {
  const upsert = useMutation(api.admin.upsertCard);
  const remove = useMutation(api.admin.deleteCard);
  const [d, setD] = useState<CardDraft>(draft);
  const [open, setOpen] = useState(!id);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setD(draft), [draft.text, draft.enabled, JSON.stringify(draft.effect)]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(d) !== JSON.stringify(draft);
  const e = d.effect;
  const setE = (patch: Partial<CardEffect>) => setD({ ...d, effect: { ...e, ...patch } });

  return (
    <div className={cx("card p-3 flex flex-col gap-2", !d.enabled && "opacity-60")}>
      <div className="flex items-start gap-2">
        <input type="checkbox" className="mt-2 accent-caramel" checked={d.enabled} title="ใช้การ์ดนี้" onChange={(ev) => setD({ ...d, enabled: ev.target.checked })} />
        <textarea className="input flex-1 min-h-[44px]" rows={2} value={d.text} placeholder="ข้อความบนการ์ด" onChange={(ev) => setD({ ...d, text: ev.target.value })} />
        <button className="btn-secondary text-xs" onClick={() => setOpen(!open)}>
          {open ? "ย่อ" : "ผล"}
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-cocoa/60">ผลของการ์ด</span>
            <select className="input" value={e.kind} onChange={(ev) => setE({ kind: ev.target.value as CardEffect["kind"] })}>
              {(Object.keys(KIND_LABEL) as CardEffect["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {["money", "collect_each", "skip", "roll_threshold", "go_to_jail"].includes(e.kind) && (
            <Field label="จำนวนเงิน" value={e.amount} onChange={(v) => setE({ amount: v })} />
          )}
          {e.kind === "skip" && <Field label="พักกี่ตา" value={e.turns} onChange={(v) => setE({ turns: v })} />}
          {e.kind === "move_to" && <Field label="ไปช่องหมายเลข (0-39)" value={e.tileIndex} onChange={(v) => setE({ tileIndex: v })} />}
          {e.kind === "move_by" && <Field label="กี่ช่อง (ลบ = ถอยหลัง)" value={e.steps} onChange={(v) => setE({ steps: v })} />}
          {e.kind === "roll_threshold" && <Field label="เกณฑ์แต้ม" value={e.threshold} onChange={(v) => setE({ threshold: v })} />}
          {(e.kind === "move_to" || e.kind === "nearest") && (
            <Field label="ค่าเช่า × (ถ้ามีเจ้าของ)" value={e.rentMultiplier} onChange={(v) => setE({ rentMultiplier: v })} />
          )}
          {e.kind === "nearest" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-cocoa/60">ประเภทช่อง</span>
              <select className="input" value={e.target ?? "special_item"} onChange={(ev) => setE({ target: ev.target.value as CardEffect["target"] })}>
                <option value="special_item">ของเล่น</option>
                <option value="station">ร้าน</option>
                <option value="own">ที่ดินของตัวเอง</option>
              </select>
            </label>
          )}
          {["move_to", "nearest"].includes(e.kind) && (
            <label className="flex items-center gap-2 text-xs text-cocoa/70">
              <input type="checkbox" className="accent-caramel" checked={e.passStart ?? true} onChange={(ev) => setE({ passStart: ev.target.checked })} />
              ผ่านบ้านได้ค่าขนม
            </label>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          className="btn-primary text-sm"
          disabled={!dirty && !!id}
          onClick={async () => {
            try {
              await upsert({ password, id, ...d, text: d.text.trim() });
              setMsg("บันทึกแล้ว");
              onDone?.();
            } catch (err) {
              setMsg(errorMessage(err));
            }
          }}
        >
          {id ? "บันทึก" : "เพิ่ม"}
        </button>
        {id && (
          <button
            className="btn-danger text-sm"
            onClick={async () => {
              if (confirm("ลบการ์ดนี้?")) await remove({ password, id });
            }}
          >
            ลบ
          </button>
        )}
        {!id && (
          <button className="btn-secondary text-sm" onClick={onDone}>
            ยกเลิก
          </button>
        )}
        {msg && <span className="text-xs text-cocoa/70">{msg}</span>}
      </div>
    </div>
  );
}

function DangerZone({ password }: { password: string }) {
  const reset = useMutation(api.admin.resetDefaults);
  const wipe = useMutation(api.admin.wipeGames);
  return (
    <section className="card p-4 flex flex-col gap-2 border-berry/30">
      <h2 className="font-bold text-berry">โซนอันตราย</h2>
      <div className="flex flex-wrap gap-2">
        {(["rules", "tiles", "cards"] as const).map((w) => (
          <button
            key={w}
            className="btn-secondary text-sm"
            onClick={async () => {
              if (confirm(`คืนค่า${w === "rules" ? "กติกา" : w === "tiles" ? "แผนที่" : "การ์ด"}เป็นค่าเริ่มต้น? ของที่แก้ไว้จะหาย`)) await reset({ password, what: w });
            }}
          >
            คืนค่า{w === "rules" ? "กติกา" : w === "tiles" ? "แผนที่" : "การ์ด"}เริ่มต้น
          </button>
        ))}
        <button
          className="btn-danger text-sm"
          onClick={async () => {
            if (confirm("ลบเกมทั้งหมด ทุกคนต้องเข้าห้องใหม่?")) await wipe({ password });
          }}
        >
          ล้างเกมทั้งหมด
        </button>
      </div>
    </section>
  );
}
