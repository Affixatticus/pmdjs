import { DungeonPokemon } from "../../dungeons/objects/pokemon";
import FoodItems from "./definitions/edibles";
import { StackItems } from "./definitions/stackables";
import { ItemId } from "./ids";

export interface BaseItem {
    readonly name: string;
    readonly description: string;
    readonly price: number;
    readonly texCoords: [x: number, y: number, w: number, h: number];
    readonly imageUrl: string;
};

export interface Edible extends BaseItem {
    eat(pokemon: DungeonPokemon): void;
};
export interface Throwable extends BaseItem {
    throw(): void;
};
export interface Stackable extends BaseItem {
    readonly maxStackSize: number;
};

export type Item = Partial<BaseItem & Stackable & Edible & Throwable>;

export const ItemList: Partial<Record<ItemId, Item>> = {
    ...FoodItems,
    ...StackItems,
};

export const ITEM_SIZE = 48;
export const SHEET_WIDTH = 10;
export const ITEM_SHEET_WIDTH = ITEM_SIZE * SHEET_WIDTH;

type SheetTile = [x: number, y: number, w: number, h: number];

export function getItemCrop(item: ItemId): SheetTile {
    return ItemList[item]!.texCoords!.map(e => e * ITEM_SIZE) as SheetTile;
}

export interface ItemChance {
    /** The item id */
    id: ItemId;
    /** A number between 0 and 100 */
    chance: number;
}