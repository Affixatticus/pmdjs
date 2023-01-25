function int(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return (Math.random() * (max - min + 1) + min) | 0;
}

function float(min: number, max?: number) {
    if (max === undefined) max = min, min = 0;
    return Math.random() * (max - min) + min;
}

function choose<T>(arr: Array<T>): T {
    return arr[int(arr.length - 1)];
}

function pick<T>(arr: Array<T>): T {
    return arr.splice(int(arr.length - 1), 1)[0];
}

function chance(percentage: number) {
    return int(100) < percentage;
}

function oneIn(n: number) {
    return int(n) === 0;
}

function shuffle<T>(array: Array<T>): Array<T> {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;

    // Shuffle the elements inside the array
    while (0 !== currentIndex) {
        // Pick a remaining element
        randomIndex = int(currentIndex - 1);
        currentIndex -= 1;

        // Swap it with the current element
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

const Random = {
    int,
    float,
    choose,
    pick,
    chance,
    oneIn,
    shuffle,
};

export default Random;