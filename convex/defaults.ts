// Default board, cards and rules for Dimsam Monopoly.
// Everything here is a *seed*: it is copied into the database on first run and
// can then be edited, added to or deleted from the in-app settings screen.
// Numbers come from resource/card/city.csv (the physical game), re-themed
// around Dimsam the Pomeranian.

export type TileType =
  | "start"
  | "city"
  | "treasure"
  | "special_card"
  | "tax"
  | "special_item"
  | "station"
  | "jail"
  | "world_tour"
  | "go_to_jail";

export type GroupKey =
  | "purple"
  | "blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "deepblue";

export type TileSeed = {
  index: number;
  name: string;
  type: TileType;
  group?: GroupKey;
  /** land price (ที่ดิน) */
  price?: number;
  /** price of one house; landmark costs the same × rules.landmarkCostMultiplier */
  housePrice?: number;
  /** optional override for the sell-back value of the bare land; default = price × rules.landSellBackRatio */
  sellBack?: number;
  /** rent: [bare, 1 house, 2, 3, 4, landmark] */
  rent?: number[];
  /** tax amount for tax tiles */
  amount?: number;
  /** short flavour text shown on the tile card */
  blurb?: string;
};

const city = (
  index: number,
  name: string,
  group: GroupKey,
  price: number,
  housePrice: number,
  rent: number[],
  blurb = "",
): TileSeed => ({ index, name, type: "city", group, price, housePrice, rent, blurb });

export const DEFAULT_TILES: TileSeed[] = [
  { index: 0, name: "บ้านติ่มซำ", type: "start", blurb: "ผ่านบ้านรับค่าขนม" },
  city(1, "อาณาจักรไดโนเสาร์", "purple", 800, 500, [40, 100, 300, 900, 1600, 2500], "ติ่มซำเห่าใส่ไดโนเสาร์"),
  { index: 2, name: "หีบขนม", type: "treasure", blurb: "จั่วการ์ดหีบขนม" },
  city(3, "ผจญภัยยุคหิน", "purple", 800, 500, [40, 500, 600, 1800, 3200, 4500], "กระดูกยุคหินชิ้นโต"),
  { index: 4, name: "ค่าอาบน้ำตัดขน", type: "tax", amount: 1000, blurb: "จ่ายค่าอาบน้ำตัดขน 1,000" },
  { index: 5, name: "ลูกบอลยาง", type: "special_item", price: 2000, blurb: "ของเล่นชิ้นโปรด" },
  city(6, "คาวบอย", "blue", 1000, 500, [60, 300, 900, 2700, 4000, 5500], "ติ่มซำขี่ม้า"),
  { index: 7, name: "ถุงของเล่น", type: "special_card", blurb: "จั่วการ์ดถุงของเล่น" },
  city(8, "ทุ่งดอกทานตะวัน", "blue", 1000, 500, [60, 300, 900, 2700, 4000, 5500], "วิ่งเล่นกลางทุ่ง"),
  city(9, "อาหรับราตรี", "blue", 1200, 500, [80, 400, 1000, 3000, 4500, 6000], "พรมวิเศษของติ่มซำ"),
  { index: 10, name: "อ่างอาบน้ำ", type: "jail", blurb: "โดนจับอาบน้ำ! ทอยให้ได้เบิ้ล หรือจ่ายค่าไถ่" },
  city(11, "ขั้วโลกเหนือ", "pink", 1400, 1000, [100, 500, 1500, 4500, 6250, 7500], "ขนฟูสู้หิมะ"),
  { index: 12, name: "ร้านตัดขน", type: "station", price: 1500, blurb: "ค่าเช่า = แต้มลูกเต๋า × 50 (มี 2 ร้าน × 100)" },
  city(13, "เมืองเวทมนตร์", "pink", 1400, 1000, [100, 500, 1500, 4500, 6250, 7500], "ติ่มซำจอมเวท"),
  city(14, "ทะเลทราย", "pink", 1600, 1000, [120, 600, 1800, 5000, 7000, 9000], "ขุดทรายหากระดูก"),
  { index: 15, name: "กระดูกเคี้ยว", type: "special_item", price: 2000, blurb: "ของเล่นชิ้นโปรด" },
  city(16, "อาณาจักรแมลง", "orange", 1800, 1000, [140, 700, 2000, 5500, 7500, 9500], "ไล่ผีเสื้อทั้งวัน"),
  { index: 17, name: "หีบขนม", type: "treasure", blurb: "จั่วการ์ดหีบขนม" },
  city(18, "ผจญภัยโจรสลัด", "orange", 1800, 1000, [140, 700, 2000, 5500, 7500, 9500], "กัปตันติ่มซำ"),
  city(19, "วิหารอาเธน่า", "orange", 2000, 1000, [160, 800, 2200, 6000, 8000, 10000], "เทพเจ้าแห่งขนม"),
  { index: 20, name: "ไปเดินเล่น", type: "world_tour", blurb: "เลือกไปที่ดินของตัวเองที่ไหนก็ได้" },
  city(21, "เกาะกลางทะเล", "red", 2200, 1500, [180, 900, 2500, 7000, 8750, 10500], "นอนอาบแดดบนเกาะ"),
  { index: 22, name: "ถุงของเล่น", type: "special_card", blurb: "จั่วการ์ดถุงของเล่น" },
  city(23, "ตะลุยแดนวิหค", "red", 2200, 1500, [180, 900, 2500, 7000, 8750, 10500], "เห่าไล่นก"),
  city(24, "มหาสมุทร", "red", 2400, 1500, [200, 1000, 3000, 7500, 9250, 11000], "ติ่มซำว่ายน้ำ"),
  { index: 25, name: "ชามข้าว", type: "special_item", price: 2000, blurb: "ของเล่นชิ้นโปรด" },
  city(26, "บ้านขนม", "yellow", 2600, 1500, [220, 1100, 3300, 8000, 9750, 11500], "บ้านที่กินได้ทั้งหลัง"),
  city(27, "เมืองของเล่น", "yellow", 2600, 1500, [220, 1100, 3300, 8000, 9750, 11500], "ของเล่นเต็มเมือง"),
  { index: 28, name: "คลินิกหมอหมา", type: "station", price: 1500, blurb: "ค่าเช่า = แต้มลูกเต๋า × 50 (มี 2 ร้าน × 100)" },
  city(29, "เมืองใต้ดิน", "yellow", 2800, 1500, [240, 1200, 3600, 8500, 10250, 12000], "ขุดโพรงลับ"),
  { index: 30, name: "โดนจับไปอาบน้ำ", type: "go_to_jail", blurb: "ตกช่องนี้ ไปอ่างอาบน้ำทันที" },
  city(31, "เมืองยักษ์", "green", 3000, 2000, [260, 1300, 3900, 9000, 11000, 12750], "ติ่มซำตัวจิ๋วในเมืองยักษ์"),
  city(32, "อาณาจักรนางเงือก", "green", 3200, 2000, [260, 1300, 3900, 9000, 11000, 12750], "ติ่มซำหางปลา"),
  { index: 33, name: "หีบขนม", type: "treasure", blurb: "จั่วการ์ดหีบขนม" },
  city(34, "ดาวหุ่นยนต์", "green", 3500, 2000, [280, 1500, 4500, 10000, 12000, 14000], "หุ่นยนต์เพื่อนรัก"),
  { index: 35, name: "เตียงนุ่มฟู", type: "special_item", price: 2000, blurb: "ของเล่นชิ้นโปรด" },
  { index: 36, name: "ถุงของเล่น", type: "special_card", blurb: "จั่วการ์ดถุงของเล่น" },
  city(37, "อวกาศ", "deepblue", 3500, 2000, [350, 1750, 5000, 11000, 13000, 15000], "ติ่มซำนักบินอวกาศ"),
  { index: 38, name: "ค่าหาหมอ", type: "tax", amount: 1000, blurb: "จ่ายค่าหาหมอ 1,000" },
  city(39, "โลกอนาคต", "deepblue", 4000, 2000, [500, 2000, 6000, 14000, 17000, 20000], "ติ่มซำปี 3000"),
];

export const GROUP_LABELS: Record<GroupKey, string> = {
  purple: "ม่วง",
  blue: "ฟ้า",
  pink: "ชมพู",
  orange: "ส้ม",
  red: "แดง",
  yellow: "เหลือง",
  green: "เขียว",
  deepblue: "น้ำเงิน",
};

/** Card effects. `kind` picks the behaviour; the other fields are its parameters. */
export type CardEffect = {
  kind:
    | "money" // amount: + gain / − pay
    | "collect_each" // amount from every other player
    | "skip" // turns to rest, optional amount to pay (negative)
    | "move_to" // tileIndex, passStart (collect bonus when passing), rentMultiplier
    | "move_by" // steps (negative = backwards)
    | "roll_again" // take another roll right away
    | "roll_even_odd" // roll: even = rest 1 turn, odd = go to start (+bonus)
    | "roll_threshold" // roll: sum >= threshold → +amount, else −amount
    | "nearest" // target: special_item | station | own ; move there (pass start bonus)
    | "go_to_jail";
  amount?: number;
  turns?: number;
  tileIndex?: number;
  steps?: number;
  passStart?: boolean;
  rentMultiplier?: number;
  threshold?: number;
  target?: "special_item" | "station" | "own";
};

export type CardSeed = { deck: "treasure" | "special"; text: string; effect: CardEffect };

export const DEFAULT_CARDS: CardSeed[] = [
  // ── หีบขนม (treasure) ──────────────────────────────────────────────
  { deck: "treasure", text: "วิ่งกลับบ้านติ่มซำ รับค่าขนม 2,000 บาท", effect: { kind: "move_to", tileIndex: 0, passStart: true } },
  { deck: "treasure", text: "จับผู้ร้ายได้ตามใบประกาศจับ รับเงินรางวัล 2,500 บาท", effect: { kind: "money", amount: 2500 } },
  { deck: "treasure", text: "เจอกระเป๋าเงินตก เอาไปคืนที่สถานีตำรวจ ได้เงินตอบแทน 1,200 บาท", effect: { kind: "money", amount: 1200 } },
  { deck: "treasure", text: "ซื้อของเล่นชิ้นใหม่ เสียเงิน 2,000 บาท", effect: { kind: "money", amount: -2000 } },
  { deck: "treasure", text: "แวะซื้อขนม เสียเงิน 1,500 บาท และพักกินขนม 1 ตา", effect: { kind: "skip", turns: 1, amount: -1500 } },
  { deck: "treasure", text: "ได้เงินค่าพาเที่ยว จากผู้เล่นคนอื่นคนละ 500 บาท", effect: { kind: "collect_each", amount: 500 } },
  { deck: "treasure", text: "ชนะประกวดปั้นตุ๊กตาหิมะที่ขั้วโลกเหนือ รับเงินรางวัล 500 บาท", effect: { kind: "money", amount: 500 } },
  { deck: "treasure", text: "ขุดเจอหีบขนมกลางทะเลทราย รับเงิน 1,000 บาท", effect: { kind: "money", amount: 1000 } },
  { deck: "treasure", text: "เห่าไล่ยักษ์สำเร็จ รับเงินรางวัล 3,000 บาท", effect: { kind: "money", amount: 3000 } },
  { deck: "treasure", text: "ยักษ์จากตะเกียงวิเศษให้เงิน 5,000 บาท", effect: { kind: "money", amount: 5000 } },
  { deck: "treasure", text: "เจอสมบัติใต้มหาสมุทร รับเงิน 500 บาท", effect: { kind: "money", amount: 500 } },
  { deck: "treasure", text: "แวะซื้อขนม เสียเงิน 500 บาท และพักกินขนม 1 ตา", effect: { kind: "skip", turns: 1, amount: -500 } },
  { deck: "treasure", text: "ค้นพบหีบสมบัติจากการผจญภัยโจรสลัด รับเงินรางวัล 2,000 บาท", effect: { kind: "money", amount: 2000 } },
  { deck: "treasure", text: "ถูกโจรสลัดปล้นระหว่างเดินทาง เสียเงิน 1,000 บาท", effect: { kind: "money", amount: -1000 } },
  { deck: "treasure", text: "วิ่งหนีไดโนเสาร์จนเงินหล่นหาย เสียเงิน 800 บาท", effect: { kind: "money", amount: -800 } },
  { deck: "treasure", text: "จ่ายค่าเข้าชมเมืองของเล่น เสียเงิน 1,000 บาท", effect: { kind: "money", amount: -1000 } },
  // ── ถุงของเล่น (special) ───────────────────────────────────────────
  { deck: "special", text: "ของเล่นชิ้นโปรดพัง ส่งซ่อม เสียเงิน 2,000 บาท", effect: { kind: "money", amount: -2000 } },
  { deck: "special", text: "กระดูกเคี้ยวหัก ซื้อใหม่ เสียเงิน 500 บาท", effect: { kind: "money", amount: -500 } },
  { deck: "special", text: "วิ่งตามแมวไปถึงโลกอนาคต ถ้าไม่มีเจ้าของซื้อได้ ถ้ามีเจ้าของจ่ายค่าเช่า 2 เท่า ผ่านบ้านรับ 2,000 บาท", effect: { kind: "move_to", tileIndex: 39, passStart: true, rentMultiplier: 2 } },
  { deck: "special", text: "ชามข้าวแตก ซื้อใหม่ เสียเงิน 3,500 บาท", effect: { kind: "money", amount: -3500 } },
  { deck: "special", text: "เตียงนุ่มฟูขาด ส่งซ่อม เสียเงิน 1,500 บาท", effect: { kind: "money", amount: -1500 } },
  { deck: "special", text: "เดินทางกลับบ้าน พักกินขนม 1 ตา", effect: { kind: "skip", turns: 1 } },
  { deck: "special", text: "โดนแมวกวักเรียก ถอยหลังกลับไป 3 ช่อง", effect: { kind: "move_by", steps: -3 } },
  { deck: "special", text: "ทอยลูกเต๋าเพื่อเดินทางอีก 1 ครั้ง", effect: { kind: "roll_again" } },
  { deck: "special", text: "ทอยลูกเต๋า ถ้าแต้มรวมเป็นเลขคู่ หยุดเดิน 1 ตา (กลับบ้าน) ถ้าเลขคี่ เดินหน้าไปบ้านติ่มซำ รับ 2,000 บาท", effect: { kind: "roll_even_odd" } },
  { deck: "special", text: "วิ่งไปช่องของเล่นที่ใกล้ที่สุด ถ้าไม่มีเจ้าของซื้อได้ ผ่านบ้านรับ 2,000 บาท", effect: { kind: "nearest", target: "special_item", passStart: true } },
  { deck: "special", text: "วิ่งไปร้านที่ใกล้ที่สุด ถ้าไม่มีเจ้าของซื้อได้ ผ่านบ้านรับ 2,000 บาท", effect: { kind: "nearest", target: "station", passStart: true } },
  { deck: "special", text: "ทอยลูกเต๋า ถ้าแต้มรวม 6 ขึ้นไป รับเงิน 2,000 บาท ถ้าน้อยกว่า 6 เสียเงิน 2,000 บาท", effect: { kind: "roll_threshold", threshold: 6, amount: 2000 } },
  { deck: "special", text: "วิ่งซอยเท้าไปข้างหน้า 3 ช่อง", effect: { kind: "move_by", steps: 3 } },
  { deck: "special", text: "วิ่งไปที่ดินของตัวเองที่ใกล้ที่สุด และซื้อสิ่งก่อสร้างเพิ่มได้", effect: { kind: "nearest", target: "own", passStart: true } },
  { deck: "special", text: "ขุดดินไปโผล่ที่เมืองใต้ดิน ถ้าไม่มีเจ้าของซื้อได้ ผ่านบ้านรับ 2,000 บาท", effect: { kind: "move_to", tileIndex: 29, passStart: true } },
  { deck: "special", text: "เจอขนมซ่อนอยู่ใต้เตียงนุ่มฟู รับเงิน 1,000 บาท", effect: { kind: "money", amount: 1000 } },
];

export type Rules = {
  startingMoney: number;
  passStartBonus: number;
  jailFine: number;
  /** turns a player waits in jail before walking out for free */
  jailMaxTurns: number;
  /** doubles allowed in one turn; one more than this sends you to jail */
  maxDoubles: number;
  /** rent multiplier per number of special items owned (index 0 = 1 item) */
  specialItemRent: number[];
  /** dice multiplier per number of stations owned (index 0 = 1 station) */
  stationRent: number[];
  requireMonopolyToBuild: boolean;
  monopolyDoublesBareRent: boolean;
  /** must build evenly across a colour group */
  evenBuild: boolean;
  maxHouses: number;
  landmarkCostMultiplier: number;
  houseSellBackRatio: number;
  /** selling bare land back to the bank pays this fraction of its buy price */
  landSellBackRatio: number;
  /** when passing start during a card move, pay the bonus */
  cardMovesCollectStart: boolean;
};

export const DEFAULT_RULES: Rules = {
  startingMoney: 30000,
  passStartBonus: 2000,
  jailFine: 500,
  jailMaxTurns: 1,
  maxDoubles: 2,
  specialItemRent: [250, 500, 1000, 2000],
  stationRent: [50, 100],
  requireMonopolyToBuild: true,
  monopolyDoublesBareRent: true,
  evenBuild: false,
  maxHouses: 4,
  landmarkCostMultiplier: 1,
  houseSellBackRatio: 0.5,
  landSellBackRatio: 0.5,
  cardMovesCollectStart: true,
};

export const RULE_LABELS: Record<keyof Rules, string> = {
  startingMoney: "เงินเริ่มต้น",
  passStartBonus: "ค่าขนมเมื่อผ่านบ้าน",
  jailFine: "ค่าไถ่ออกจากอ่างอาบน้ำ",
  jailMaxTurns: "จำนวนตาที่รอในอ่างอาบน้ำก่อนออกฟรี",
  maxDoubles: "จำนวนเบิ้ลสูงสุดต่อตา (เกินนี้โดนจับอาบน้ำ)",
  specialItemRent: "ค่าเช่าของเล่น (มี 1, 2, 3, 4 ชิ้น)",
  stationRent: "ตัวคูณแต้มลูกเต๋าของร้าน (มี 1, 2 ร้าน)",
  requireMonopolyToBuild: "ต้องมีครบสีถึงจะสร้างบ้านได้",
  monopolyDoublesBareRent: "ครบสีแล้วค่าเช่าที่ดินเปล่า ×2",
  evenBuild: "ต้องสร้างบ้านให้เท่ากันทั้งสี",
  maxHouses: "บ้านสูงสุดต่อที่ดิน (ก่อนเป็นแลนด์มาร์ก)",
  landmarkCostMultiplier: "ราคาแลนด์มาร์ก (เท่าของราคาบ้าน)",
  houseSellBackRatio: "ขายบ้านคืนได้กี่เท่าของราคาบ้าน (0.5 = 50%)",
  landSellBackRatio: "ขายที่ดินคืนได้กี่เท่าของราคาซื้อ (0.5 = 50%)",
  cardMovesCollectStart: "เดินด้วยการ์ดแล้วผ่านบ้านได้ค่าขนม",
};
