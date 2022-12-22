import { Color3, Constants, Mesh, MeshBuilder, Scene, SpotLight, StandardMaterial, Vector3 } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { TileRenderingGroupIds } from "../floor";
import { DungeonObject, ObjectTypes } from "./object";
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
    private light!: SpotLight;

    constructor(pos: Vec2, id: number) {
        super(pos, ObjectTypes.ITEM);
        this.id = id;
    }

    public getId(start = ""): string {
        return start + "_" + this.id.toString() + this.pos.x.toString() + this.pos.y.toString();
    }

    public async render(scene: Scene): Promise<void> {
        //Create a plane
        const plane = MeshBuilder.CreatePlane(this.getId("plane"), { size: 1 }, scene);

        plane.position = V3(this.pos.x + .5, 0.001, this.pos.y + .5).gameFormat;
        plane.rotate(Vector3.Right(), Math.PI / 2);
        plane.renderingGroupId = TileRenderingGroupIds.FLOOR;

        // Load the texture
        const source = await AssetsLoader.loadItemsSheet();
        const material = new ItemMaterial("item", source, scene, ...getItemCrop(this.id));

        plane.material = material;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        this.light.dispose();
        return true;
    }
}