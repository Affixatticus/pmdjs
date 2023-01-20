import { Constants, DynamicTexture, Scene, SpotLight } from "@babylonjs/core";
import { Tiles } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { CropParams } from "../../utils/canvas";
import { V3, Vec3 } from "../../utils/vectors";
import { DungeonState } from "../dungeon";
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
    private light!: SpotLight;
    private texture!: DynamicTexture;
    private lightMap!: CanvasImageSource;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /** Loads the texture for the overlay */
    public async init() {
        this.lightMap = await AssetsLoader.loadLightmap();
    }

    public place(area: OffsetGrid) {
        this.reset();

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
                ctx.drawImage(this.lightMap, ...params, x * LMT + size * LMSS, y * LMT + size * LMSS, LMT, LMT);
            }
        }

        texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        texture.update();

        // Place the light
        const position = area.getActualPosition(0, 0).toVec3()
            .add(V3(size / 2, size * 16 - (size > 10 ? size / 100 : 0), size / 2)).gameFormat;

        const light = new SpotLight("light", position, Vec3.Down(), Math.PI / 33.33333333333, 0, this.scene);
        light.intensity = 1.5;
        light.projectionTexture = texture;

        this.texture = texture;
        this.light = light;
    }

    public overlayPokemon(grid: DungeonGrid, pokemon: DungeonPokemon) {
        this.place(grid.getViewArea(
            pokemon.nextTurnPosition).inflate(1));
    }

    public reset() {
        this.light?.dispose();
        this.texture?.dispose();
    }
}