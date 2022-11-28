import { Constants, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { Tiles } from "../data/tiles";
import { AssetsLoader } from "../utils/assets_loader";
import Canvas from "../utils/canvas";
import Random from "../utils/random";
import { V2, V3, Vec2 } from "../utils/vectors";
import { ByteGrid, DungeonGrid } from "./grid";
import { DungeonTiling, Tilings, TilingTextureMode } from "./tiling";

const TILE_VIEWPORT = V2(24, 24);

type MeshGroup = Mesh | Mesh[] | null;

enum TileRenderingGroupIds {
    WATER,
    FLOOR,
    WALL,
};

class WaterTileMaterial extends StandardMaterial {
    private textures: Texture[] = [];
    private texturesCount: number;
    private animationTime: number;


    constructor(name: string, sources: CanvasImageSource[], animationTime: number, params: [number, number, number, number], scene: Scene) {
        super(name, scene);
        this.texturesCount = sources.length;
        this.animationTime = animationTime;

        this.generateTextures(scene, sources, params);
        this.setTexture(0);
    }


    public setTexture(index: number) {
        if (index > this.texturesCount || index < 0) return;

        this.diffuseTexture = this.textures[index];
    }

    public updateAnimation(tick: number) {
        if (tick % this.animationTime === 0) {
            const index = (tick / this.animationTime) % this.texturesCount;
            this.setTexture(index);
        }
    }

    private generateTextures(scene: Scene, sources: CanvasImageSource[], params: [number, number, number, number]) {
        for (let i = 0; i < this.texturesCount; i++) {
            const url = Canvas.createURL(sources[i], ...params);
            const texture = new Texture(url, scene,
                true, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);

            texture.hasAlpha = true;
            texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
            texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

            this.textures.push(texture);
        }
    }
}

export class DungeonScene {
    // Input
    private scene: Scene;
    private info: DungeonFloorInfo;
    private grid: DungeonGrid;

    // Processing
    private loaded!: ByteGrid;

    // Output
    private wallMeshes: Partial<Record<Tilings, MeshGroup>>;
    private waterMeshes: Partial<Record<Tilings, Mesh | null>>;
    private floorMesh!: Mesh;

    constructor(scene: Scene, info: DungeonFloorInfo, map: DungeonGrid) {
        this.scene = scene;
        this.info = info;
        this.grid = map;
        this.wallMeshes = {};
        this.waterMeshes = {};
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
                    this.createMesh(tiling, textures, heightmaps, Tiles.WALL, i);
            else
                this.createMesh(tiling, textures, heightmaps, Tiles.WALL, 0);
        }

        const end = performance.now();
        console.log(`Loaded dungeon textures in ${end - start}ms`);
    }

    /** Creates all the tiles used for water */
    private async createWaterMeshes(tilings: Iterable<Tilings>) {
        const start = performance.now();
        const { waterTextures, heightmaps, properties } = await AssetsLoader.loadDungeonTextures(this.info.path);
        const animationTime = properties.water.speed;

        // Water meshs have no variants
        for (const tiling of tilings) {
            this.createWaterMesh(tiling, waterTextures, heightmaps, animationTime);
        }

        const end = performance.now();
        console.log(`Loaded dungeon water textures in ${end - start}ms`);
    }

    /** Used in creating a wall mesh from a heightmap and a texture */
    private createMesh(
        tiling: Tilings,
        textures: CanvasImageSource,
        heightmaps: CanvasImageSource,
        tile: Tiles,
        variant: number = 0,
        container: Partial<Record<Tilings, MeshGroup>> = this.wallMeshes,
        createMaterial: boolean = true
    ): null | void | Mesh {
        // Skip undefined tilings
        if (tiling === Tilings.UNDEFINED) return this.wallMeshes[tiling] = null;

        const heightmapURL = Canvas.createURL(heightmaps, ...DungeonTiling.getCrop(tiling, tile));

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

        if (createMaterial) {
            // Create the material
            const material = this.createMaterial(DungeonTiling.getCrop(tiling, tile, variant, TilingTextureMode.TEXTURE), textures);

            mesh.material = material;
        }

        // Hide the mesh
        mesh.isVisible = true;
        mesh.renderingGroupId = TileRenderingGroupIds.WALL;
        mesh.alwaysSelectAsActiveMesh = true;

        // Check if there is a mesh already
        if (container[tiling]) {
            // If there already is a reference, add the new mesh to a new array
            if (Array.isArray(container[tiling])) {
                (<MeshGroup[]>container[tiling]).push(mesh);
            } else {
                // If there is not an array, create one
                container[tiling] = [<Mesh>container[tiling], mesh];
            }
        }
        // If there is no mesh, just add it
        else {
            container[tiling] = mesh;
        }

        return mesh;
    }

    /** Used to create the material for a wall mesh */
    private createMaterial(params: [number, number, number, number], textures: CanvasImageSource) {
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

    /** Creates a generic mesh, then updates its material to be animatable */
    private createWaterMesh(tiling: Tilings, textures: CanvasImageSource[], heightmap: CanvasImageSource, animationTime: number) {
        // Skip undefined tilings
        if (tiling === Tilings.UNDEFINED) return this.waterMeshes[tiling] = null;
        // textures[0] is unused
        const mesh = this.createMesh(tiling, textures[0], heightmap, Tiles.WATER, 0, this.waterMeshes, false);
        if (!mesh) return;

        mesh.renderingGroupId = TileRenderingGroupIds.WATER;

        const material = new WaterTileMaterial("water_material", textures, animationTime,
            DungeonTiling.getCrop(tiling, Tiles.WATER, 0, TilingTextureMode.TEXTURE), this.scene);
        mesh.material = material;

        return mesh;
    }

    /** Creates the tiles from the assets */
    public async preload() {
        // Change the clear color to the one in the info
        this.scene.clearColor = this.info.clearColor;

        // Get all the used tile combinations
        await this.createWallMeshes(this.grid.mapTilingsFor(Tiles.WALL).getUniqueValues());

        // Get the water tilings
        await this.createWaterMeshes(this.grid.mapTilingsFor(Tiles.WATER).getUniqueValues());
    }

    // Building

    /** Places a random WallMesh corresponding to a tiling in the given position */
    private instanceMesh(tiling: Tilings, pos: Vec2, meshes: Partial<Record<Tilings, MeshGroup>>, yOffset: number) {
        // Get the mesh
        const meshGroup = meshes[tiling];

        // If there is no mesh, skip
        if (!meshGroup) return;

        // If there is an array, pick a random mesh
        const mesh = Array.isArray(meshGroup) ? Random.randomChoice(meshGroup) : meshGroup;

        // Create the instance's matrix
        const matrix = Matrix.Translation(
            ...pos.move(0.5).toVec3().gameFormat.add(V3(0, yOffset, 0)).spread()
        );
        // Create a new thin instance
        mesh?.thinInstanceAdd(matrix);

        // Update the loaded matrix at the pos
        this.loaded.set(pos.x, pos.y, 1);
    }

    /** Places a tiling */
    private placeTile(
        pos: Vec2,
        tiling: Tilings,
        forceUpdate: boolean = false,
        meshes: Partial<Record<Tilings, MeshGroup>> = this.wallMeshes,
        yOffset: number = 0) {
        // If the tile is already loaded, skip it
        if (!forceUpdate && this.loaded.get(pos.x, pos.y) === 1) return;

        // Create the mesh
        this.instanceMesh(tiling, pos, meshes, yOffset);
    }

    private placeWallTiles(start?: Vec2, size?: Vec2) {
        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WALL);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.placeTile(pos, tiling);
        }
    }

    private placeWaterTiles(start?: Vec2, size?: Vec2) {
        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WATER);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.placeTile(pos, tiling, false, this.waterMeshes, -0.85);
        }
    }

    /** Creates the floor's material, does not need updating */
    private createFloorMaterial(texture: CanvasImageSource, variants: Record<number, number>): StandardMaterial {
        const material = new StandardMaterial("material", this.scene);

        const ctx = Canvas.create(this.grid.width * 24, this.grid.height * 24);

        // Draw the textures on the ctx
        const gridTilings = this.grid.mapTilingsFor(Tiles.FLOOR, [Tiles.WATER]);
        for (const [pos, tiling] of gridTilings) {
            // Determine if this tile has a variant
            const variant = variants[tiling] ?? 0;

            let myTiling = tiling;
            if (tiling === Tilings.UNDEFINED)
                // If the tile doesn't have a water tile, use the CENTER_FULL
                if (this.grid.get(...pos.spread()) !== Tiles.WATER)
                    myTiling = Tilings.CENTER_FULL;

            const params = DungeonTiling.getCrop(
                myTiling,
                Tiles.FLOOR, Random.randint(variant), TilingTextureMode.TEXTURE);
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
        mesh.renderingGroupId = TileRenderingGroupIds.FLOOR;

        return mesh;
    }

    /** Builds the floor GroundMesh from the group up */
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

        // Place the floor ground and time it
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
        this.placeWaterTiles(start, size);
    }


    // Updating

    private animateWater(tick: number) {
        // Loop through all the water meshes
        for (const mesh of Object.values(this.waterMeshes)) {
            // If there is no mesh, skip it
            if (!mesh) continue;

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
        // for (const mesh of Object.values(this.wallMeshes)) {
        //     mesh?.dispose();
        // }
    }
}