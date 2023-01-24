import { Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { RenderingGroupId } from "../floor";
import { DungeonObject, ObjectType } from "./object";
import Canvas, { CropParams } from "../../utils/canvas";
import { AssetsLoader } from "../../utils/assets_loader";
import { getTileCrop, TileObject } from "../../data/tiles";
import { fillOutStandardOptions } from "../../utils/material";

export class TileMaterial extends StandardMaterial {
    constructor(name: string, source: CanvasImageSource, scene: Scene, ...params: CropParams) {
        super(name, scene);
        const texture = Canvas.toDynamicTexture(source, scene, ...params);
        this.diffuseTexture = texture;
        this.opacityTexture = texture;
        fillOutStandardOptions(this);
    }
};

export class DungeonTile extends DungeonObject {
    private id: TileObject;
    public isHidden: boolean;
    public isStairs: boolean;
    private mesh!: Mesh;
    private material!: TileMaterial;

    constructor(pos: Vec2, id: TileObject, isHidden?: boolean, isStairs?: boolean) {
        super(pos, isStairs ? ObjectType.STAIRS : ObjectType.TRAP);
        this.id = id;
        this.isStairs = isStairs ?? false;
        this.isHidden = isHidden ?? true;
    }

    // ANCHOR Utility
    public setVisibility(isVisible: boolean): void {
        this.mesh.isVisible = isVisible;
    }

    public isKeckleonCarpet(): boolean {
        return this.id === TileObject.KECLEON_CARPET;
    }

    // ANCHOR Render
    public async render(scene: Scene): Promise<void> {
        if (!this.isStairs) {
            await this.renderTile(scene);
        } else {
            await this.renderStairs(scene);
        }
    }

    private async renderStairs(scene: Scene): Promise<void> {
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

        this.mesh = mesh;
        this.material = material;
    }

    private async renderTile(scene: Scene): Promise<void> {
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
        mesh.renderingGroupId = RenderingGroupId.FLOOR;

        const source = await AssetsLoader.loadTileSheet();
        const material = new TileMaterial("trap", source, scene, ...getTileCrop(this.id));
        mesh.material = material;

        mesh.isVisible = !this.isHidden;

        this.mesh = mesh;
        this.material = material;
    }

    // ANCHOR Dispose
    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        return true;
    }
}