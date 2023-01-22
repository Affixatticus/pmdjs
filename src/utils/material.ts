import { BaseTexture, Color3, Constants, StandardMaterial } from "@babylonjs/core";

export function fillOutStandardOptions(
    material: StandardMaterial,
    texture: BaseTexture = material.diffuseTexture as BaseTexture
) {
    material.specularColor = Color3.Black();
    material.specularPower = 10000000;
    texture.hasAlpha = true;
    texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
}