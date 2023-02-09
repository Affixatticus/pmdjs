import { ItemStack } from "../../data/item/item_stack";
import { AssetsLoader } from "../../utils/assets_loader";
import Canvas from "../../utils/canvas";
import { Controls } from "../../utils/controls";

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

type InventoryElements = {
    container: HTMLDivElement;
    title: HTMLDivElement;
    money: HTMLDivElement;
    items: HTMLDivElement;
    icon: HTMLDivElement;
    footbar: HTMLDivElement;
    description: HTMLDivElement;
}

type OutputValue = boolean;

class InventoryGUI {
    public elements: InventoryElements = {} as InventoryElements;
    private closeNextTick: boolean = false;
    public visible: boolean = false;

    // ANCHOR HTML Elements
    constructor(public inventory: Inventory) {
        AssetsLoader.loadItemsSheet();
        // Create all the elements
        this.createElements();
    }

    // ANCHOR Player Interaction
    public goUp() {
        if (this.inventory.isEmpty) return;

        if (this.inventory.cursor > this.inventory.pageStart)
            this.updateItemCursor(--this.inventory.cursor);
        else
            this.updateItemCursor(this.inventory.cursor = this.inventory.pageEnd - 1);
    }
    public goDown() {
        if (this.inventory.isEmpty) return;

        if (this.inventory.cursor < this.inventory.pageEnd - 1)
            this.updateItemCursor(++this.inventory.cursor);
        else
            this.updateItemCursor(this.inventory.cursor = this.inventory.pageStart);
    }
    public goLeft() {
        if (this.inventory.isEmpty) return;

        if (this.inventory.cursor < Inventory.PAGE_SIZE) {
            this.inventory.cursor = 0;
            return this.updateItemCursor(this.inventory.cursor);
        }
        this.inventory.cursor -= 8;
        if (this.inventory.cursor < 0)
            this.inventory.cursor = 0;

        this.update();
    }
    public goRight() {
        if (this.inventory.isEmpty) return;

        if (this.inventory.cursor >= this.inventory.lastPage * 8) {
            this.inventory.cursor = this.inventory.items.length - 1;
            return this.updateItemCursor(this.inventory.cursor);
        }

        this.inventory.cursor += 8;
        if (this.inventory.cursor >= this.inventory.items.length)
            this.inventory.cursor = this.inventory.items.length - 1;
        if (this.inventory.cursor >= this.inventory.pageEnd)
            this.inventory.cursor = this.inventory.pageStart;
        this.update();
    }

    public navigate(): OutputValue {
        this.isVisible = true;
        if (Controls.LEFT_STICK.BUTTON_UP.onPressed(0))
            this.goUp();
        else if (Controls.LEFT_STICK.BUTTON_DOWN.onPressed(0))
            this.goDown();
        else if (Controls.LEFT_STICK.BUTTON_LEFT.onPressed(0))
            this.goLeft();
        else if (Controls.LEFT_STICK.BUTTON_RIGHT.onPressed(0))
            this.goRight();

        if (Controls.Y.onPressed(0))
            this.inventory.sort();
        // If you exit the inventory
        if (this.closeNextTick || Controls.B.isDown) {
            this.isVisible = false;
            return true;
        }
        return false;
    }

    // ANCHOR Visibility
    public set isVisible(value: boolean) {
        this.visible = value;
        if (!value) this.closeNextTick = false;
        this.elements.container.style.display = value ? "grid" : "none";
    }
    public get isVisible() {
        return this.visible;
    }

    // ANCHOR Element Creation
    private createTitle() {
        const title = document.createElement("div");
        title.id = "inventory-title";
        this.elements.title = title;
        this.updateTitle();
        return title;
    }
    private createMoney() {
        const money = document.createElement("div");
        money.id = "inventory-money";
        money.innerText = "Money: " + this.inventory.money;
        this.elements.money = money;
        return money;
    }
    private createItems() {
        const items = document.createElement("div");
        items.id = "inventory-items";
        this.elements.items = items;
        this.updateItems();
        items.onwheel = (e) => {
            const scrollUp = e.deltaY < 0;
            if (scrollUp) {
                if (this.inventory.cursor === this.inventory.pageStart) {
                    if (this.inventory.cursor === 0) return;
                    this.inventory.cursor = (this.inventory.currentPage) * 8 - 1;
                    this.update();
                } else this.goUp();
            }
            else {
                if (this.inventory.cursor === this.inventory.pageEnd - 1) {
                    if (this.inventory.cursor === this.inventory.items.length - 1) return;
                    this.inventory.cursor = this.inventory.pageStart;
                    this.goRight();
                } else this.goDown();
            }
        }
        return items;
    }
    private createIcon() {
        const icon = document.createElement("div");
        icon.id = "inventory-icon";
        this.elements.icon = icon;
        this.updateIcon();
        return icon;
    }
    private createFootbar() {
        const footbar = document.createElement("div");
        footbar.id = "inventory-footbar";
        this.elements.footbar = footbar;

        // Interact Button
        const interactButton = document.createElement("button");
        interactButton.id = "inventory-footbar-interact";
        const AButton = new Image();
        AButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_A.png";
        interactButton.appendChild(AButton);
        interactButton.append("Interact");
        // interactButton.onclick = () => this.inventory.interact();
        footbar.appendChild(interactButton);

        // Close Button
        const closeButton = document.createElement("button");
        closeButton.id = "inventory-footbar-close";
        const BButton = new Image();
        BButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_B.png";
        closeButton.appendChild(BButton);
        closeButton.append("Close");
        closeButton.onclick = () => { this.closeNextTick = true; };
        footbar.appendChild(closeButton);


        // Sort Button
        const sortButton = document.createElement("button");
        sortButton.id = "inventory-footbar-sort";
        const YButton = new Image();
        YButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_Y.png";
        sortButton.appendChild(YButton);
        sortButton.append("Sort");
        sortButton.onclick = () => this.inventory.sort();

        footbar.appendChild(sortButton);
        return footbar;
    }
    private createDescription() {
        const description = document.createElement("div");
        description.id = "inventory-description";
        this.elements.description = description;
        this.updateDescription();
        return description;
    }
    private createContainer(elements: Record<string, HTMLElement>) {
        const container = document.createElement("div");
        container.id = "inventory-container";
        Object.values(elements).forEach(container.appendChild.bind(container));
        return container;
    }
    public createElements() {
        const elements: Record<string, HTMLElement> = {
            title: this.createTitle(),
            money: this.createMoney(),
            items: this.createItems(),
            icon: this.createIcon(),
            footbar: this.createFootbar(),
            description: this.createDescription(),
        };
        // Add all the elements to the container
        const container = this.createContainer(elements);
        // Add the inventory class to all the elements
        Object.values(elements).forEach(element => element.classList.add("inventory"));
        // Add the container to the list of elements
        elements.container = container;
        // Add the container to the body
        document.getElementById("menu")!.appendChild(container);
        // Set the elements
        this.elements = elements as InventoryElements;
        // Hide the container
        this.isVisible = true;
    }

    // ANCHOR Element Updating
    public updateItemCursor(id: number) {
        this.inventory.cursor = id;
        // Loop through the items and remove the selected class
        Array.from(this.elements.items.children).forEach(element => element.classList.remove("inventory-item-selected"));
        // Add the selected class to the selected item
        Array.from(this.elements.items.children)[id - this.inventory.currentPage * 8].classList.add("inventory-item-selected");
        // Update the description
        this.updateDescription();
        // Update the icon
        this.updateIcon();
    }
    public createItemElement(id: number, item: ItemStack) {
        const itemElement = document.createElement("div");
        itemElement.classList.add("inventory-item");
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("inventory-item-name");
        nameSpan.innerText = item.name;
        const iconSpan = document.createElement("span");
        iconSpan.classList.add("inventory-item-icon");
        const image = new Image();
        new Promise(async () => {
            image.src = Canvas.createURL(await AssetsLoader.loadItemsSheet(), ...item.getTextureCoords());
        });
        iconSpan.appendChild(image);
        itemElement.appendChild(nameSpan);
        itemElement.appendChild(iconSpan);
        this.elements.items.appendChild(itemElement);

        if (id === this.inventory.cursor)
            itemElement.classList.add("inventory-item-selected");

        // Add an onclick event that selects the item
        itemElement.onclick = () => { this.updateItemCursor(id); }

        return itemElement;
    }
    public updateTitle() {
        this.elements.title.innerHTML = "";

        const arrowLeft = new Image();
        arrowLeft.src = "assets/textures/ui/buttons/Ui_Button_Guide_Hidari.png";
        arrowLeft.classList.add("inventory-title-arrow");
        arrowLeft.id = "inventory-title-arrow-left";
        arrowLeft.onclick = () => this.goLeft();

        const arrowRight = new Image();
        arrowRight.src = "assets/textures/ui/buttons/Ui_Button_Guide_Migi.png";
        arrowRight.classList.add("inventory-title-arrow");
        arrowRight.id = "inventory-title-arrow-right";
        arrowRight.onclick = () => this.goRight();

        this.elements.title.innerHTML = `Inventory<hr/>`;
        this.elements.title.appendChild(arrowLeft);
        this.elements.title.append(`${this.inventory.currentPage + 1}/${this.inventory.lastPage + 1}`);
        this.elements.title.appendChild(arrowRight);
    }
    public async updateItems() {
        // Clears the old options and adds the new ones
        this.elements.items.innerHTML = "";
        // Loop through the items eight at a time
        const itemStart = this.inventory.currentPage * 8;
        const itemEnd = Math.min(itemStart + 8, this.inventory.items.length);

        for (let i = itemStart; i < itemEnd; i++) {
            const item = this.inventory.items[i];
            this.createItemElement(i, item);
        }
    }
    public updateDescription() {
        this.elements.description.innerText = this.inventory.selectedItem?.description?.toString() ?? "No item selected.";
    }
    public updateIcon() {
        this.elements.icon.innerHTML = "";
        if (!this.inventory.selectedItem) return;
        const image = new Image();
        image.src = this.inventory.selectedItem?.getImageUrl() ?? "";
        this.elements.icon.appendChild(image);
    }

    public update() {
        this.updateTitle();
        this.updateIcon();
        this.updateDescription();
        this.updateItems();
    }
}