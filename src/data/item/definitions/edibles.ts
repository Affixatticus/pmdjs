import { Effect_RestoreBelly, Effect_RestoreHP } from "../effects";
import { ItemId } from "../ids";
import { Edible, BaseItem, Throwable } from "../items";

export const OranBerryItem: Throwable & Edible = {
    name: "Oran Berry",
    description: "A berry to be consumed by a Pokémon. It can be used once to restore 100 HP to a Pokémon.",
    price: 100,
    texCoords: [6, 0, 1, 1],
    imageUrl: "Item_image_SEED_OREN",
    eat: Effect_RestoreHP(100)
};
export const AppleItem: Throwable & Edible = {
    name: "Apple",
    description: "A delicious apple. It can be used once to restore 100 belly points to a Pokémon.",
    price: 100,
    texCoords: [0, 0, 1, 1],
    imageUrl: "Item_image_FOOD_NORMAL",
    eat: Effect_RestoreBelly(100)
};
export const BigAppleItem: Throwable & Edible = {
    name: "Big Apple",
    description: "A larger apple. It can be used once to restore 200 belly points to a Pokémon.",
    price: 200,
    texCoords: [0, 0, 1, 1],
    imageUrl: "Item_image_FOOD_LARGE",
    eat: Effect_RestoreBelly(200)
};

const FoodItems: Partial<Record<ItemId, BaseItem>> = {
    [ItemId.ORAN_BERRY]: OranBerryItem,
    [ItemId.APPLE]: AppleItem,
    [ItemId.BIG_APPLE]: BigAppleItem,
};

export default FoodItems;