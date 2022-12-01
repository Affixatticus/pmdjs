import { Constants, Mesh, MeshBuilder, Scene, SpotLight, StandardMaterial, Vector3 } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { TileRenderingGroupIds } from "../floor";
import { DungeonObject, ObjectTypes } from "./object";
import Canvas, { CropParams } from "../../utils/canvas";
import { AssetsLoader } from "../../utils/assets_loader";
import { getItemCrop } from "../../data/items";


export class ItemMaterial extends StandardMaterial {
    constructor(name: string, source: CanvasImageSource, scene: Scene, ...params: CropParams) {
        super(name, scene);
        const texture = Canvas.toDynamicTexture(source, scene, ...params);
        texture.hasAlpha = true;
        texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        this.diffuseTexture = texture;
        this.specularPower = 10000;
    }
};

export class DungeonItem extends DungeonObject {
    private id: number;
    private mesh!: Mesh;

    constructor(pos: Vec2, id: number) {
        super(pos, ObjectTypes.ITEM);
        this.id = id;
    }

    public async render(scene: Scene): Promise<void> {
        //Create a plane
        const plane = MeshBuilder.CreatePlane("plane", { size: 1 }, scene);

        plane.position = V3(this.pos.x + .5, 0, this.pos.y + .5).gameFormat;
        plane.rotate(Vector3.Right(), Math.PI / 2 - Math.PI / 6);
        plane.renderingGroupId = TileRenderingGroupIds.WALL;

        // Load the texture
        const source = await AssetsLoader.loadItemsSheet();
        const material = new ItemMaterial("item", source, scene, ...getItemCrop(this.id));

        plane.material = material;

        // Add a spot light on top of the plane
        const light = new SpotLight("spotLight", plane.position.add(V3(0, 0.5, 0.1)), V3(0, -1, 0), Math.PI / 2, 1, scene);
        light.exponent = 4;
        light.intensity = 0.2;

        this.mesh = plane;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        return true;
    }
}