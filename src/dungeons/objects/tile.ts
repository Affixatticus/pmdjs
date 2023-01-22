import { Color3, Constants, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { RenderingGroupId } from "../floor";
import { DungeonObject, ObjectType } from "./object";
import Canvas, { CropParams } from "../../utils/canvas";
import { AssetsLoader } from "../../utils/assets_loader";
import { getTileCrop, TileObject } from "../../data/tiles";


export class TileMaterial extends StandardMaterial {
    constructor(name: string, source: CanvasImageSource, scene: Scene, ...params: CropParams) {
        super(name, scene);
        const texture = Canvas.toDynamicTexture(source, scene, ...params);
        texture.hasAlpha = true;
        texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        this.diffuseTexture = texture;
        this.opacityTexture = texture;
        this.specularColor = new Color3(0, 0, 0);
    }
};

export class DungeonTile extends DungeonObject {
    private mesh!: Mesh;
    private id: TileObject;
    private isHidden: boolean;
    private isStairs: boolean;

    constructor(pos: Vec2, id: TileObject, isHidden?: boolean, isStairs?: boolean) {
        super(pos, ObjectType.ITEM);
        this.id = id;
        this.isStairs = isStairs ?? false;
        this.isHidden = isHidden ? this.isStairs : false;
    }

    public setVisibility(isVisible: boolean): void {
        this.mesh.isVisible = isVisible;
    }

    public isKeckleonRelated(): boolean {
        return this.id === TileObject.KECLEON_CARPET;
    }


    public async render(scene: Scene): Promise<void> {
        if (!this.isStairs) {
            await this.renderTile(scene);
        } else {
            await this.renderStairs(scene);
        }
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        return true;
    }

    public async renderStairs(scene: Scene): Promise<void> {
        const mesh = MeshBuilder.CreateGroundFromHeightMap(
            "stairs", "assets/textures/objects/stairs_down_heightmap.png",
            {
                width: 1,
                height: 1,
                subdivisions: 48,
                minHeight: 0,
                maxHeight: 0.25
            }, scene
        );

        mesh.position = V3(this.position.x + .5, -0.25, this.position.y + .5).gameFormat;
        mesh.renderingGroupId = RenderingGroupId.FLOOR;

        const source = await AssetsLoader.loadTileSheet();
        const material = new TileMaterial("stairs", source, scene, ...getTileCrop(this.id));
        mesh.material = material;
    }

    public async renderTile(scene: Scene): Promise<void> {
        const mesh = MeshBuilder.CreateGroundFromHeightMap(
            "trap", "assets/textures/objects/trap_heightmap.png",
            {
                width: 1,
                height: 1,
                subdivisions: 48,
                minHeight: 0,
                maxHeight: 1
            }, scene
        );

        mesh.position = V3(this.position.x + .5, 0, this.position.y + .5).gameFormat;
        mesh.renderingGroupId = RenderingGroupId.WALL;

        const source = await AssetsLoader.loadTileSheet();
        const material = new TileMaterial("trap", source, scene, ...getTileCrop(this.id));
        mesh.material = material;

        mesh.isVisible = !this.isHidden;
    }
}