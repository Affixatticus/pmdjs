import { Color3 } from "@babylonjs/core";

function createCanvas(width: number, height?: number): CanvasRenderingContext2D {
    if (height === undefined) {
        height = width;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext("2d") as CanvasRenderingContext2D;
}

function putImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource, ...params: [number, number, number, number]) {
    ctx.drawImage(image, ...params, 0, 0, params[2], params[3]);
}

// Function to convert a ctx to a base64 url
function toDataURL(ctx: CanvasRenderingContext2D) {
    return ctx.canvas.toDataURL();
}

function createURL(image: CanvasImageSource, ...params: [number, number, number, number]) {
    const ctx = createCanvas(params[2], params[3]);
    putImage(ctx, image, ...params);
    return ctx.canvas.toDataURL();
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
}

export default {
    create: createCanvas,
    putImage,
    toDataURL,
    createURL,
    getPixelColor,
}

