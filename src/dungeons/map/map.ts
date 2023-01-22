import { Color3, Color4, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { DungeonTextures } from "../../data/dungeons";
import { FLOOR_IGNORE_TILES, FLOOR_INCLUDE_TILES, Tiles, WALL_IGNORE_TILES, WALL_INCLUDE_TILES } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { V2, V3, Vec2 } from "../../utils/vectors";
import { ByteGrid, DungeonGrid } from "./grid";
import { TileMeshContainer, WaterTileMaterial } from "./tilemesh";
import { FloorMesh } from "./floormesh";
import { Tilings } from "./tiling";

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
    private floor: FloorMesh;

    // Consts
    private static DEFAULT_BACKGROUND: [number, number, number] = [0, 0, 0];

    constructor(scene: Scene, path: string, map: DungeonGrid) {
        this.scene = scene;
        this.path = path;
        this.grid = map;
        this.wallMeshes = new TileMeshContainer();
        this.waterMeshes = new TileMeshContainer();
        this.floor = new FloorMesh(this.grid.width, this.grid.height);

        // Create a matrix to keep track of the loaded tiles
        this.loaded = new ByteGrid(map.width, map.height);
    }

    // ANCHOR Loading
    /** Creates all the specified tiles combinations for walls */
    private async createWallMeshes(tilings: Iterable<Tilings>) {
        // Load the image and time it
        const { textures, heightmaps, properties } = this.props;
        const variants = properties.variants.walls;

        for (const tiling of tilings) {
            // Skip it if it is already loaded
            if (this.wallMeshes.has(tiling)) continue;

            // If this tiling has a variant
            for (const variant of variants[tiling] ? variants[tiling] : [0]) {
                this.wallMeshes.createWallTileMesh(tiling, textures, heightmaps, this.scene, { variant });
            }
        }
    }
    /** Creates all the specified tiles combinations for water */
    private async createWaterMeshes(tilings: Iterable<Tilings>) {
        const { waterTextures, heightmaps, properties } = this.props;

        if (!properties.water) return;

        const waterSpeed = properties.water.speed ?? 10;
        const waterHeight = properties.water.height ?? 0.5;
        const waterLevel = properties.water.level ?? 0;

        const options = { waterSpeed, waterHeight, waterLevel };

        // Water meshs have no variants
        for (const tiling of tilings) {
            // Skip it if it is already loaded
            if (this.waterMeshes.has(tiling)) continue;

            this.waterMeshes.createWaterTileMesh(tiling, waterTextures as CanvasImageSource[], heightmaps, this.scene, options);
        }
    }
    /** Creates the tiles from the assets */
    public async preload() {
        // Load the properties
        this.props = await AssetsLoader.loadDungeonTextures(this.path);

        // Change the clear color to the one in the info
        const background = new Color3(
            ...this.props.properties.background ??
            DungeonMap.DEFAULT_BACKGROUND)
            .scale(1 / 255);

        // Create the background color
        this.scene.clearColor = Color4.FromColor3(background);
        // Create a plane lying under the floor
        this.createUnderPlane(background);

        // Get all the used tile combinations
        await this.createWallMeshes(this.grid.mapTilingsFor(Tiles.WALL, WALL_IGNORE_TILES, WALL_INCLUDE_TILES).getUniqueValues());

        // Get the water tilings
        await this.createWaterMeshes(this.grid.mapTilingsFor(Tiles.WATER).getUniqueValues());

        // Create the floor
        await this.floor.preloadTexture(this.path);
    }

    // ANCHOR Building
    private getBuildArea(start?: Vec2, size?: Vec2) {
        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);
        return [start, size];
    }

    private createUnderPlane(background: Color3) {
        const underplane = MeshBuilder.CreateGround("underfloor", {
            width: this.grid.width,
            height: this.grid.height,
            subdivisions: 1,
        }, this.scene);
        underplane.position = V3(
            this.grid.width / 2,
            -2,
            -this.grid.height / 2
        );
        const underPlaneMaterial = new StandardMaterial("underfloor_material", this.scene);
        underPlaneMaterial.diffuseColor = background;
        underPlaneMaterial.specularColor = Color3.Black();
        underplane.material = underPlaneMaterial;
    }

    private placeWallTiles(start?: Vec2, size?: Vec2) {
        [start, size] = this.getBuildArea(start, size);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(
            Tiles.WALL, WALL_IGNORE_TILES, WALL_INCLUDE_TILES, start, size);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings) {
            this.wallMeshes.instance(pos, tiling, this.loaded);
        }
    }

    private placeWaterTiles(start?: Vec2, size?: Vec2) {
        if (!this.props.properties.water) return;

        // Determine the area
        [start, size] = this.getBuildArea(start, size);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WATER, [], [], start, size);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings) {
            this.waterMeshes.instance(pos, tiling, this.loaded);
        }
    }

    /** Renders to screen the first tiles and builds the ground */
    public async build(pos: Vec2) {
        // Place the floor ground and time it
        const fstart = performance.now();
        this.floor.build(this.scene);
        const fend = performance.now();
        console.log(`Placed dungeon floor in ${(fend - fstart).toFixed(2)}ms`);

        // Place the tiles and time it
        const tstart = performance.now();
        this.buildView(pos);
        const tend = performance.now();
        console.log(`Placed dungeon tiles in ${tend - tstart}ms`);
    }

    /** Builds the map to fill the view with the position at the center */
    public async buildView(pos: Vec2) {
        // Get the start position
        const start = pos.subtract(TILE_VIEWPORT.scale(0.5).roundUp());
        const size = TILE_VIEWPORT;
        this.placeWallTiles(start, size);
        this.placeWaterTiles(start, size);
        this.floor.updateTexture(this.grid.mapTilingsFor(Tiles.FLOOR, FLOOR_IGNORE_TILES, FLOOR_INCLUDE_TILES, start, size), this.grid);
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

    public async setTile(pos: Vec2, tile: Tiles) {
        this.changeGridSection(pos, new ByteGrid(1, 1, new Uint8Array([tile])));
    }

    public async changeGridSection(start: Vec2, values: ByteGrid) {
        // Update the grid
        for (let x = start.x; x < start.x + values.width; x++)
            for (let y = start.y; y < start.y + values.height; y++)
                this.grid.set(x, y, values.get(x - start.x, y - start.y));

        // Calculate the new tilings for the portion of the grid
        const redoStart = start.subtract(V2(1, 1));
        const redoSize = V2(values.width + 2, values.height + 2);

        const wallGridTilings = this.grid.mapTilingsFor(Tiles.WALL, WALL_IGNORE_TILES, WALL_INCLUDE_TILES, redoStart, redoSize);
        const waterGridTilings = this.grid.mapTilingsFor(Tiles.WATER, [], [], redoStart, redoSize);

        // Load the meshes necessary
        await this.createWallMeshes(wallGridTilings.getUniqueValues());
        await this.createWaterMeshes(waterGridTilings.getUniqueValues());

        // Delete the old instances
        for (let x = redoStart.x; x < redoStart.x + redoSize.x; x++)
            for (let y = redoStart.y; y < redoStart.y + redoSize.y; y++) {
                this.wallMeshes.removeInstanceAt(V2(x, y));
                this.waterMeshes.removeInstanceAt(V2(x, y));
                this.loaded.set(x, y, 0);
            }

        // Create the new instances
        for (let x = redoStart.x; x < redoStart.x + redoSize.x; x++)
            for (let y = redoStart.y; y < redoStart.y + redoSize.y; y++) {
                const tile = this.grid.get(x, y);
                if (tile === Tiles.WALL || tile === Tiles.UNBREAKABLE_WALL)
                    this.wallMeshes.instance(V2(x, y), wallGridTilings.get(x, y), this.loaded);
                else if (tile === Tiles.WATER)
                    this.waterMeshes.instance(V2(x, y), waterGridTilings.get(x, y), this.loaded);
            }

        // Update the floor
        this.floor.updateTexture(this.grid.mapTilingsFor(Tiles.FLOOR, FLOOR_IGNORE_TILES, FLOOR_INCLUDE_TILES, redoStart, redoSize), this.grid);
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
        this.floor.dispose();
        // Set the clearColor to black
        this.scene.clearColor = Color4.FromColor3(Color3.Black());
    }
}