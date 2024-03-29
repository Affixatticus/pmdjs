import { Mesh, MeshBuilder, Scene } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { DungeonObject, ObjectType } from "./object";
import { AssetsLoader } from "../../utils/assets_loader";
import { getTileCrop, TileObjectId } from "../../data/tiles";
import { TileMaterial } from "./tile";
import { FloorRenderingLevels } from "../floor";

export class DungeonCarpet extends DungeonObject {
    private mesh!: Mesh;
    private material!: TileMaterial;
    private id: TileObjectId;

    constructor(pos: Vec2, id: TileObjectId) {
        super(pos, ObjectType.ITEM);
        this.id = id;
    }

    public setVisibility(isVisible: boolean): void {
        this.mesh.isVisible = isVisible;
    }

    public async render(scene: Scene): Promise<void> {
        const mesh = MeshBuilder.CreateGround(
            "carpet", {
            width: 1,
            height: 1,
            subdivisions: 1,
        }, scene);

        mesh.position = V3(this.position.x + .5, 0, this.position.y + .5).gameFormat;
        mesh.renderingGroupId = FloorRenderingLevels.GROUND;

        const source = await AssetsLoader.loadTileSheet();
        const material = new TileMaterial("stairs", source, scene, ...getTileCrop(this.id));
        mesh.material = material;

        this.mesh = mesh;
        this.material = material;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        this.material.dispose();
        return true;
    }
}