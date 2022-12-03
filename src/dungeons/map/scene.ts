import { Color3, Color4, Constants, Mesh, MeshBuilder, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DungeonTextures } from "../../data/dungeons";
import { Tiles } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import Canvas from "../../utils/canvas";
import Random from "../../utils/random";
import { V2, V3, Vec2 } from "../../utils/vectors";
import { TileRenderingGroupIds } from "../floor";
import { ByteGrid, DungeonGrid } from "./grid";
import { TileMeshContainer, WaterTileMaterial } from "./tilemesh";
import { DungeonTiling, Tilings, TilingTextureMode } from "./tiling";

const TILE_VIEWPORT = V2(24, 24);


export class DungeonMap {
    // Input
    private scene: Scene;
    private path: string;
    private grid: DungeonGrid;

    // Processing
    private loaded!: ByteGrid;
    private props!: DungeonTextures;

    // Output
    private wallMeshes: TileMeshContainer;
    private waterMeshes: TileMeshContainer;
    private floorMesh!: Mesh;

    // Consts
    private static DEFAULT_BACKGROUND: [number, number, number] = [0, 0, 0];

    constructor(scene: Scene, path: string, map: DungeonGrid) {
        this.scene = scene;
        this.path = path;
        this.grid = map;
        this.wallMeshes = new TileMeshContainer();
        this.waterMeshes = new TileMeshContainer();

        // Create a matrix to keep track of the loaded tiles
        this.loaded = new ByteGrid(map.width, map.height);
    }

    // Loading

    /* Creates all the used tiles combinations */
    private async createWallMeshes(tilings: Iterable<Tilings>) {
        // Load the image and time it
        const start = performance.now();
        const { textures, heightmaps, properties } = this.props;
        const variants = properties.variants.walls;

        let avg = 0;
        let avgCnt = 0;

        for (const tiling of tilings) {
            const astart = performance.now();
            // If this tiling has a variant
            for (const variant of variants[tiling] ? variants[tiling] : [0]) {
                this.wallMeshes.createWallTileMesh(tiling, textures, heightmaps, this.scene, { variant });
            }

            const aend = performance.now();
            avg += aend - astart;
            avgCnt++;
        }

        const end = performance.now();
        console.log(`Loaded dungeon wall meshes in ${(end - start).toFixed(2)}ms`);
        console.log(`-> Average time per mesh: ${(avg / avgCnt).toFixed(2)}ms`);
    }

    /** Creates all the tiles used for water */
    private async createWaterMeshes(tilings: Iterable<Tilings>) {
        const start = performance.now();
        const { waterTextures, heightmaps, properties } = this.props;

        if (!properties.water) return;

        const waterSpeed = properties.water.speed ?? 10;
        const waterHeight = properties.water.height ?? 0.5;
        const waterLevel = properties.water.level ?? 0;

        const options = { waterSpeed, waterHeight, waterLevel };

        // Water meshs have no variants
        for (const tiling of tilings) {
            this.waterMeshes.createWaterTileMesh(tiling, waterTextures as CanvasImageSource[], heightmaps, this.scene, options);
        }

        const end = performance.now();
        console.log(`Loaded dungeon water textures in ${(end - start).toFixed(2)}ms`);
    }


    /** Creates the tiles from the assets */
    public async preload() {
        // Load the properties
        this.props = await AssetsLoader.loadDungeonTextures(this.path);

        // Change the clear color to the one in the info
        const background = this.props.properties.background ?? DungeonMap.DEFAULT_BACKGROUND;
        this.scene.clearColor = Color4.FromColor3(new Color3(
            // TODO Scale to 255, right now it darkens the color to account for weak lighting
            ...V3(...background).scale(1 / 359).spread()
        ));

        // Get all the used tile combinations
        await this.createWallMeshes(this.grid.mapTilingsFor(Tiles.WALL).getUniqueValues());

        // Get the water tilings
        await this.createWaterMeshes(this.grid.mapTilingsFor(Tiles.WATER).getUniqueValues());
    }

    // Building
    private chooseVariant(variants: number[] | undefined): number {
        // return 0;
        if (!variants) return 0;
        const rand = Random.int(7);
        if (rand == 1 && variants.includes(2))
            return 2;
        if (rand <= 2 && variants.includes(1))
            return 1;
        return 0;
    }

    private placeWallTiles(start?: Vec2, size?: Vec2) {
        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WALL);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.wallMeshes.instance(pos, tiling, this.loaded);
        }
    }

    private placeWaterTiles(start?: Vec2, size?: Vec2) {
        if (!this.props.properties.water) return;

        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WATER);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.waterMeshes.instance(pos, tiling, this.loaded);
        }
    }

    /** Creates the floor's material, does not need updating */
    private createFloorMaterial(texture: CanvasImageSource, variants: Record<number, number[]>): StandardMaterial {
        const material = new StandardMaterial("material", this.scene);

        const ctx = Canvas.create(this.grid.width * 24, this.grid.height * 24);

        // Draw the textures on the ctx
        const gridTilings = this.grid.mapTilingsFor(Tiles.FLOOR, [Tiles.WATER, Tiles.TRAP, Tiles.STAIRS]);
        for (const [pos, tiling] of gridTilings) {
            // Determine if this tile has a variant
            const variant = this.chooseVariant(variants[tiling]);

            let myTiling = tiling;
            if (tiling === Tilings.UNDEFINED) {
                const tile = this.grid.get(...pos.spread());
                // If the tile doesn't have a water tile, use the CENTER_FULL
                if (tile !== Tiles.WATER && tile !== Tiles.STAIRS)
                    myTiling = Tilings.CENTER_FULL;
            }

            const params = DungeonTiling.getCrop(
                myTiling,
                Tiles.FLOOR, variant, TilingTextureMode.TEXTURE);
            ctx.drawImage(texture, ...params, pos.x * 24, pos.y * 24, 24, 24);
        }

        const url = Canvas.toDataURL(ctx);

        material.diffuseTexture = new Texture(url, this.scene,
            true, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
        material.diffuseTexture.hasAlpha = true;
        material.diffuseTexture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        material.diffuseTexture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

        material.specularPower = 10000000;

        return material;
    }

    /** Creates the floor GroundMesh */
    private createFloorMesh(): Mesh {
        const mesh = MeshBuilder.CreateGround("ground", {
            width: this.grid.width,
            height: this.grid.height,
            subdivisionsX: this.grid.width,
            subdivisionsY: this.grid.height,
        }, this.scene);

        // Adjust the position
        mesh.position.set(...V2(this.grid.width / 2, this.grid.height / 2).toVec3().gameFormat.spread());

        // Resolve z-fighting
        mesh.renderingGroupId = TileRenderingGroupIds.FLOOR;

        return mesh;
    }

    /** Builds the floor GroundMesh from the group up */
    private async buildFloor() {
        const { textures, properties } = this.props;

        const material = this.createFloorMaterial(textures, properties.variants.floor);
        const mesh = this.createFloorMesh();
        mesh.material = material;

        return mesh;
    }

    /** Renders to screen the first tiles and builds the ground */
    public async build(pos: Vec2) {
        // Place the tiles and time it
        const tstart = performance.now();
        const tend = performance.now();
        this.buildView(pos);
        console.log(`Placed dungeon tiles in ${tend - tstart}ms`);

        // Place the floor ground and time it
        const fstart = performance.now();
        this.floorMesh = await this.buildFloor();
        const fend = performance.now();
        console.log(`Placed dungeon floor in ${(fend - fstart).toFixed(2)}ms`);
    }

    /** Builds the map to fill the view with the position at the center */
    public async buildView(pos: Vec2) {
        // Get the start position
        const start = pos.subtract(TILE_VIEWPORT.scale(0.5).roundUp());
        const size = TILE_VIEWPORT;
        this.placeWallTiles(start, size);
        this.placeWaterTiles(start, size);
    }


    // Updating
    private animateWater(tick: number) {
        // Loop through all the water meshes
        for (const mesh of this.waterMeshes.getMeshes()) {
            const material = mesh.material as WaterTileMaterial;

            // Update the material
            material.updateAnimation(tick);
        }

    }

    public animateTiles(tick: number) {
        this.animateWater(tick);
    }

    // Disposing

    /** Disposed of the tiles and their instances */
    public dispose() {
        // Dispose of the meshes
        this.wallMeshes.dispose();

        // Dispose of the water meshes
        for (const mesh of Object.values(this.waterMeshes)) {
            if (mesh) mesh.dispose();
        }
        // Dispose of the floor mesh
        if (this.floorMesh) this.floorMesh.dispose();
        // Set the clearColor to black
        this.scene.clearColor = Color4.FromColor3(Color3.Black());
    }
}