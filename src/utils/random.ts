export function randInt(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return (Math.random() * (max - min + 1) + min) | 0;
}

export function randFloat(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return Math.random() * (max - min) + min;
}

export function randomChoice<T>(arr: Array<T>): T {
    return arr[randInt(arr.length - 1)];
}

export function randomChance(percentage: number) {
    return randInt(100) < percentage;
}

export function oneInChance(n: number) {
    return randInt(n) === 0;
}

export function shuffleArray<T>(array: Array<T>): Array<T> {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;

    // Shuffle the elements inside the array
    while (0 !== currentIndex) {
        // Pick a remaining element
        randomIndex = randInt(currentIndex - 1);
        currentIndex -= 1;

        // Swap it with the current element
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

const Random = {
    int: randInt,
    float: randFloat,
    choose: randomChoice,
    chance: randomChance,
    oneIn: oneInChance,
    shuffle: shuffleArray,
}

export default Random;