import { ItemId } from "../ids";
import { Stackable, Throwable } from "../items";

export const SilverThornItem: Throwable & Stackable = {
    name: "Silver Thorn",
    description: "When thrown deals damage to all foes in the same line until it hits a wall.",
    price: 100,
    texCoords: [4, 2, 1, 1],
    imageUrl: "Item_image_ARROW_SILVER",
    maxStackSize: 99,
    throw() { },
};

export const StackItems: Partial<Record<ItemId, Stackable>> = {
    [ItemId.SILVER_THORN]: SilverThornItem,
};