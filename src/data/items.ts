export enum Items {
    EMPTY,
    COIN,
    ORAN_BERRY,
    APPLE,
    BIG_APPLE,
};

export const ITEM_WIDTH = 48;
export const SHEET_WIDTH = 10;
export const ITEM_SHEET_WIDTH = ITEM_WIDTH * SHEET_WIDTH;

type SheetTile = [x: number, y: number, w: number, h: number];

export const ItemSheet: Record<Items, SheetTile> = {
    [Items.EMPTY]: [0, 0, 1, 1],
    [Items.COIN]: [7, 3, 1, 1],
    [Items.ORAN_BERRY]: [6, 0, 1, 1],
    [Items.APPLE]: [0, 0, 1, 1],
    [Items.BIG_APPLE]: [0, 0, 1, 1],
};

export function getItemCrop(item: Items): SheetTile {
    return ItemSheet[item].map(e => e * ITEM_WIDTH) as SheetTile;
}

export interface ItemChance {
    /** The item id */
    id: Items;
    /** A number between 0 and 100 */
    chance: number;
}