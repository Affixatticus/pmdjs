import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { FloorRenderingLevels } from "../floor";
import { DungeonObject, ObjectType } from "./object";
import Canvas, { CropParams } from "../../utils/canvas";
import { AssetsLoader } from "../../utils/assets_loader";
import { fillOutStandardOptions } from "../../utils/material";
import { ItemId } from "../../data/item/ids";
import { ItemStack } from "../../data/item/item_stack";
import { getItemCrop } from "../../data/item/items";

const GRAYED_EC = new Color3(0.4, 0.4, 0.4);
const WHITE_EC = new Color3(1, 1, 1);
export class ItemMaterial extends StandardMaterial {
    private disabled: boolean = false;

    constructor(name: string, source: CanvasImageSource, scene: Scene, ...params: CropParams) {
        super(name, scene);
        const texture = Canvas.toDynamicTexture(source, scene, ...params);
        this.diffuseTexture = texture;
        fillOutStandardOptions(this, texture);
        this.setDisabled(this.disabled);
    }

    public setDisabled(disabled = true) {
        if (this.disabled === disabled) return;
        this.diffuseColor = (this.disabled = disabled) ? GRAYED_EC : WHITE_EC;
    }

    public setEnabled(enabled = true) { this.setDisabled(!enabled) }
};

export class DungeonItem extends DungeonObject {
    private mesh!: Mesh;
    private material!: ItemMaterial;
    private _stack: ItemStack;
    public isWanted: boolean = true;
    /** If the game should show the GUI the next time the leader walks on this */
    public noGui: boolean = false;

    constructor(pos: Vec2, itemId: ItemId, amount: number = 1) {
        super(pos, ObjectType.ITEM);
        this._stack = new ItemStack(itemId, amount);
    }

    public get stack() {
        return this._stack;
    }
    public set stack(itemStack: ItemStack) {
        this._stack = itemStack;
    }
    public get itemId() {
        return this._stack.item;
    }
    public get isMoney() {
        return this.itemId === ItemId.POKE;
    }

    public discard(wanted: boolean = false) {
        this.material.setEnabled(wanted);
        this.noGui = !wanted;
        this.isWanted = wanted;
    }

    public pickUp() {
        this.dispose();
        return this.stack;
    }

    public getId(start = ""): string {
        return start + "_" + this.itemId.toString() + this.position.x.toString() + this.position.y.toString();
    }

    public async render(scene: Scene): Promise<void> {
        // Load the texture
        const source = await AssetsLoader.loadItemsSheet();
        const material = new ItemMaterial("item", source, scene, ...getItemCrop(this.itemId));

        //Create a plane
        const plane = MeshBuilder.CreatePlane(this.getId("plane"), { size: 1 }, scene);

        plane.position = V3(this.position.x + .5, 0.001, this.position.y + .5).gameFormat;
        plane.rotate(Vector3.Right(), Math.PI / 2);
        plane.renderingGroupId = FloorRenderingLevels.GROUND;

        plane.material = material;

        this.mesh = plane;
        this.material = material;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        this.material.dispose();
        return true;
    }
}