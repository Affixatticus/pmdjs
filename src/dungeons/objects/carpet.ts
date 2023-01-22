import { Mesh, MeshBuilder, Scene } from "@babylonjs/core";
import { V3, Vec2 } from "../../utils/vectors";
import { DungeonObject, ObjectTypes } from "./object";
import { AssetsLoader } from "../../utils/assets_loader";
import { getTileCrop, TileObjects } from "../../data/tiles";
import { TileMaterial } from "./tile";
import { RenderingGroupIds } from "../floor";

export class DungeonCarpet extends DungeonObject {
    private mesh!: Mesh;
    private id: TileObjects;

    constructor(pos: Vec2, id: TileObjects) {
        super(pos, ObjectTypes.ITEM);
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
        mesh.renderingGroupId = RenderingGroupIds.WATER;

        const source = await AssetsLoader.loadTileSheet();
        const material = new TileMaterial("stairs", source, scene, ...getTileCrop(this.id));
        mesh.material = material;
    }

    public dispose() {
        if (!this.mesh) return false;
        this.mesh.dispose();
        return true;
    }
}