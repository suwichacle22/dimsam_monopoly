import type { TileArt } from "../types";
import * as A from "./setA";
import * as B from "./setB";
import * as C from "./setC";

/** Tile index → artwork. Tiles without a dedicated scene share one by type. */
export const TILE_ART: Record<number, TileArt> = {
  0: A.Tile00,
  1: A.Tile01,
  2: C.TileTreasure,
  3: A.Tile03,
  4: C.TileTaxBath,
  5: B.Tile05,
  6: A.Tile06,
  7: C.TileToyBag,
  8: A.Tile08,
  9: A.Tile09,
  10: A.Tile10,
  11: A.Tile11,
  12: C.Tile12,
  13: A.Tile13,
  14: A.Tile14,
  15: B.Tile15,
  16: B.Tile16,
  17: C.TileTreasure,
  18: B.Tile18,
  19: B.Tile19,
  20: A.Tile20,
  21: B.Tile21,
  22: C.TileToyBag,
  23: B.Tile23,
  24: B.Tile24,
  25: B.Tile25,
  26: B.Tile26,
  27: B.Tile27,
  28: C.Tile28,
  29: B.Tile29,
  30: A.Tile30,
  31: C.Tile31,
  32: C.Tile32,
  33: C.TileTreasure,
  34: C.Tile34,
  35: B.Tile35,
  36: C.TileToyBag,
  37: C.Tile37,
  38: C.TileTaxVet,
  39: C.Tile39,
};

export const ART_BY_TYPE: Partial<Record<string, TileArt>> = {
  treasure: C.TileTreasure,
  special_card: C.TileToyBag,
  tax: C.TileTaxBath,
  start: A.Tile00,
  jail: A.Tile10,
  world_tour: A.Tile20,
  go_to_jail: A.Tile30,
};
