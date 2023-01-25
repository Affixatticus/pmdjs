import Random from "./random";
import { V2, Vec2 } from "./vectors";

export class Rect {
    public left: number;
    public top: number;
    public right: number;
    public bottom: number;
    get x() { return this.left; }
    get y() { return this.top; }
    get width() { return this.right - this.left }
    get height() { return this.bottom - this.top }

    constructor(x: number, y: number, width: number, height: number) {
        this.left = x;
        this.top = y;
        this.right = x + width;
        this.bottom = y + height;
    }


    static fromCenter(point: Vec2, inflateX: number = 1, inflateY: number = inflateX): Rect {
        return new Rect(point.x - inflateX, point.y - inflateY, inflateX * 2 + 1, inflateY * 2 + 1);
    }

    static fromLTRB(left: number, top: number, right: number, bottom: number) {
        return new Rect(left, top, right - left, bottom - top);
    }

    static fromPositions(positions: Vec2[]) {
        // Get the minimum and maximum coordinates from all vectors
        let minX = positions[0].x;
        let minY = positions[0].y;
        let maxX = positions[0].x;
        let maxY = positions[0].y;
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return Rect.fromLTRB(minX, minY, maxX + 1, maxY + 1);
    }
    
    /**
     * @param d Amount by which to inflate (or deflate if `d < 0`) the rect
     * @returns Returns a new, inflated `Rect` 
     */
    public inflate(d: number) {
        return Rect.fromLTRB(this.left - d, this.top - d, this.right + d, this.bottom + d);
    }

    /** A generator function that loops through each of the points of the rect */
    public *iter() {
        for (let y = this.top; y < this.bottom; y++)
            for (let x = this.left; x < this.right; x++)
                yield V2(x, y);
    }

    public contains(point: Vec2) {
        return (point.x >= this.left) && (point.x < this.right) && (point.y >= this.top) && (point.y < this.bottom);
    }

    public distanceTo = (other: Rect) => {
        let vertical: number;
        if (this.top >= other.bottom)
            vertical = this.top - other.bottom;
        else if (this.bottom <= other.top)
            vertical = other.top - this.bottom;
        else
            vertical = -1;

        let horizontal: number;
        if (this.left >= other.right)
            horizontal = this.left - other.right;
        else if (this.right <= other.left)
            horizontal = other.left - this.right;
        else
            horizontal = -1;

        if ((vertical == -1) && (horizontal == -1)) return -1;
        if (vertical == -1) return horizontal;
        if (horizontal == -1) return vertical;

        return horizontal + vertical;
    }

    /** Creates a rect that stands in the middle of this rect, spaced from the sides by the input amount */
    public centralRect(bordersOut: Vec2) {
        return Rect.fromLTRB(this.left + bordersOut.x, this.top + bordersOut.y, this.right - bordersOut.x, this.bottom - bordersOut.y);
    }

    /**
     * @param delta The max distance from each edge of the rect in percentage to that edge's distacne to its parallel edge
     * @returns An rect contained in this one
     */
    public subrect(options: { maxWidth: number, maxHeight: number }): Rect {
        // let width = Random.int(5, this.width - 3);
        // let height = Random.int(4, this.height - 3);

        const minWidth = Math.min(5, this.width);
        const minHeight = Math.min(4, this.height);
        const maxWidth = options.maxWidth ?? this.width - 3;
        const maxHeight = options.maxHeight ?? this.height - 3;;

        let width = Random.int(minWidth, maxWidth);
        let height = Random.int(minHeight, maxHeight);

        if (width > height * 2 - 1)
            width = (width / 2 | 0) + 1;

        // Modify the width and height to be odd
        // if (width % 2 == 0) width--;
        // if (height % 2 == 0) height--;

        let x = Random.int(this.left + 2, this.right - width - 1);
        let y = Random.int(this.top + 2, this.bottom - height - 1);

        return new Rect(x, y, width, height);
    }

    /** Returns a random point withing the rect's bounds */
    public getRandomPoint(): Vec2 {
        return V2(
            this.left + 1 + Random.int(0, this.width - 2),
            this.top + 1 + Random.int(0, this.height - 2),
        );
    }

    public toString(): string {
        return `Rect(${this.left}, ${this.top}, ${this.right}, ${this.bottom})`;
    }

    public getRandomPointAroundCenter(): Vec2 {
        const randomPoint = this.getRandomPoint();
        const middle = this.middle;

        // Average the random point with the middle
        return V2(
            (randomPoint.x + middle.x) / 2 | 0,
            (randomPoint.y + middle.y) / 2 | 0,
        );
    }

    // ANCHOR Points
    public get topLeft(): Vec2 {
        return V2(this.left, this.top);
    }

    public get topRight(): Vec2 {
        return V2(this.right, this.top);
    }

    public get bottomLeft(): Vec2 {
        return V2(this.left, this.bottom);
    }

    public get bottomRight(): Vec2 {
        return V2(this.right, this.bottom);
    }

    /** Returns the middle of the rect with a bias towars top-left */
    get middle(): Vec2 {
        return V2(
            this.left + this.width / 2 | 0,
            this.top + this.height / 2 | 0,
        );
    }

    public getCenter(): Vec2 {
        return this.middle;
    }
};
