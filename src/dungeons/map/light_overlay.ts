import { Constants, DynamicTexture, Scene, SpotLight } from "@babylonjs/core";
import { Tiles } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { CropParams } from "../../utils/canvas";
import { V3, Vec3 } from "../../utils/vectors";
import { DungeonPokemon } from "../objects/pokemon";
import { DungeonGrid, OffsetGrid } from "./grid";
import { DungeonTiling, TilingTextureMode } from "./tiling";

const LMS = 24; // Light map size
const LMSS = Math.round(LMS / 6); // Light map size start
const LMT = 16; // Light map tile size

export enum LightOverlayColors {
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
    /** Last checked area needed to see if you should update the lights */
    private lastOffsetGrid!: OffsetGrid;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /** Loads the texture for the overlay */
    public async init() {
        this.lightMapTileset = await AssetsLoader.loadLightmap();
    }

    /** Updates the queue */
    public update() {
        // Decrease towards 0 all the lights that are not the last one
        // And remove the lights that are completely off
        for (let i = this.queue.length - 2; i >= 0; i--) {
            const [light, texture] = this.queue[i];
            light.intensity = Math.max(0, light.intensity -= 0.033);
            if (light.intensity === 0) {
                light.dispose();
                texture.dispose();
                this.queue.splice(i, 1);
            }
        }
        // Increase the last light
        const last = this.queue[this.queue.length - 1];
        const [light, _, reachedMaxIntensity] = last;

        if (!reachedMaxIntensity) {
            light.intensity = Math.min(1.5, light.intensity += 0.033);
            if (light.intensity === 1.5)
                last[2] = true;
        }

        // If the last light has reached its max intensity, decrease it
        else {
            light.intensity = Math.sin(Date.now() / 1000) * 0.25 + 1.5;
        }
    }
    
    /** Turns on the lights around the specified pokemon */
    public lightPokemon(grid: DungeonGrid, pokemon: DungeonPokemon, firstTime: boolean = false) {
        const offsetGrid = grid.getViewArea(pokemon.nextTurnPosition);
        if (!firstTime && this.lastOffsetGrid?.equals(offsetGrid))
            return;
        this.placeSpotlight(offsetGrid.inflate(1));
        this.lastOffsetGrid = offsetGrid;
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
            LightOverlayColors.WHITE, [], []
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
                const tiling = tilings.get(x, y);
                const params: CropParams = DungeonTiling.getCrop(tiling, Tiles.WALL, 0, TilingTextureMode.TEXTURE);

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