export function randint(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return (Math.random() * (max - min + 1) + min) | 0;
}

export function randomChoice<T>(arr: Array<T>): T {
    return arr[randint(arr.length - 1)];
}

export function randChance(percentage: number) {
    return randint(100) < percentage;
}

export function oneIn(n: number) {
    return randint(n) === 0;
}

const Random = {
    randint,
    randomChoice,
    randChance,
    oneIn,
};

export default Random;