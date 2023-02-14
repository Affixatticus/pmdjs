import { Mesh, StandardMaterial, Scene, MeshBuilder, DynamicTexture, Constants } from "@babylonjs/core";
import { Tile } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { fillOutStandardOptions } from "../../utils/material";
import { V2, Vec2 } from "../../utils/vectors";
import { FloorRenderingLevels } from "../floor";
import { OffsetGrid, DungeonGrid } from "./grid";
import { Tiling, DungeonTiling, TilingTextureMode } from "./tiling";

export class FloorMesh {
    private mesh!: Mesh;
    private ctx!: CanvasRenderingContext2D;
    private material!: StandardMaterial;
    private textures!: CanvasImageSource;
    private variants!: Record<number, number[]>;
    public width: number;
    public height: number;

    static DEBUG = false;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    // Preloading
    public async preloadTexture(dungeonId: string) {
        const { textures, properties } = await AssetsLoader.loadDungeonTextures(dungeonId);
        this.textures = textures;
        this.variants = properties.variants.floor;
    }

    // Building
    public async build(scene: Scene) {
        // Create the mesh
        const mesh = MeshBuilder.CreateGround("ground", {
            width: this.width,
            height: this.height,
            subdivisionsX: this.width,
            subdivisionsY: this.height,
        }, scene);

        // Adjust the position
        mesh.position.set(...V2(this.width / 2, this.height / 2).toVec3().gameFormat.spread());

        // Resolve z-fighting
        mesh.renderingGroupId = FloorRenderingLevels.GROUND;

        // Loads the material
        this.material = this.createMaterial(scene);
        mesh.material = this.material;
        this.mesh = mesh;
    }

    public createMaterial(scene: Scene): StandardMaterial {
        const material = new StandardMaterial("material", scene);
        const texture = new DynamicTexture("dynamic texture", {
            width: this.width * 24,
            height: this.height * 24,
        }, scene, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
        
        material.diffuseTexture = texture;
        material.maxSimultaneousLights = 5;
        fillOutStandardOptions(material);
        texture.update();
        
        this.ctx = texture.getContext() as CanvasRenderingContext2D;
        return material;
    }

    // Updating
    private chooseVariant(tilings: Tiling, pos: Vec2): number {
        const variants = this.variants[tilings];
        // return 0;
        if (!variants) return 0;
        const rand = pos.getHashCode() % 7;
        if (rand == 1 && variants.includes(2))
            return 2;
        if (rand <= 2 && variants.includes(1))
            return 1;
        return 0;
    }

    public updateTexture(toUpdate: OffsetGrid, grid: DungeonGrid) {
        this.ctx.clearRect(toUpdate.start.x * 24, toUpdate.start.y * 24, toUpdate.width * 24, toUpdate.height * 24);

        for (const [pos, tiling] of toUpdate) {
            let variant = 0;

            if (FloorMesh.DEBUG) {
                this.ctx.fillStyle = (pos.x + pos.y) % 2 == 0 ? "gray" : "white";
                this.ctx.fillRect(pos.x * 24, pos.y * 24, 24, 24);
                continue;
            }

            if (tiling === Tiling.BLANK) {
                const tile = grid.get(pos);
                // If the tile should be clear, use the CENTER_FULL (transparent)
                if (tile !== Tile.WATER && tile !== Tile.CLEAR_TILE)
                    variant = Tiling.CENTER_FULL;
            } else
                variant = this.chooseVariant(tiling, pos);

            const tilingCrop = DungeonTiling.getCrop(tiling, Tile.FLOOR, variant, TilingTextureMode.TEXTURE);

            this.ctx.drawImage(this.textures, ...tilingCrop, pos.x * 24, pos.y * 24, 24, 24);
        }

        (<DynamicTexture>this.material.diffuseTexture).update();
    }

    // Disposing
    public dispose() {
        this.mesh.dispose();
        this.material.dispose();
    }
}
