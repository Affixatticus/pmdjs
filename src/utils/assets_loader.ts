import { DungeonTextures, DungeonTexturesProperties } from "../data/dungeons";

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

        // Save the textures
        this.dungeonTextures[path] = { textures, heightmaps, properties };
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