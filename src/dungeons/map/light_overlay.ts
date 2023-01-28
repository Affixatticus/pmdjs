import { Constants, DynamicTexture, Scene, SpotLight } from "@babylonjs/core";
import { Tile } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { CropParams } from "../../utils/canvas";
import { V3, Vec3 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";
import { DungeonPokemon } from "../objects/pokemon";
import { DungeonGrid, OffsetGrid } from "./grid";
import { DungeonTiling, TilingTextureMode } from "./tiling";

const LMS = 24; // Light map size
const LMSS = Math.round(LMS / 6); // Light map size start
const LMT = 16; // Light map tile size

export enum LightOverlayColor {
    /** Black */
    BLACK = 0,
    /** White */
    WHITE = 1,
};

/** Places lights over each of the tiles of the visible map */
export class LightOverlay {
    private scene: Scene;
    /** The lightmap image, imported just once */
    private lightMapTileset!: CanvasImageSource;
    /** List of lights that are waiting to be turned off */
    private queue: [light: SpotLight, texture: DynamicTexture, reachedMaxIntensity: boolean][] = [];

    private lastOffsetGrid!: OffsetGrid | null;

    public intensity = 1;

    public isEnabled: boolean;

    constructor(scene: Scene) {
        this.scene = scene;
        this.isEnabled = true;
    }

    /** Loads the texture for the overlay */
    public async init() {
        this.lightMapTileset = await AssetsLoader.loadLightmap();
        this.lastOffsetGrid = null;
    }

    /** Updates the queue */
    public update() {
        if (!this.isEnabled) return;

        // Decrease towards 0 all the lights that are not the last one
        // And remove the lights that are completely off
        for (let i = this.queue.length - 2; i >= 0; i--) {
            const [light, texture] = this.queue[i];
            light.intensity =
                Math.max(0,
                    light.intensity -=
                    this.intensity * (1 / DungeonPokemon.walkingTicks) * DungeonPokemon.animationSpeed);
            if (light.intensity === 0) {
                light.dispose();
                texture.dispose();
                this.queue.splice(i, 1);
            }
        }

        if (this.queue.length === 0) return;

        // Increase the last light
        const last = this.queue[this.queue.length - 1];
        const [light, _, reachedMaxIntensity] = last;

        if (!reachedMaxIntensity) {
            light.intensity =
                Math.min(this.intensity,
                    light.intensity +=
                    this.intensity * (1 / DungeonPokemon.walkingTicks) * DungeonPokemon.animationSpeed);
            if (light.intensity === 1)
                last[2] = true;
        }
    }

    public dispose() {
        for (const [light, texture] of this.queue) {
            light?.dispose();
            texture?.dispose();
        }
    }

    /** Turns on the lights around the specified pokemon */
    public lightPokemon(floor: DungeonFloor, pokemon: DungeonPokemon) {
        // Return if lightOverlay is disabled
        if (!this.isEnabled) return;
        // Get the current offsetGrid
        const offsetGrid = floor.getActionArea(pokemon.nextTurnPosition);
        // Exit if the offsetGrid is the same as the last one
        if (this.lastOffsetGrid?.equals(offsetGrid)) return;
        // Save the last offsetGrid
        this.lastOffsetGrid = offsetGrid;

        const isCorridor = floor.grid.isCorridor(pokemon.nextTurnPosition);
        this.placeSpotlight(isCorridor ? offsetGrid.inflate(1) : offsetGrid);
    }

    /** Places a spotlight given an area */
    private placeSpotlight(area: OffsetGrid) {
        // Get the size of the area
        const width = area.width;
        const height = area.height;

        // Get a square that encloses the area
        const size = Math.max(width, height);

        // Get the tilings grid
        const tilings = new DungeonGrid(width, height, area.data).mapTilingsFor(
            LightOverlayColor.WHITE, [], []
        );

        // Create a texture for the light
        const texture = new DynamicTexture("overlay_texture",
            { width: size * LMS, height: size * LMS }, this.scene,
            true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);

        // Create a canvas to draw on
        const ctx = texture.getContext() as CanvasRenderingContext2D;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, size * LMS, size * LMS);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const tiling = tilings.getXY(x, y);
                const params: CropParams = DungeonTiling.getCrop(tiling, Tile.WALL, 0, TilingTextureMode.TEXTURE);

                // Draw the light map
                ctx.drawImage(this.lightMapTileset, ...params, x * LMT + size * LMSS, y * LMT + size * LMSS, LMT, LMT);
            }
        }

        texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.update();

        // Place the light
        const position = area.getActualPosition(0, 0).toVec3()
            .add(V3(size / 2, size * 16 - (size > 10 ? size / 100 : 0), size / 2)).gameFormat;

        const light = new SpotLight("light", position, Vec3.Down(), (Math.PI * 3) / 100, 0, this.scene);
        light.intensity = 0;
        light.projectionTexture = texture;

        // Add a new light to the list of lights to animate
        this.addLight(light, texture);
    }

    /** Adds a light to the queue */
    private addLight(light: SpotLight, texture: DynamicTexture) {
        if (this.queue.length === 3) {
            // Remove the first light
            const [firstLight, firstTexture] = this.queue.shift()!;
            firstLight.dispose();
            firstTexture.dispose();
        }
        this.queue.push([light, texture, false]);
    }
}