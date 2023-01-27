import { ItemId } from "../ids";
import { Stackable, Throwable } from "../items";

export const SilverThornItem: Throwable & Stackable = {
    name: "Silver Thorn",
    description: "When thrown deals damage to all foes in the same line until it hits a wall.",
    price: 100,
    texCoords: [4, 2, 1, 1],
    maxStackSize: 99,
};

export const StackItems: Partial<Record<ItemId, Stackable>> = {
    [ItemId.SILVER_THORN]: SilverThornItem,
};