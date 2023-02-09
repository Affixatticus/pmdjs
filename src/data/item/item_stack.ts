import { ItemId } from "./ids";
import { getItemCrop, Item, ItemList } from "./items";

export class ItemStack {
    public item: ItemId;
    public amount: number = 1;

    constructor(item: ItemId, amount: number = 1) {
        this.item = item;
        this.amount = amount;
    }

    // ANCHOR Getters
    public get name(): string {
        return this.definition?.name ?? "Unknown Item";
    }
    public get description(): string {
        return this.definition?.description ?? "No description";
    }
    public get price(): number {
        return this.definition?.price ?? 0;
    }
    public get definition(): Item {
        return ItemList[this.item]!;
    }
    public get maxStackSize(): number {
        return this.definition?.maxStackSize ?? 1;
    }
    public get isEdible(): boolean {
        return this.definition?.eat !== undefined;
    }
    public get isThrowable(): boolean {
        return this.definition?.throw !== undefined;
    }

    public get itemAmount(): [ItemId, number] {
        return [this.item, this.amount];
    }

    // ANCHOR Methods
    public sameAs(stack: ItemStack): boolean {
        return this.item === stack.item;
    }

    public getTextureCoords(): [x: number, y: number, w: number, h: number] {
        return getItemCrop(this.item);
    }
    public getImageUrl(): string {
        return "assets/textures/ui/item_images/" + this.definition.imageUrl + ".png";
    }
}