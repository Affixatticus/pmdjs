import { ItemStack } from "../../data/item/item_stack";

export class Inventory {
    public items: ItemStack[];
    public money: number;
    public capacity: number = 8;

    constructor() {
        this.items = [];
        this.money = 0;
    }

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

}