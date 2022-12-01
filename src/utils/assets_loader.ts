import { DungeonTextures, DungeonTexturesProperties } from "../data/dungeons";
import { PokemonId } from "../data/pokemon";
import { PokemonSpriteData } from "../dungeons/objects/sprite";
import Canvas from "../utils/canvas";

const ASSETS_URL = "assets/";
const TEXTURES_URL = ASSETS_URL + "textures/";
const DUNGEON_URL = TEXTURES_URL + "dungeon/";
const OBJS_URL = TEXTURES_URL + "objects/";

const POKEMON_URL = TEXTURES_URL + "pokemon/";

const TILE_WIDTH = 24;
const WATER_GFX_START = TILE_WIDTH * 18;

export class AssetsLoader {
    static dungeonTextures: Record<string, DungeonTextures> = {};
    static itemsTextures: HTMLImageElement;
    static trapsTextures: HTMLImageElement;
    static pokemon: Map<PokemonId, PokemonSpriteData> = new Map();

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

        // Save the textures
        this.dungeonTextures[path] = { textures, heightmaps, properties };

        if (properties.water) {
            // Extract the water textures
            const waterCtx = Canvas.create(72, textures.height);
            waterCtx.drawImage(textures, WATER_GFX_START, 0, 72, textures.height, 0, 0, 72, textures.height);

            // If the water has an overlay, create a new ctx
            let overlayCtx = null;
            if (properties.water.overlayed) {
                overlayCtx = Canvas.create(72, textures.height);
                overlayCtx.drawImage(textures, WATER_GFX_START + 72, 0, 72, textures.height, 0, 0, 72, textures.height);
            }

            const waterTextures = [];

            // Time this segment
            const start = performance.now();

            // If the water is animated
            if (properties.water.frames) {
                // Create a canvas for each water frame
                for (let j = 0; j < properties.water.frames.length; j++) {
                    const frame = properties.water.frames[j];
                    let frameCtx = Canvas.create(72, textures.height);
                    // Copy the waterCtx onto the frameCtx
                    frameCtx.drawImage(overlayCtx ? overlayCtx.canvas : waterCtx.canvas, 0, 0);
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

                    // If the water has an overlay
                    if (overlayCtx) {
                        // create a new ctx
                        const overlayFrameCtx = Canvas.create(72, textures.height);
                        // Copy the base onto the overlayFrameCtx
                        overlayFrameCtx.drawImage(waterCtx.canvas, 0, 0);
                        // Copy the overlay onto the overlayFrameCtx
                        overlayFrameCtx.drawImage(frameCtx.canvas, 0, 0);

                        waterTextures.push(overlayFrameCtx.canvas);
                    } else
                        waterTextures.push(frameCtx.canvas);
                }
            } else {
                // Create a new canvas with the water overlayed to the overlay
                const ctx = Canvas.create(72, textures.height);
                ctx.drawImage(waterCtx.canvas, 0, 0);
                if (overlayCtx)
                    ctx.drawImage(overlayCtx.canvas, 0, 0);
                waterTextures.push(ctx.canvas);
            }
            // Log the time it took to create the water textures
            console.log(`Water textures took, ${(performance.now() - start).toFixed(2)}, ms`);
            // Save the water textures
            this.dungeonTextures[path].waterTextures = waterTextures;
        }

        return this.dungeonTextures[path];
    }

    static async loadItemsSheet(): Promise<HTMLImageElement> {
        // Return the textures if they are already loaded
        if (this.itemsTextures) {
            return this.itemsTextures;
        }
        return this.loadImage(OBJS_URL + "items.png");
    }

    static async loadTileSheet(): Promise<HTMLImageElement> {
        // Return the textures if they are already loaded
        if (this.trapsTextures) {
            return this.trapsTextures;
        }
        return this.loadImage(OBJS_URL + "tiles.png");
    }

    private static async loadPokemonSpriteSheets(rootFolder: string, sources: string[], type: string): Promise<Record<string, HTMLImageElement>> {
        // Load all the sources images
        const images = await Promise.all(Array.from(sources).
            map((v: string) => AssetsLoader.loadImage(`${rootFolder}${v}-${type}.png`)));
        // Convert the images array to a map
        const imageMap: Record<string, HTMLImageElement> = {};
        for (let i = 0; i < images.length; i++)
            imageMap[sources[i]] = images[i];

        return imageMap;
    }

    static async loadPokemon(...id: PokemonId) {
        // Return the textures if they are already loaded
        if (this.pokemon.get(id))
            return this.pokemon.get(id);

        // Time
        const start = performance.now();

        const rootFolder = `${POKEMON_URL}${id[0]}/sheets/${id[1].toString()}/`

        // Get the AnimData.json
        const animData = await (await fetch(rootFolder + "AnimData.json")).json();

        // Load the sources
        const sources = Array.from(new Set(Object.values(animData.anims).map((v: any) => v.source)));

        const [
            anim,
            // offset,
            // shadow
        ] =
            await Promise.all([
                await this.loadPokemonSpriteSheets(rootFolder, sources, "Anim"),
                // await this.loadPokemonSpriteSheets(rootFolder, sources, "Offsets"),
                // await this.loadPokemonSpriteSheets(rootFolder, sources, "Shadow"),
            ]);

        const output: PokemonSpriteData = {
            animations: animData.anims,
            shadowSize: animData.shadowSize,
            sprites: {
                anim,
                // offset,
                // shadow
            }
        };

        this.pokemon.set(id, output);

        console.log(`Loaded ${id[0]}-${id[1]} in ${(performance.now() - start).toFixed(2)} ms`);

        return output;
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