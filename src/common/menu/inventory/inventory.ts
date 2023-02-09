import { ItemStack } from "../../../data/item/item_stack";
import { AssetsLoader } from "../../../utils/assets_loader";
import Canvas from "../../../utils/canvas";
import { Controls } from "../../../utils/controls";
import { InventoryGUI } from "./gui";

export class Inventory {
    public static PAGE_SIZE = 8;

    public items: ItemStack[];
    public money: number;
    public capacity: number = 32;
    public gui: InventoryGUI;

    /** The position of the cursor in the inventory */
    public cursor: number = 0;

    public get isEmpty(): boolean {
        return this.items.length === 0;
    }

    public get selectedItem(): ItemStack | null {
        return this.items[this.cursor];
    }

    public get currentPage(): number {
        return Math.floor(this.cursor / Inventory.PAGE_SIZE);
    }

    public get lastPage(): number {
        return Math.max(0, Math.floor((this.items.length - 1) / Inventory.PAGE_SIZE));
    }

    public get pageStart(): number {
        return this.currentPage * 8;
    }
    public get pageEnd(): number {
        return Math.min(this.pageStart + 8, this.items.length);
    }

    constructor() {
        this.items = [];
        this.money = 0;
        this.gui = new InventoryGUI(this);
    }

    // ANCHOR Storage
    /** Function that runs when you try to merge a stack with the inventory 
     * (while sorting, or picking up items) 
     * returns true if the item was added correctly */
    public addStack(stack: ItemStack, startIndex: number = 0): ItemStack | null {
        // Just add the item if the maxStackSze is 1
        if (stack.definition.maxStackSize === 1) {
            return this.tryAddStack(stack);
        }
        // Otherwise, find a free stack and try to merge it
        const freeStackIndex = this.findSameFreeStack(stack, startIndex);

        // If there is no free stack, just add the item as is
        if (freeStackIndex === -1) {
            return this.tryAddStack(stack);
        }

        // Otherwise, try to merge the two stacks
        const freeStack = this.items[freeStackIndex];
        const freeSpace = freeStack.maxStackSize - freeStack.amount;
        // If the stack is free enough, just merge the two
        if (stack.amount <= freeSpace) {
            // Update an existing stack
            freeStack.amount += stack.amount;
            return null;
        }
        // Otherwise, merge the two and retry merging with stacks further down
        else {
            freeStack.amount = freeStack.maxStackSize;
            stack.amount -= freeSpace;
            return this.addStack(stack, startIndex + 1);
        }
    }

    /** Tries to push a stack to the bottom of the inventory
     * returns true if the item was added correctly
     * returns false if the inventory is full
     */
    private tryAddStack(stack: ItemStack): ItemStack | null {
        if (this.items.length >= this.capacity) {
            return stack;
        }
        this.items.push(stack);
        this.gui.update();
        return null;
    }

    public findSameFreeStack(stack: ItemStack, startIndex: number = 0): number {
        for (let i = startIndex; i < this.items.length; i++) {
            const item = this.items[i];
            if (item.sameAs(stack) && item.amount < item.maxStackSize) {
                return i;
            }
        }
        return -1;
    }

    public hasFreeSpace(): boolean {
        return this.items.length < this.capacity;
    }

    public sort() {
        this.items = this.items.sort((a, b) => a.name > b.name ? 1 : -1);
        this.gui.update();
    }

    // ANCHOR UI
    public navigate(): boolean {
        const output = this.gui.navigate();
        if (output) return true;
        return false;
    }
}