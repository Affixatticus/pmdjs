import { ItemStack } from "../../../data/item/item_stack";
import { DungeonState } from "../../../dungeons/dungeon";
import { GUIReturnType } from "./common";
import { InventoryGUI } from "./inventory_gui";


export const enum ButtonVisibility {
    HIDDEN,
    VISIBLE,
    DISABLED,
};

export class Inventory {
    public static PAGE_SIZE = 8;

    public items: ItemStack[];
    public money: number;
    public capacity: number = 32;
    public gui: InventoryGUI;

    // TODO This will be a more generic state
    public state!: DungeonState;

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

    public get(index: number): ItemStack {
        return this.items[index];
    }
    public extractStack(index: number): ItemStack {
        const stack = this.items[index];
        this.items.splice(index, 1);
        if (this.cursor > 0)
            this.cursor--;
        this.gui.update();
        return stack;
    }

    public sort() {
        this.items = this.items.sort((a, b) => a.name > b.name ? 1 : -1);
        this.gui.update();
    }

    // ANCHOR State Querying
    public inDungeonState(): boolean {
        return this.state instanceof DungeonState;
    }
    public showEatOption(): ButtonVisibility {
        return this.selectedItem!.isEdible ? ButtonVisibility.VISIBLE : ButtonVisibility.HIDDEN;
    }
    public showThrowOption(): ButtonVisibility {
        if (this.inDungeonState()) {
            return this.selectedItem!.isThrowable ? ButtonVisibility.VISIBLE : ButtonVisibility.DISABLED;
        }
        return ButtonVisibility.HIDDEN;
    }
    public showDropOption(): ButtonVisibility {
        if (this.inDungeonState()) {
            // Check if there is room to drop the item
            if (this.state.logic.canDropItem())
                return ButtonVisibility.VISIBLE;
            return ButtonVisibility.DISABLED;
        }
        return ButtonVisibility.HIDDEN;
    }
    public showTossOption(): ButtonVisibility {
        return ButtonVisibility.VISIBLE;
    }

    // ANCHOR UI
    public navigate(): GUIReturnType {
        return this.gui.navigate();
    }
}