export enum Weather {
    CLEAR,
    SUNNY_DAY,
    RAIN_DANCE,
    HAIL,
    SANDSTORM,
    SNOWSTORM,
    THUNDERSTORM,
    RAINBOW_LIGHT,
    STRONG_WINDS,
    HARSH_SUNLIGHT,
    PRIMORDIAL_RAIN
};

export interface WeatherChance {
    /** Weather id */
    id: Weather;
    /** A number between 1 and 100 */
    chance: number;
}