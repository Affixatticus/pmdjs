import { Constants, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { Tiles } from "../data/tiles";
import { AssetsLoader } from "../utils/assets_loader";
import Canvas from "../utils/canvas";
import Random from "../utils/random";
import { V2, Vec2 } from "../utils/vectors";
import { ByteGrid, DungeonGrid } from "./grid";
import { DungeonTiling, Tilings } from "./tiling";

const TILE_VIEWPORT = V2(24, 24);

type WallMesh = Mesh | Mesh[] | null;

export class DungeonScene {
    // Input
    private scene: Scene;
    private info: DungeonFloorInfo;
    private grid: DungeonGrid;

    // Processing
    private loaded!: ByteGrid;

    // Output
    private wallMeshes: Partial<Record<Tilings, WallMesh>>;
    private floorMesh!: Mesh;

    constructor(scene: Scene, info: DungeonFloorInfo, map: DungeonGrid) {
        this.scene = scene;
        this.info = info;
        this.grid = map;
        this.wallMeshes = {};
        // Create a matrix to keep track of the loaded tiles
        this.loaded = new ByteGrid(map.width, map.height);
    }

    // Loading

    /* Creates all the used tiles combinations */
    private async createWallMeshes(tilings: Iterable<Tilings>) {
        // Load the image and time it
        const start = performance.now();
        const { textures, heightmaps, properties } = await AssetsLoader.loadDungeonTextures(this.info.path);
        const variants = properties.variants.walls;

        for (const tiling of tilings) {
            // If this tiling has a variant
            if (variants[tiling])
                // Create all the variants
                for (let i = 0; i <= variants[tiling]; i++)
                    this.createWallMesh(tiling, textures, heightmaps, i);
            else
                this.createWallMesh(tiling, textures, heightmaps, 0);
        }

        const end = performance.now();
        console.log(`Loaded dungeon textures in ${end - start}ms`);
    }

    /** Used in creating a wall mesh from a heightmap and a texture */
    private createWallMesh(
        tiling: Tilings,
        textures: HTMLImageElement,
        heightmaps: HTMLImageElement,
        variant: number
    ): null | void {
        // Skip undefined tilings
        if (tiling === Tilings.UNDEFINED) return this.wallMeshes[tiling] = null;

        // Create the material
        const material = this.createMaterial(DungeonTiling.getWallsTexturesCrop(tiling, variant), textures);

        const heightmapURL = Canvas.createURL(heightmaps, ...DungeonTiling.getWallsHeightmapCrop(tiling));

        // Create the mesh
        const mesh = MeshBuilder.CreateGroundFromHeightMap(
            "ground_" + Tilings,
            heightmapURL, {
            width: 1,
            height: 1,
            subdivisions: 24,
            minHeight: 0,
            maxHeight: 1,
        }, this.scene);

        mesh.material = material;

        // Hide the mesh
        mesh.isVisible = true;
        mesh.renderingGroupId = 1;
        mesh.alwaysSelectAsActiveMesh = true;

        // Check if there is a mesh already
        if (this.wallMeshes[tiling]) {
            // If there already is a reference, add the new mesh to a new array
            if (Array.isArray(this.wallMeshes[tiling])) {
                (<WallMesh[]>this.wallMeshes[tiling]).push(mesh);
            } else {
                // If there is not an array, create one
                this.wallMeshes[tiling] = [<Mesh>this.wallMeshes[tiling], mesh];
            }
        }
        // If there is no mesh, just add it
        else {
            this.wallMeshes[tiling] = mesh;
        }
    }

    /** Used to create the material for a wall mesh */
    private createMaterial(params: [number, number, number, number], textures: HTMLImageElement) {
        const material = new StandardMaterial("material", this.scene);
        const url = Canvas.createURL(textures, ...params);
        material.diffuseTexture = new Texture(url, this.scene,
            true, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
        material.diffuseTexture.hasAlpha = true;
        material.diffuseTexture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        material.diffuseTexture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

        material.specularPower = 10000000;

        return material;
    }

    /** Creates the tiles from the assets */
    public async preload() {
        // Get all the used tile combinations
        const gridTilings = this.grid.mapTilingsFor(Tiles.WALL);

        // Change the clear color to the one in the info
        this.scene.clearColor = this.info.clearColor;

        // Get only the used tile combinations
        const usedTilings = gridTilings.getUniqueValues();

        await this.createWallMeshes(usedTilings);
    }

    // Building

    private instanceWallMesh(tiling: Tilings, pos: Vec2) {
        // Get the mesh
        const wallMesh = this.wallMeshes[tiling];

        // If there is no mesh, skip
        if (!wallMesh) return;

        // If there is an array, pick a random mesh
        const mesh = Array.isArray(wallMesh) ? Random.randomChoice(wallMesh) : wallMesh;

        // Create the instance's matrix
        const matrix = Matrix.Translation(
            ...pos.translate(0.5).toVec3().gameFormat.spread()
        );
        // Create a new thin instance
        mesh?.thinInstanceAdd(matrix);

        // Update the loaded matrix at the pos
        this.loaded.set(pos.x, pos.y, 1);
    }

    private placeWallTile(pos: Vec2, tiling: Tilings, update: boolean = false) {
        // If the tile is already loaded, skip it
        if (!update && this.loaded.get(pos.x, pos.y) === 1) return;

        // Create the mesh
        this.instanceWallMesh(tiling, pos);
    }

    private placeWallTiles(start?: Vec2, size?: Vec2) {
        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WALL);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.placeWallTile(pos, tiling);
        }
    }

    private createFloorMaterial(texture: HTMLImageElement, variants: Record<number, number>): StandardMaterial {
        const material = new StandardMaterial("material", this.scene);

        const ctx = Canvas.create(this.grid.width * 24, this.grid.height * 24);

        // Draw the textures on the ctx
        const gridTilings = this.grid.mapTilingsFor(Tiles.FLOOR);
        for (const [pos, tiling] of gridTilings) {
            // Determine if this tile has a variant
            const variant = variants[tiling] ?? 0;

            const params = DungeonTiling.getFloorCrop(tiling, Random.randint(variant));
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

    private createFloorMesh(): Mesh {
        if (this.floorMesh) return this.floorMesh;

        const mesh = MeshBuilder.CreateGround("ground", {
            width: this.grid.width,
            height: this.grid.height,
            subdivisionsX: this.grid.width,
            subdivisionsY: this.grid.height,
        }, this.scene);

        // Adjust the position
        mesh.position.set(...V2(this.grid.width / 2, this.grid.height / 2).toVec3().gameFormat.spread());

        // Resolve z-fighting
        mesh.renderingGroupId = 0;

        return mesh;
    }

    private async buildFloor() {
        const { textures, properties } = await AssetsLoader.loadDungeonTextures(this.info.path);

        const material = this.createFloorMaterial(textures, properties.variants.floor);
        const mesh = this.createFloorMesh();
        mesh.material = material;
        return mesh;
    }

    /** Renders to screen the first tiles and builds the ground */
    public async firstBuild(pos: Vec2) {
        // Place the tiles and time it
        const tstart = performance.now();
        const tend = performance.now();
        this.buildAt(pos);
        console.log(`Placed dungeon tiles in ${tend - tstart}ms`);

        // Place the floor tiles and time it
        const fstart = performance.now();
        this.floorMesh = await this.buildFloor();
        const fend = performance.now();
        console.log(`Placed dungeon floor tiles in ${fend - fstart}ms`);
    }

    /** Builds the map to fill the view with the position at the center */
    public async buildAt(pos: Vec2) {
        // Get the start position
        const start = pos.subtract(TILE_VIEWPORT.scale(0.5).roundUp());
        const size = TILE_VIEWPORT;
        this.placeWallTiles(start, size);
    }

    // Disposing

    /** Disposed of the tiles and their instances */
    public dispose() {
        // Dispose of the meshes
        // for (const mesh of Object.values(this.wallMeshes)) {
        //     mesh?.dispose();
        // }
    }
}