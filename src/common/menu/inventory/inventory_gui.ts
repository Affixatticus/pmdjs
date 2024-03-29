import { ItemStack } from "../../../data/item/item_stack";
import { AssetsLoader } from "../../../utils/assets_loader";
import { Controls } from "../../../utils/controls";
import { ContextMenuGui as ContextMenuGui, ContextMenuOption } from "../gui/context_menu_gui";
import { ButtonVisibility, Inventory } from "./inventory";
import { Gui, GuiClose, GuiOutput } from "../gui/gui";
import { GuiManager } from "../gui/gui_manager";
import { DungeonObject, ObjectType } from "../../../dungeons/objects/object";
import { DungeonItem } from "../../../dungeons/objects/item";
import { DungeonTile } from "../../../dungeons/objects/tile";
import { TileObjects, TILE_WIDTH } from "../../../data/tiles";
import { ItemId } from "../../../data/item/ids";

type InventoryElements = {
    container: HTMLDivElement;
    title: HTMLDivElement;
    money: HTMLDivElement;
    items: HTMLDivElement;
    icon: HTMLDivElement;
    footbar: HTMLDivElement;
    description: HTMLDivElement;
}

type InventoryGround = DungeonObject | null;

export class InventoryGui extends Gui {
    public elements: InventoryElements = {} as InventoryElements;
    /** The GUI for when you open a menu, owned by this gui */
    public ctxMenu: ContextMenuGui;
    public ground: InventoryGround;
    public enteredFromMenu: boolean = false;
    private itemSelectionMode: boolean = false;
    private multiSelectionMode: boolean = false;
    private multiSelection: number[] = [];

    public get groundPage(): number {
        return this.inventory.storedItems === 0 ? 0 : this.inventory.lastPage + 1;
    }
    public get groundExists(): boolean {
        return this.itemSelectionMode || this.multiSelectionMode ? false : this.ground !== null;
    }
    public get inGroundPage(): boolean {
        return this.groundExists && this.inventory.currentPage === this.groundPage;
    }
    public moveToGroundPage() {
        this.inventory.cursor = this.groundPage * Inventory.PAGE_SIZE;
        this.update();
    }
    public close(output: GuiOutput = GuiOutput.UNASSIGNED) {
        this.exitItemSelectionMode();
        this.exitMultiSelectionMode();
        super.close(output);
        this.enteredFromMenu = false;
    }
    // ANCHOR Item Selection
    public enterItemSelectionMode() {
        if (this.itemSelectionMode) return;
        this.itemSelectionMode = true;
        this.inventory.cursor = 0;
        this.update();
    }
    public exitItemSelectionMode() {
        if (!this.itemSelectionMode) return;
        this.itemSelectionMode = false;
        this.update();
    }
    // ANCHOR Multi Selection
    public enterMultiSelectionMode() {
        console.log("Entering msm")
        if (this.inGroundPage || this.multiSelectionMode) return;
        this.multiSelectionMode = true;
        this.multiSelection = [];
        this.update();
    }
    public exitMultiSelectionMode() {
        if (!this.multiSelectionMode) return;
        this.multiSelectionMode = false;
        this.multiSelection = [];
        this.update();
    }
    public invertSelection() {
        const newSelection = Array.from({ length: this.inventory.storedItems }).map((_, i) => i).filter(i => this.multiSelection.indexOf(i) === -1);
        this.multiSelection = newSelection;
        this.update();
    }
    public toggleSelectedItem() {
        const index = this.multiSelection.indexOf(this.inventory.cursor);
        if (index === -1) this.multiSelection.push(this.inventory.cursor);
        else this.multiSelection.splice(index, 1);
        if (this.multiSelection.length === 0)
            this.exitMultiSelectionMode();
        this.update();
    }
    public isInMultiSelection(index: number): boolean {
        if (!this.multiSelectionMode) return false;
        return this.multiSelection.indexOf(index) !== -1;
    }

    // ANCHOR HTML Elements
    constructor(public inventory: Inventory) {
        super();
        AssetsLoader.loadItemsSheet();
        // Set the ground to none
        this.ground = null;
        // Create all the elements
        this.createElements();
        this.isVisible = false;
        // Create the context menu
        this.ctxMenu = new ContextMenuGui();
    }

    // ANCHOR Navigation
    public goUp() {
        if (this.inventory.isEmpty || this.inGroundPage) return;

        if (this.inventory.cursor > this.inventory.pageStart)
            this.updateItemCursor(--this.inventory.cursor);
        else
            this.updateItemCursor(this.inventory.cursor = this.inventory.pageEnd - 1);
    }
    public goDown() {
        if (this.inventory.isEmpty || this.inGroundPage) return;

        if (this.inventory.cursor < this.inventory.pageEnd - 1)
            this.updateItemCursor(++this.inventory.cursor);
        else
            this.updateItemCursor(this.inventory.cursor = this.inventory.pageStart);
    }
    public goLeft() {
        if (this.inventory.isEmpty) return;

        // You're at the leftmost page, and you press left
        if (this.inventory.cursor < Inventory.PAGE_SIZE) {
            // Go to the ground page if there's something there
            if (this.groundExists) {
                this.inventory.cursor = this.groundPage * Inventory.PAGE_SIZE;
                return this.update();
            }
            // If you are in the first page
            if (this.inventory.currentPage === 0 && this.inventory.lastPage === 0) {
                this.inventory.cursor = 0;
            } else {
                this.inventory.cursor = Math.min(this.inventory.storedItems - 1,
                    this.inventory.lastPage * 8 + this.inventory.cursor);
            }
            return this.update();
        }
        this.inventory.cursor -= 8;
        if (this.inventory.cursor < 0)
            this.inventory.cursor = 0;

        this.update();
    }
    public goRight() {
        if (this.inventory.isEmpty) return;

        // If you are at the rightmost page, and you press right
        if (this.inventory.cursor >= this.inventory.lastPage * 8) {
            if (this.groundExists) {
                // If you are at the ground page, and you press right
                if (this.inventory.currentPage === this.groundPage) {
                    this.inventory.cursor = 0;
                    return this.update();
                }
                this.inventory.cursor = this.groundPage * Inventory.PAGE_SIZE;
                return this.update();
            }
            // If there is only one page
            if (this.inventory.lastPage === 0 && this.inventory.currentPage === this.inventory.lastPage) {
                this.inventory.cursor = this.inventory.items.length - 1;
            } else {
                this.inventory.cursor = this.inventory.cursor - this.inventory.lastPage * 8;
            }
            return this.update();
        }

        this.inventory.cursor += 8;
        if (this.inventory.cursor >= this.inventory.items.length)
            this.inventory.cursor = this.inventory.items.length - 1;
        if (this.inventory.cursor >= this.inventory.pageEnd)
            this.inventory.cursor = this.inventory.pageStart;
        this.update();
    }

    /** Code run by the state */
    public handleInput(): GuiClose {
        if (Controls.LEFT_STICK.BUTTON_UP.onPressed(0))
            this.goUp();
        else if (Controls.LEFT_STICK.BUTTON_DOWN.onPressed(0))
            this.goDown();
        else if (Controls.LEFT_STICK.BUTTON_LEFT.onPressed(0))
            this.goLeft();
        else if (Controls.LEFT_STICK.BUTTON_RIGHT.onPressed(0))
            this.goRight();

        // Multi-selection mode
        if (Controls.R.onPressed(0)) {
            if (!this.multiSelectionMode)
                this.enterMultiSelectionMode();
            if (Controls.L.isDown) {
                this.invertSelection();
            } else
                this.toggleSelectedItem();
        }
        if (Controls.L.onPressed(0)) {
            if (this.multiSelectionMode && this.multiSelection.length === 1) {
                this.inventory.swapItems(this.multiSelection[0], this.inventory.cursor);
                this.exitMultiSelectionMode();
            }
        }

        // Sort the inventory
        if (Controls.Y.onPressed(0) && !this.multiSelectionMode && !this.itemSelectionMode)
            this.inventory.sort();

        if (this.itemSelectionMode) {
            // Select the item
            if (Controls.A.onPressed(0)) {
                // Select the item and return an item swap action
                this.exitItemSelectionMode();
                // And the item to swap is at the cursor
                this.close(GuiOutput.INVENTORY_GROUND_SWAP);
            }
            // Exit item selection mode
            if (Controls.B.onPressed(0)) {
                // Exit item selection mode
                this.exitItemSelectionMode();
            }
        }
        else if (this.multiSelectionMode) {
            // Select the item
            if (Controls.A.onPressed(0)) {
                // Select the item and return an item swap action
                this.openContextMenu();
            }
            // Exit item selection mode
            if (Controls.B.onPressed(0)) {
                // Exit item selection mode
                this.exitMultiSelectionMode();
            }
        }
        else {
            // Open the context menu
            if (Controls.A.onPressed(0))
                this.openContextMenu();
            // Exit the inventory
            if (Controls.B.onPressed(0)) {
                this.isVisible = false;
                // Close the gui
                this.enteredFromMenu = false;
                return true;
            }
        }

        return false;
    }

    /** Generates the context menu options based on the item's type */
    public generateContextOptions(): ContextMenuOption[] {
        const eatOptVisibility = this.inventory.showsEatOption();
        const throwOptVisibility = this.inventory.showsThrowOption();
        const dropOptVisibility = this.inventory.showsDropOption();
        const tossOptVisibility = this.inventory.showsTossOption();

        const options: ContextMenuOption[] = [];

        if (eatOptVisibility > ButtonVisibility.HIDDEN) {
            const option = {
                text: "Eat", callback: () => {
                    return GuiOutput.IGNORED
                }, disabled: false
            };
            if (eatOptVisibility === ButtonVisibility.DISABLED)
                option.disabled = true;
            options.push(option);
        }
        if (throwOptVisibility > ButtonVisibility.HIDDEN) {
            const option = { text: "Throw", callback: () => GuiOutput.INVENTORY_THROW, disabled: false };
            if (throwOptVisibility === ButtonVisibility.DISABLED)
                option.disabled = true;
            options.push(option);
        }
        if (dropOptVisibility > ButtonVisibility.HIDDEN) {
            const option = {
                text: "Drop", callback: () => {
                    this.close(GuiOutput.INVENTORY_DROP);
                    return GuiOutput.IGNORED
                }, disabled: false
            };
            if (dropOptVisibility === ButtonVisibility.DISABLED)
                option.disabled = true;
            options.push(option);
        }
        if (tossOptVisibility > ButtonVisibility.HIDDEN) {
            const option = {
                text: "Toss", callback: () => {
                    this.inventory.extractStack(this.inventory.cursor);
                    // Close the inventory if it's empty
                    if (this.inventory.isEmpty) this.close();
                    return GuiOutput.IGNORED
                }, disabled: false
            };
            if (tossOptVisibility === ButtonVisibility.DISABLED)
                option.disabled = true;
            options.push(option);
        }

        return options;
    }
    public generateGroundItemCtxOpts(_stack: ItemStack): ContextMenuOption[] {
        const options: ContextMenuOption[] = [
            {
                text: "Pick up", callback: () => {
                    this.close(GuiOutput.INVENTORY_GROUND_PICKUP);
                    return GuiOutput.IGNORED
                }, disabled: this.inventory.isFull
            },
            {
                text: "Swap", callback: () => {
                    // Enter item selection mode
                    this.enterItemSelectionMode();
                    return GuiOutput.IGNORED
                }, disabled: false
            },
            {
                text: "Cancel", callback: () => {
                    if (!this.enteredFromMenu) {
                        this.close(GuiOutput.UNASSIGNED);
                    }
                    return GuiOutput.IGNORED
                }
            }
        ];
        return options;
    }
    public generateStairsCtxOpts(): ContextMenuOption[] {
        const options: ContextMenuOption[] = [];
        options.push({
            text: "Proceed", callback: () => {
                this.close(GuiOutput.PROCEED);
                return GuiOutput.PROCEED;
            }
        });
        return options;
    }
    public generateTrapCtxOpts(_trap: DungeonTile): ContextMenuOption[] {
        const options: ContextMenuOption[] = [];
        options.push({
            text: "Set off", callback: () => {
                return GuiOutput.IGNORED;
            }
        })
        options.push({
            text: "Disarm", callback: () => {
                this.close(GuiOutput.IGNORED);
                return GuiOutput.IGNORED;
            }
        });
        return options;
    }
    public generateMultiSelectionCtxOpts(): ContextMenuOption[] {
        const options: ContextMenuOption[] = [
            {
                text: "Toss", callback: () => {
                    for (const index of this.multiSelection.sort((a, b) => a - b).reverse()) {
                        this.inventory.extractStack(index);
                    }
                    this.exitMultiSelectionMode();
                    return GuiOutput.IGNORED
                }
            }
        ] as ContextMenuOption[];
        if (this.multiSelection.length === 1) {
            options.unshift({
                text: "Swap", callback: () => {
                    this.inventory.swapItems(this.multiSelection[0], this.inventory.cursor);
                    this.exitMultiSelectionMode();
                    return GuiOutput.IGNORED
                }, disabled: this.multiSelection[0] === this.inventory.cursor
            });
        }
        return options;
    }
    public openContextMenu(): void {
        // If no item was seltected, return
        if (this.inventory.isEmpty && !this.inGroundPage) return;
        if (this.multiSelectionMode) {
            this.ctxMenu.update(this.generateMultiSelectionCtxOpts());
        }
        else if (this.inGroundPage) {
            switch (this.ground!.type) {
                case ObjectType.ITEM:
                    const stack = (<DungeonItem>this.ground).stack;
                    this.ctxMenu.update(this.generateGroundItemCtxOpts(stack));
                    break;
                case ObjectType.TRAP:
                    this.ctxMenu.update(this.generateTrapCtxOpts(<DungeonTile>this.ground));
                    break;
                case ObjectType.STAIRS:
                    this.ctxMenu.update(this.generateStairsCtxOpts());
                    break;
            }
        }
        else {
            this.ctxMenu.update(this.generateContextOptions());
        }
        this.ctxMenu.goDown();
        this.ctxMenu.goUp();
        GuiManager.openGui(this.ctxMenu);
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
        this.elements.money = money;
        this.updateMoney();
        return money;
    }
    private createItems() {
        const items = document.createElement("div");
        items.id = "inventory-items";
        this.elements.items = items;
        this.updateItems();
        items.addEventListener("wheel", (e) => {
            e.preventDefault();
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
        }, { passive: true });
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
        const interactButton = document.createElement("div");
        interactButton.id = "inventory-footbar-interact";
        interactButton.classList.add("menu-option", "button");
        const AButton = new Image();
        AButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_A.png";
        interactButton.appendChild(AButton);
        interactButton.append("Interact");
        interactButton.onclick = () => this.openContextMenu();
        footbar.appendChild(interactButton);

        // Close Button
        const closeButton = document.createElement("div");
        closeButton.id = "inventory-footbar-close";
        closeButton.classList.add("menu-option", "button");
        const BButton = new Image();
        BButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_B.png";
        closeButton.appendChild(BButton);
        closeButton.append("Close");
        closeButton.onclick = () => { this.close() };
        footbar.appendChild(closeButton);

        // Sort Button
        const sortButton = document.createElement("div");
        sortButton.id = "inventory-footbar-sort";
        sortButton.classList.add("menu-option", "button");
        const YButton = new Image();
        YButton.src = "assets/textures/ui/buttons/Ui_Button_Guide_Y.png";
        sortButton.appendChild(YButton);
        sortButton.append("Sort");
        sortButton.onclick = () => {
            if (this.itemSelectionMode || this.multiSelectionMode) return;
            this.inventory.sort()
        };

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
    private createContainer(elements: HTMLElement[]) {
        const container = document.createElement("div");
        container.id = "inventory-container";
        container.classList.add("menu-container");
        this.elements.container = container;
        elements.forEach(container.appendChild.bind(container));
        return container;
    }
    public createElements() {
        const elements = [
            this.createTitle(),
            this.createMoney(),
            this.createItems(),
            this.createIcon(),
            this.createFootbar(),
            this.createDescription()
        ];
        // Add all the elements to the container
        const container = this.createContainer(elements);
        // Add the inventory class to all the elements
        elements.forEach(element => element.classList.add("inventory"));
        // Add the container to the body
        document.getElementById("menu")!.appendChild(container);
        // Hide the container
        this.isVisible = true;
    }

    // ANCHOR Element Updating
    public updateItemCursor(id: number) {
        this.inventory.cursor = id;
        // Loop through the items and remove the selected class
        Array.from(this.elements.items.children).forEach(element => element.classList.remove("menu-option-selected"));
        // Add the selected class to the selected item
        Array.from(this.elements.items.children)[id - this.inventory.currentPage * 8].classList.add("menu-option-selected");
        // Update the description
        this.updateDescription();
        // Update the icon
        this.updateIcon();
    }
    public createItemElement(id: number, item: ItemStack) {
        const itemElement = document.createElement("div");
        itemElement.classList.add("inventory-item", "menu-option");
        itemElement.classList.toggle("inventory-item-selection", this.itemSelectionMode);
        itemElement.classList.toggle("inventory-item-multi-selection", this.isInMultiSelection(id));
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("inventory-item-name");
        nameSpan.innerText = item.name;
        const iconSpan = document.createElement("span");
        iconSpan.classList.add("inventory-item-icon");
        iconSpan.style.background = "url(assets/textures/objects/items.png) "
            + `-${item.definition.texCoords![0] * 48}px -${item.definition.texCoords![1] * 48}px`;
        itemElement.appendChild(nameSpan);
        itemElement.appendChild(iconSpan);

        // Add the amount if it is more than 1
        if (item.amount !== 1) {
            const amountSpan = document.createElement("span");
            amountSpan.classList.add("inventory-item-amount");
            amountSpan.innerText = item.amount.toString();
            itemElement.appendChild(amountSpan);
        }
        this.elements.items.appendChild(itemElement);

        if (id === this.inventory.cursor)
            itemElement.classList.add("menu-option-selected");

        // Add an onclick event that selects the item
        itemElement.onclick = (e) => {
            e.preventDefault();
            this.updateItemCursor(id);

            if (this.itemSelectionMode) {
                // Select the item and return an item swap action
                this.exitItemSelectionMode();
                // And the item to swap is at the cursor
                this.close(GuiOutput.INVENTORY_GROUND_SWAP);
            } else {
                if (e.button === 0)
                    this.openContextMenu();
            }
        }
        itemElement.oncontextmenu = (e) => {
            e.preventDefault();
            this.enterMultiSelectionMode();
            this.toggleSelectedItem();
        }

        itemElement.onmousedown = (e) => {
            e.preventDefault();
            this.updateItemCursor(id);
        }

        return itemElement;
    }
    public createTileElement(id: number, trap: DungeonTile) {
        const itemElement = document.createElement("div");
        itemElement.classList.add("inventory-item", "menu-option");
        itemElement.classList.toggle("inventory-item-selection", this.itemSelectionMode);
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("inventory-item-name");
        nameSpan.innerText = TileObjects[trap.id].name;
        const iconSpan = document.createElement("span");
        iconSpan.style.transform = "scale(0.75)";
        const [trapCropX, trapCropY] = TileObjects[trap.id].texCoords;
        iconSpan.classList.add("inventory-item-icon");
        iconSpan.style.background = "url(assets/textures/objects/tiles.png) " +
            `-${trapCropX * TILE_WIDTH}px -${trapCropY * TILE_WIDTH}px`;
        itemElement.appendChild(nameSpan);
        itemElement.appendChild(iconSpan);
        this.elements.items.appendChild(itemElement);

        if (id === this.inventory.cursor)
            itemElement.classList.add("menu-option-selected");

        // Add an onclick event that selects the item
        itemElement.onclick = (e) => {
            e.preventDefault();
            this.updateItemCursor(id);
            this.openContextMenu();
        }
        itemElement.onmousedown = (e) => {
            e.preventDefault();
            this.updateItemCursor(id);
        }

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
        if (this.inGroundPage)
            this.elements.title.append(`Floor`);
        else
            this.elements.title.append(`${this.inventory.currentPage + 1}/${this.inventory.lastPage + 1}${this.groundExists ? "*" : ""}`);
        this.elements.title.appendChild(arrowRight);
    }
    public updateMoney() {
        const money = this.elements.money;
        const moneyText = document.createElement("span");
        moneyText.classList.add("inventory-money-text");
        moneyText.innerText = this.inventory.formatMoney();
        const iconSpan = document.createElement("span");
        iconSpan.classList.add("inventory-money-icon");
        iconSpan.style.background = "url(assets/textures/objects/items.png) "
            + `-${new ItemStack(ItemId.POKE).definition.texCoords![0] * 48}px -${new ItemStack(ItemId.POKE).definition.texCoords![1] * 48}px`;
        money.innerHTML = "";
        money.appendChild(iconSpan);
        money.appendChild(moneyText);
    }
    public updateItems() {
        // Clears the old options and adds the new ones
        this.elements.items.innerHTML = "";

        if (this.inGroundPage)
            return this.updateGroundItems();

        // Loop through the 8 items on the page
        const itemStart = this.inventory.currentPage * 8;
        const itemEnd = Math.min(itemStart + 8, this.inventory.storedItems);

        if (this.inventory.isEmpty) return;

        for (let i = itemStart; i < itemEnd; i++) {
            const item = this.inventory.items[i];
            this.createItemElement(i, item);
        }
    }
    public updateDescription() {
        if (this.inGroundPage) {
            switch (this.ground!.type) {
                case ObjectType.ITEM:
                    this.elements.description.innerText = (<DungeonItem>this.ground).stack.description;
                    break;
                case ObjectType.TRAP:
                case ObjectType.STAIRS:
                    this.elements.description.innerText = TileObjects[(<DungeonTile>this.ground).id].description;
            }
        }
        else
            this.elements.description.innerText = this.inventory.selectedItem?.description?.toString() ?? "No item selected.";
    }
    public updateIcon() {
        this.elements.icon.innerHTML = "";
        const image = new Image();
        if (this.inGroundPage) {
            switch (this.ground!.type) {
                case ObjectType.ITEM:
                    const item = (<DungeonItem>this.ground).stack;
                    image.src = item.getImageUrl();
                    this.elements.icon.appendChild(image);
                    break;
                case ObjectType.TRAP:
                case ObjectType.STAIRS:
                    const src = TileObjects[(<DungeonTile>this.ground).id].imageLocation;
                    // Don't add the image if an imageLocation wasn't specified
                    if (src === "") return console.warn("No imageLocation specified for tile " + (<DungeonTile>this.ground).id);
                    image.src = src;
                    this.elements.icon.appendChild(image);
            }
        } else {
            if (!this.inventory.selectedItem) return;
            image.src = this.inventory.selectedItem.getImageUrl();
            this.elements.icon.appendChild(image);
        }

    }
    public updateGroundItems() {
        switch (this.ground!.type) {
            case ObjectType.ITEM:
                const item = (<DungeonItem>this.ground).stack;
                this.createItemElement(this.groundPage * 8, item);
                break;
            case ObjectType.TRAP:
            case ObjectType.STAIRS:
                const trap = <DungeonTile>this.ground;
                this.createTileElement(this.groundPage * 8, trap);
        }
    }

    public update() {
        this.updateTitle();
        this.updateIcon();
        this.updateDescription();
        this.updateItems();
    }
    /** Sets the ground item to be displayed */
    public setGround(ground: InventoryGround = null) {
        this.ground = ground;
        if (this.inventory.cursor >= this.inventory.storedItems) {
            this.inventory.cursor = 0;
        }
        this.update();
    }
}