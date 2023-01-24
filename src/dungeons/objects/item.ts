import { Color3, Constants, Mesh, MeshBuilder, Scene, SpotLight, StandardMaterial, Vector3 } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { RenderingGroupId } from "../floor";
import { DungeonObject, ObjectType } from "./object";
import Canvas, { CropParams } from "../../utils/canvas";
import { AssetsLoader } from "../../utils/assets_loader";
import { getItemCrop } from "../../data/items";

const BLACK_EC = new Color3(0, 0, 0);
const GRAYED_EC = new Color3(0.4, 0.4, 0.4);
const WHITE_EC = new Color3(1, 1, 1);
export class ItemMaterial extends StandardMaterial {
    private disabled: boolean = false;

    constructor(name: string, source: CanvasImageSource, scene: Scene, ...params: CropParams) {
        super(name, scene);
        const texture = Canvas.toDynamicTexture(source, scene, ...params);
        texture.hasAlpha = true;
        texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        this.diffuseTexture = texture;
        this.specularColor = BLACK_EC;
        this.setDisabled(this.disabled);
    }

    public setDisabled(disabled = true) {
        if (this.disabled === disabled) return;
        this.diffuseColor = (this.disabled = disabled) ? GRAYED_EC : WHITE_EC;
    }

    public setEnabled(enabled = true) { this.setDisabled(!enabled) }
};

export class DungeonItem extends DungeonObject {
    private id: number;
    private mesh!: Mesh;
    private material!: ItemMaterial;

    constructor(pos: Vec2, id: number) {
        super(pos, ObjectType.ITEM);
        this.id = id;
    }

    public getId(start = ""): string {
        return start + "_" + this.id.toString() + this.position.x.toString() + this.position.y.toString();
    }

    public async render(scene: Scene): Promise<void> {
        //Create a plane
        const plane = MeshBuilder.CreatePlane(this.getId("plane"), { size: 1 }, scene);

        plane.position = V3(this.position.x + .5, 0.001, this.position.y + .5).gameFormat;
        plane.rotate(Vector3.Right(), Math.PI / 2);
        plane.renderingGroupId = RenderingGroupId.FLOOR;

        // Load the texture
        const source = await AssetsLoader.loadItemsSheet();
        const material = new ItemMaterial("item", source, scene, ...getItemCrop(this.id));

        plane.material = material;

        this.mesh = plane;
        this.material = material;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        return true;
    }
}