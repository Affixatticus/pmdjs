import { Effect_RestoreBelly, Effect_RestoreHP } from "../effects";
import { ItemId } from "../ids";
import { Edible, BaseItem, Throwable } from "../items";

export const OranBerryItem: Throwable & Edible = {
    name: "Oran Berry",
    description: "A berry to be consumed by a Pokémon. It can be used once to restore 100 HP to a Pokémon.",
    price: 100,
    texCoords: [0, 0, 1, 1],
    eat: Effect_RestoreHP(100)
};
export const AppleItem: Throwable & Edible = {
    name: "Apple",
    description: "A delicious apple. It can be used once to restore 100 belly points to a Pokémon.",
    price: 100,
    texCoords: [6, 0, 1, 1],
    eat: Effect_RestoreBelly(100)
};

const FoodItems: Partial<Record<ItemId, BaseItem>> = {
    [ItemId.ORAN_BERRY]: OranBerryItem,
    [ItemId.APPLE]: AppleItem,
};

export default FoodItems;