import { Color3, Constants, DynamicTexture, Scene } from "@babylonjs/core";

export type CropParams = [x: number, y: number, w: number, h: number];

function createCanvas(width: number, height?: number): CanvasRenderingContext2D {
    if (height === undefined) {
        height = width;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext("2d") as CanvasRenderingContext2D;
}

function putImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource, ...params: CropParams) {
    ctx.drawImage(image, ...params, 0, 0, params[2], params[3]);
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// Function to convert a ctx to a base64 url
function toDataURL(ctx: CanvasRenderingContext2D) {
    return ctx.canvas.toDataURL();
}

function createURL(image: CanvasImageSource, ...params: CropParams) {
    const ctx = createCanvas(params[2], params[3]);
    putImage(ctx, image, ...params);
    const url = ctx.canvas.toDataURL();
    return url;
}

function toDynamicTexture(image: CanvasImageSource, scene: Scene, startX: number, startY: number, width: number, height: number) {
    const texture = new DynamicTexture("texture", { width, height }, scene,
        true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
    putImage(texture.getContext() as CanvasRenderingContext2D, image, startX, startY, width, height);
    texture.update();
    return texture;
}

function getPixelColor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const data = ctx.getImageData(x, y, 1, 1).data;
    return new Color3(data[0] / 255, data[1] / 255, data[2] / 255);
}

export {
    createCanvas,
    putImage,
    toDataURL,
    createURL,
    getPixelColor,
    toDynamicTexture
}

const Canvas = {
    create: createCanvas,
    clear: clearCanvas,
    putImage,
    toDataURL,
    createURL,
    getPixelColor,
    toDynamicTexture
};

export default Canvas;