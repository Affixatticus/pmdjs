import { Color3, Color4, Constants, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DungeonTextures } from "../../data/dungeons";
import { Tiles } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import Canvas, { CropParams } from "../../utils/canvas";
import Random from "../../utils/random";
import { V2, V3, Vec2 } from "../../utils/vectors";
import { TileRenderingGroupIds } from "../floor";
import { ByteGrid, DungeonGrid } from "./grid";
import { DungeonTiling, Tilings, TilingTextureMode } from "./tiling";

const TILE_VIEWPORT = V2(24, 24);

type MeshGroup = Mesh | Map<number, Mesh> | null;

class WaterTileMaterial extends StandardMaterial {
    private textures: Texture[] = [];
    private texturesCount: number;
    private animationTime: number;


    constructor(name: string, sources: CanvasImageSource[], animationTime: number, params: CropParams, scene: Scene) {
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

    private generateTextures(scene: Scene, sources: CanvasImageSource[], params: CropParams) {
        for (let i = 0; i < this.texturesCount; i++) {
            const texture = Canvas.toDynamicTexture(sources[i], scene, ...params);

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
    private path: string;
    private grid: DungeonGrid;

    // Processing
    private loaded!: ByteGrid;
    private props!: DungeonTextures;

    // Output
    private wallMeshes: Partial<Record<Tilings, MeshGroup>>;
    private waterMeshes: Partial<Record<Tilings, Mesh | null>>;
    private floorMesh!: Mesh;


    private static DEFAULT_BACKGROUND: [number, number, number] = [0, 0, 0];

    constructor(scene: Scene, path: string, map: DungeonGrid) {
        this.scene = scene;
        this.path = path;
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
        const { textures, heightmaps, properties } = this.props;
        const variants = properties.variants.walls;

        let avg = 0;
        let avgCnt = 0;

        for (const tiling of tilings) {
            const astart = performance.now();
            // If this tiling has a variant
            if (variants[tiling])
                // Create all the variants
                for (const variant of variants[tiling])
                    this.createMesh(tiling, textures, heightmaps, Tiles.WALL, variant);
            else
                this.createMesh(tiling, textures, heightmaps, Tiles.WALL, 0);
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

        const animationTime = properties.water.speed;

        // Water meshs have no variants
        for (const tiling of tilings) {
            this.createWaterMesh(tiling, waterTextures as CanvasImageSource[], heightmaps, animationTime ?? 0);
        }

        const end = performance.now();
        console.log(`Loaded dungeon water textures in ${(end - start).toFixed(2)}ms`);
    }

    /** Used in creating a wall mesh from a heightmap and a texture */
    private createMesh(
        tiling: Tilings,
        textures: CanvasImageSource,
        heightmaps: CanvasImageSource,
        tile: Tiles,
        variant: number = 0,
        container: Partial<Record<Tilings, MeshGroup>> = this.wallMeshes,
        createMaterial: boolean = true,
        heightmapMaxHeight: number = 1
    ): null | void | Mesh {
        // Skip undefined tilings
        if (tiling === Tilings.UNDEFINED) return this.wallMeshes[tiling] = null;

        const heightmapURL = Canvas.createURL(heightmaps, ...DungeonTiling.getCrop(tiling, tile));

        // Create the mesh
        // Time
        const mesh = MeshBuilder.CreateGroundFromHeightMap(
            "ground_" + Tilings,
            heightmapURL, {
            width: 1,
            height: 1,
            subdivisions: 24,
            minHeight: 0,
            maxHeight: heightmapMaxHeight,
        }, this.scene);


        // Time it
        if (createMaterial) {
            // Create the material
            const material = this.createMaterial(DungeonTiling.getCrop(tiling, tile, variant, TilingTextureMode.TEXTURE), textures);
            mesh.material = material;
        }

        // Hide the mesh
        mesh.isVisible = true;
        mesh.renderingGroupId = TileRenderingGroupIds.WALL;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.name = "wall_" + tiling + "_" + variant;

        // Check if there is a mesh already
        if (container[tiling] instanceof Mesh) {
            // If there already is a reference, add the new mesh to a new array
            const oldMesh = container[tiling] as Mesh;
            const map = new Map<number, Mesh>();
            map.set(0, oldMesh);
            map.set(variant, mesh);
            container[tiling] = map;
        } else if (container[tiling] instanceof Map) {
            // If there already is a map, add the new mesh to it
            (container[tiling] as Map<number, Mesh>)?.set(variant, mesh);
        }
        // If there is no mesh, just add it
        else {
            container[tiling] = mesh;
        }

        return mesh;
    }

    /** Used to create the material for a wall mesh */
    private createMaterial(params: CropParams, textures: CanvasImageSource) {
        const material = new StandardMaterial("material", this.scene);
        // const url = Canvas.createURL(textures, ...params);

        const texture = Canvas.toDynamicTexture(textures, this.scene, ...params);

        material.diffuseTexture = texture;
        material.diffuseTexture.hasAlpha = true;
        material.diffuseTexture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        material.diffuseTexture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

        material.specularPower = 10000000;

        return material;
    }

    /** Creates a generic mesh, then updates its material to be animatable */
    private createWaterMesh(tiling: Tilings, textures: CanvasImageSource[], heightmap: CanvasImageSource, animationTime: number) {
        if (!this.props.properties.water) return;

        // Skip undefined tilings
        if (tiling === Tilings.UNDEFINED) return this.waterMeshes[tiling] = null;
        // textures[0] is unused
        const mesh = this.createMesh(tiling, textures[0], heightmap, Tiles.WATER, 0, this.waterMeshes, false, this.props.properties.water.height);
        if (!mesh) return;

        mesh.renderingGroupId = TileRenderingGroupIds.WATER;

        const material = new WaterTileMaterial("water_material", textures, animationTime,
            DungeonTiling.getCrop(tiling, Tiles.WATER, 0, TilingTextureMode.TEXTURE), this.scene);
        mesh.material = material;

        return mesh;
    }

    /** Creates the tiles from the assets */
    public async preload() {
        // Load the properties
        this.props = await AssetsLoader.loadDungeonTextures(this.path);

        // Change the clear color to the one in the info
        const background = this.props.properties.background ?? DungeonScene.DEFAULT_BACKGROUND;
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

    private chooseVariantMesh(meshGroup: MeshGroup) {
        if (meshGroup instanceof Mesh) return meshGroup;

        const map = <Map<number, Mesh>>meshGroup;

        // Get all the keys for the meshgroup
        const rand = Random.int(7);
        if (rand == 1 && map.has(2))
            return map.get(2);
        if (rand <= 2 && map.has(1))
            return map.get(1);

        return map.get(0);
    }

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

    /** Places a random WallMesh corresponding to a tiling in the given position */
    private instanceMesh(tiling: Tilings, pos: Vec2, meshes: Partial<Record<Tilings, MeshGroup>>, yOffset: number) {
        // Get the mesh
        const meshGroup = meshes[tiling];

        // If there is no mesh, skip
        if (!meshGroup) return;

        // If there is an array, pick a random mesh
        const mesh = this.chooseVariantMesh(meshGroup);

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
        if (!this.props.properties.water) return;

        // Determine the area
        start = start ?? V2(0, 0);
        size = size ?? V2(this.grid.width, this.grid.height).subtract(start);

        // Get the map as a list of tilings
        const gridTilings = this.grid.mapTilingsFor(Tiles.WATER);

        // Loop through the tilings
        for (const [pos, tiling] of gridTilings.iterGrid(start, size)) {
            this.placeTile(pos, tiling, false, this.waterMeshes, this.props.properties.water.level);
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
        for (const mesh of Object.values(this.wallMeshes)) {
            if (!mesh) continue;
            if (mesh instanceof Mesh) mesh.dispose();
            else if (mesh instanceof Map) for (const m of mesh.values()) m.dispose();
        }
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