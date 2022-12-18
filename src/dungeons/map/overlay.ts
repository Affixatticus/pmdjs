import { Constants, DynamicTexture, Scene, SpotLight } from "@babylonjs/core";
import { V3, Vec3 } from "../../utils/vectors";
import { OffsetGrid } from "./grid";

const LMS = 24; // Light map size
const LMSS = Math.round(LMS / 6); // Light map size start
const LMT = 16; // Light map tile size

/** Places lights over each of the tiles of the visible map */
export class TileOverlay {
    private scene: Scene;
    private light!: SpotLight;
    private texture!: DynamicTexture;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public coverArea(area: OffsetGrid) {
        this.reset();

        // Get the size of the area
        const width = area.width;
        const height = area.height;

        // Get a square that encloses the area
        const size = Math.max(width, height);

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
                const color = area.getValueAt(x, y);
                if (color === 1) {
                    // Draw a square
                    ctx.fillStyle = "rgb(244,244,244)";
                    ctx.fillRect(x * LMT + size * LMSS, y * LMT + size * LMSS, LMT, LMT);
                }
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

    public reset() {
        this.light?.dispose();
        this.texture?.dispose();
    }
}