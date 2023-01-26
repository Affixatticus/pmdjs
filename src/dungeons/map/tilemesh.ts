import { StandardMaterial, Texture, Scene, Constants, Mesh, GroundMesh, MeshBuilder, Matrix } from "@babylonjs/core";
import { Tile } from "../../data/tiles";
import Canvas, { CropParams } from "../../utils/canvas";
import { fillOutStandardOptions } from "../../utils/material";
import { Vec2, V3 } from "../../utils/vectors";
import { RenderingGroupId } from "../floor";
import { ByteGrid } from "./grid";
import { Tiling, DungeonTiling, TilingTextureMode } from "./tiling";

const TILEMESH_SUBDIVISIONS = 6;

export type MeshGroup = TileMesh | Map<number, TileMesh> | null;
export type MeshInstance = [instance: number, tiling: Tiling, variant: number];

// Tilemesh materials
export class WaterTileMaterial extends StandardMaterial {
    private textures: Texture[] = [];
    private texturesCount: number;
    private animationTime: number;

    constructor(name: string, sources: CanvasImageSource[], animationTime: number, params: CropParams, scene: Scene) {
        super(name, scene);
        this.texturesCount = sources.length;
        this.animationTime = animationTime;

        this.generateTextures(scene, sources, params);
        this.setTexture(0);
        fillOutStandardOptions(this);
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

export class TileMaterial extends StandardMaterial {
    constructor(name: string, params: CropParams, textures: CanvasImageSource, scene: Scene) {
        super(name, scene);

        const texture = Canvas.toDynamicTexture(textures, scene, ...params);
        this.diffuseTexture = texture;
        fillOutStandardOptions(this);

    }
}

// Tile mesh containers
export class TileMeshContainer {
    public list: Partial<Record<Tiling, MeshGroup>>;
    /** List of the positioned instances indexed by position */
    public instances!: Record<string, MeshInstance>;

    constructor() {
        this.list = { [Tiling.BLANK]: null };
        this.instances = {};
    }

    // Tile Meshes
    /** Adds a mesh to the container */
    public add(tiling: Tiling, mesh: TileMesh, variant: number = 0) {
        if (this.list[tiling] instanceof TileMesh) {
            // If there already is a reference, add the new mesh to a new array
            const oldMesh = this.list[tiling] as TileMesh;
            const map = new Map<number, TileMesh>();
            map.set(oldMesh.variant, oldMesh);
            map.set(variant, mesh);
            this.list[tiling] = map;
        } else if (this.list[tiling] instanceof Map) {
            // If there already is a map, add the new mesh to it
            (this.list[tiling] as Map<number, TileMesh>)?.set(variant, mesh);
        }
        // If there is no mesh, just add it
        else {
            this.list[tiling] = mesh;
        }
    }

    /** Gets the specified variant of a tile if it exists */
    public get(tiling: Tiling, variant: number = 0): TileMesh | null {
        if (this.list[tiling] instanceof TileMesh) {
            return this.list[tiling] as TileMesh;
        } else if (this.list[tiling] instanceof Map) {
            return (this.list[tiling] as Map<number, TileMesh>)?.get(variant) ?? null;
        } else return null;
    }

    public has(tiling: Tiling) {
        return this.list[tiling] !== undefined;
    }

    /** Gets a tiling variant for placing */
    public getVariantForPlacing(tiling: Tiling, pos: Vec2): TileMesh | null {
        const meshGroup = this.list[tiling]!;
        if (!meshGroup) return null;
        if (meshGroup instanceof TileMesh) return meshGroup;

        // Get all the keys for the meshgroup
        // const rand = Random.int(7);
        const rand = pos.getHashCode() % 7;

        if (rand == 1 && meshGroup.has(2))
            return meshGroup.get(2) ?? null;
        if (rand <= 2 && meshGroup.has(1))
            return meshGroup.get(1) ?? null;

        return meshGroup.get(0) ?? null;
    }

    /** Returns all the meshgroups */
    public *[Symbol.iterator]() {
        for (const key of Object.keys(this.list)) {
            const tiling = parseInt(key) as Tiling;
            yield [tiling, this.list[tiling]] as [Tiling, MeshGroup];
        }
    }

    /** Gets all the meshes, basically all MeshGroups flattened */
    public *getMeshes() {
        for (const [, tileMesh] of this) {
            if (tileMesh instanceof TileMesh) {
                yield tileMesh.mesh;
            } else if (tileMesh instanceof Map) {
                for (const [, mesh] of tileMesh) {
                    yield mesh.mesh;
                }
            }
        }
    }

    public dispose() {
        for (const mesh of this.getMeshes()) { mesh.dispose() }
    }

    public createWallTileMesh(tiling: Tiling, texture: CanvasImageSource, heightmap: CanvasImageSource, scene: Scene,
        options: {
            variant: number, generateMaterial?: boolean, height?: number
        } = { variant: 0, generateMaterial: true, height: 1 }) {
        if (tiling === Tiling.BLANK) return;
        this.add(tiling, new WallTileMesh(tiling, texture, heightmap, scene, options), options.variant);
    }

    public createWaterTileMesh(tiling: Tiling, textures: CanvasImageSource[], heightmap: CanvasImageSource, scene: Scene, options: {
        waterHeight: number, waterSpeed: number, waterLevel: number
    } = { waterHeight: 0.5, waterSpeed: 0.1, waterLevel: -0.5 }) {
        if (tiling === Tiling.BLANK) return;
        this.add(tiling, new WaterTileMesh(tiling, textures, heightmap, scene, options), 0);
    }

    // Instances
    /** Creates an instance of the given tiling, and places it at the given coordinates */
    public instance(pos: Vec2, tiling: Tiling, loaded: ByteGrid | null, height = 0) {
        if (tiling === Tiling.BLANK) return;

        // If the tile is not loaded, or the loaded grid doesn't exist
        if (!loaded || loaded.get(pos) === 0) {
            const tileMesh = this.getVariantForPlacing(tiling, pos);
            if (tileMesh === null) return;
            // Create the instance
            const instanceId = tileMesh.instance(pos, height);
            // Add it to the list of instances
            this.instances[pos.toString()] = [instanceId, tileMesh.tiling, tileMesh.variant];
            // Update the loaded grid if it exists
            loaded?.set(pos, 1);
        }
    }

    public getInstances(tiling: Tiling, variant: number = 0): MeshInstance[] {
        return Object.values(this.instances).filter(([_, t, v]) => t === tiling && v === variant);
    }

    public getInstanceAt(pos: Vec2): MeshInstance | null {
        return this.instances[pos.toString()] ?? null;
    }

    public removeInstanceAt(pos: Vec2) {
        const instance = this.getInstanceAt(pos);
        if (instance === null) return;

        const [instanceId, tiling, variant] = instance;
        const tileMesh = this.get(tiling, variant);
        if (tileMesh === null) return;

        tileMesh.mesh.thinInstanceSetMatrixAt(instanceId, new Matrix());
        delete this.instances[pos.toString()];
    }
}

// Tile meshes
export abstract class TileMesh {
    public abstract mesh: Mesh;
    public abstract material: TileMaterial;
    public abstract tiling: Tiling;
    public abstract variant: number;

    public abstract instance(pos: Vec2, height?: number): number;

    constructor() { }
}

export class WallTileMesh extends TileMesh {
    public mesh: GroundMesh;
    public material!: TileMaterial;
    public tiling: Tiling;
    public variant: number;

    constructor(tiling: Tiling, texture: CanvasImageSource, heightmap: CanvasImageSource, scene: Scene,
        options: {
            variant: number, height?: number
        } = { variant: 0, height: 1 }) {
        super();
        this.tiling = tiling;
        this.variant = options?.variant ?? 0;

        const heightmapURL = Canvas.createURL(heightmap, ...this.getHeightmapCrop());

        // Create the mesh
        this.mesh = MeshBuilder.CreateGroundFromHeightMap(
            "ground_" + this.getId(),
            heightmapURL, {
            width: 1,
            height: 1,
            subdivisions: TILEMESH_SUBDIVISIONS,
            minHeight: 0,
            maxHeight: options.height ?? 1,
        }, scene);
        this.mesh.isVisible = true;
        this.mesh.renderingGroupId = RenderingGroupId.WALL;
        this.mesh.alwaysSelectAsActiveMesh = true;

        // Create the material
        this.material = new TileMaterial("material_" + this.getId(), this.getTextureCrop(), texture, scene);
        this.mesh.material = this.material;

    }

    public getTextureCrop() {
        return DungeonTiling.getCrop(this.tiling, Tile.WALL, this.variant, TilingTextureMode.TEXTURE);
    }
    public getHeightmapCrop() {
        return DungeonTiling.getCrop(this.tiling, Tile.WALL, 0, TilingTextureMode.HEIGHTMAP);
    }

    public getId() {
        return this.tiling + "_" + this.variant;
    }

    public instance(pos: Vec2, height = 0): number {
        // Create the instance's matrix
        const matrix = Matrix.Translation(
            ...pos.move(0.5).toVec3(height).gameFormat.spread()
        );
        // Create a new thin instance
        return this.mesh.thinInstanceAdd(matrix);
    }
}

export class WaterTileMesh extends TileMesh {
    public mesh: GroundMesh;
    public material: WaterTileMaterial;
    public tiling: Tiling;
    public variant: number;

    public waterHeight: number;
    public waterLevel: number;
    public waterSpeed: number;

    constructor(tiling: Tiling, textures: CanvasImageSource[], heightmap: CanvasImageSource, scene: Scene, options: {
        waterHeight: number, waterSpeed: number, waterLevel: number
    } = { waterHeight: 0.5, waterSpeed: 0.1, waterLevel: 0 }) {
        super();
        this.waterHeight = options.waterHeight;
        this.waterSpeed = options.waterSpeed;
        this.waterLevel = options.waterLevel;
        this.tiling = tiling;
        this.variant = 0;

        const heightmapURL = Canvas.createURL(heightmap, ...this.getHeightmapCrop());

        // Create the mesh
        this.mesh = MeshBuilder.CreateGroundFromHeightMap(
            "water_" + this.getId(),
            heightmapURL, {
            width: 1,
            height: 1,
            subdivisions: 24,
            minHeight: 0,
            maxHeight: this.waterHeight,
        }, scene);

        this.mesh.isVisible = true;
        this.mesh.alwaysSelectAsActiveMesh = true;

        this.mesh.renderingGroupId = RenderingGroupId.FLOOR;
        this.material = new WaterTileMaterial("material_" + this.getId(), textures, this.waterSpeed, this.getTextureCrop(), scene);
        this.mesh.material = this.material;
    }

    public instance(pos: Vec2, height = 0): number {
        // Create the instance's matrix
        const matrix = Matrix.Translation(
            ...pos.move(0.5).toVec3(height).gameFormat.add(V3(0, this.waterLevel, 0)).spread()
        );
        // Create a new thin instance
        return this.mesh?.thinInstanceAdd(matrix);
    }

    public getId() {
        return this.tiling;
    }

    public getTextureCrop() {
        return DungeonTiling.getCrop(this.tiling, Tile.WATER, this.variant, TilingTextureMode.TEXTURE);
    }

    public getHeightmapCrop() {
        return DungeonTiling.getCrop(this.tiling, Tile.WATER, 0, TilingTextureMode.HEIGHTMAP);
    }
}
