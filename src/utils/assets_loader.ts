import { DungeonTextures, DungeonTexturesProperties } from "../data/dungeons";
import Canvas from "../utils/canvas";

const ASSETS_URL = "assets/";
const TEXTURES_URL = ASSETS_URL + "textures/";
const DUNGEON_URL = TEXTURES_URL + "dungeon/";

export class AssetsLoader {
    static dungeonTextures: Record<string, DungeonTextures> = {};

    static async loadDungeonTextures(path: string): Promise<DungeonTextures> {
        // Return the textures if they are already loaded
        if (this.dungeonTextures[path]) {
            return this.dungeonTextures[path];
        }

        // Load the textures concurrently
        const [textures, heightmaps] = await Promise.all([
            this.loadImage(DUNGEON_URL + path + "/textures.png"),
            this.loadImage(DUNGEON_URL + path + "/heightmaps.png"),
        ]);

        // Load the properties
        const properties: DungeonTexturesProperties =
            await (await fetch(DUNGEON_URL + path + "/properties.json")).json();

        // Extract the water textures
        const waterCtx = Canvas.create(72, textures.height);
        waterCtx.drawImage(textures, textures.width - 72, 0, 72, textures.height, 0, 0, 72, textures.height);

        const waterTextures = [];

        // Time this segment
        const start = performance.now();
        // Create a canvas for each water frame
        for (let j = 0; j < properties.water.frames.length; j++) {
            const frame = properties.water.frames[j];
            const frameCtx = Canvas.create(72, textures.height);
            // Copy the waterCtx onto the frameCtx
            frameCtx.drawImage(waterCtx.canvas, 0, 0);
            // Skip the first frame
            if (j > 0) {
                // Change the pixels of the frameCtx
                const fd = frameCtx.getImageData(0, 0, 72, textures.height);

                for (let i = 0; i < fd.data.length; i += 4) {
                    const [r, g, b] = [fd.data[i], fd.data[i + 1], fd.data[i + 2]];
                    for (const c in properties.water.frames[0]) {
                        const color = properties.water.frames[0][c];
                        if (r === color[0] &&
                            g === color[1] &&
                            b === color[2]) {
    
                            // Change the color to this frame's color
                            fd.data[i] = frame[c][0];
                            fd.data[i + 1] = frame[c][1];
                            fd.data[i + 2] = frame[c][2];
                        }
                    }
                }
                // Put the frameData back onto the frameCtx
                frameCtx.putImageData(fd, 0, 0);
            }
            waterTextures.push(frameCtx.canvas);
        }
        // Log the time it took to create the water textures
        console.log(`Water textures took, ${(performance.now() - start).toFixed(2)}, ms`);
    
        // Save the textures
        this.dungeonTextures[path] = { textures, heightmaps, properties, waterTextures };
        return this.dungeonTextures[path];
    }

    private static loadImage(url: string): Promise<HTMLImageElement> {
        const image = new Image();
        image.src = url;
        return new Promise((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image ${url}`));
        });
    }

}