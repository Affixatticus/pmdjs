export function int(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return (Math.random() * (max - min + 1) + min) | 0;
}

export function float(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return Math.random() * (max - min) + min;
}

export function choose<T>(arr: Array<T>): T {
    return arr[int(arr.length - 1)];
}

export function chance(percentage: number) {
    return int(100) < percentage;
}

export function oneIn(n: number) {
    return int(n) === 0;
}

const Random = {
    int,
    float,
    choose,
    chance,
    oneIn,
};

export default Random;