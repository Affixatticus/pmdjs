import { ItemStack } from "../../../data/item/item_stack";
import { AssetsLoader } from "../../../utils/assets_loader";
import { Controls } from "../../../utils/controls";
import { ContextMenuGUI, ContextMenuOption } from "./context_menu_gui";
import { ButtonVisibility, Inventory } from "./inventory";
import { Gui, GuiClose, GuiOutput } from "../gui/gui";
import { GuiManager } from "../gui/gui_manager";

type InventoryElements = {
    container: HTMLDivElement;
    title: HTMLDivElement;
    money: HTMLDivElement;
    items: HTMLDivElement;
    icon: HTMLDivElement;
    footbar: HTMLDivElement;
    description: HTMLDivElement;
}

export class InventoryGUI extends Gui {
    public elements: InventoryElements = {} as InventoryElements;
    /** The GUI for when you open a menu, owned by this gui */
    public ctxMenu: ContextMenuGUI;

    // ANCHOR HTML Elements
    constructor(public inventory: Inventory) {
        super();
        AssetsLoader.loadItemsSheet();
        // Create all the elements
        this.createElements();
        this.isVisible = false;
        // Create the context menu
        this.ctxMenu = new ContextMenuGUI();
    }

    // ANCHOR Navigation
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

    public openContextMenu(): void {
        // If no item was seltected, return
        if (this.inventory.isEmpty) return;
        this.ctxMenu.update(this.generateContextOptions());
        GuiManager.openGui(this.ctxMenu);
    }

    /** Code run by the state */
    public handleInput(): GuiClose {
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
        if (Controls.A.onPressed(0))
            this.openContextMenu();

        // If you exit the inventory
        if (Controls.B.onPressed(0)) {
            this.isVisible = false;
            // Close the gui
            return true;
        }
        return false;
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
        const nameSpan = document.createElement("span");
        nameSpan.classList.add("inventory-item-name");
        nameSpan.innerText = item.name;
        const iconSpan = document.createElement("span");
        iconSpan.classList.add("inventory-item-icon");
        iconSpan.style.background = "url(assets/textures/objects/items.png) "
            + `-${item.definition.texCoords![0] * 48}px -${item.definition.texCoords![1] * 48}px`;
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
        this.elements.title.append(`${this.inventory.currentPage + 1}/${this.inventory.lastPage + 1}`);
        this.elements.title.appendChild(arrowRight);
    }
    public async updateItems() {
        // Clears the old options and adds the new ones
        this.elements.items.innerHTML = "";
        // Loop through the items eight at a time
        const itemStart = this.inventory.currentPage * 8;
        const itemEnd = Math.min(itemStart + 8, this.inventory.items.length);

        if (this.inventory.isEmpty) return;

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