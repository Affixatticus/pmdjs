import { int } from "./Random";
import { V2, Vec2 } from "./vectors";

export class Rect {
    public left: number;
    public top: number;
    public right: number;
    public bottom: number;
    get x() { return this.left; }
    get y() { return this.right; }
    get width() { return this.right - this.left }
    get height() { return this.bottom - this.top }

    constructor(x: number, y: number, width: number, height: number) {
        this.left = x;
        this.top = y;
        this.right = x + width;
        this.bottom = y + height;
    }

    static fromLTRB(left: number, top: number, right: number, bottom: number) {
        return new Rect(left, top, right - left, bottom - top);
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

    /**
     * @param delta The max distance from each edge of the rect in percentage to that edge's distacne to its parallel edge
     * @returns An rect contained in this one
     */
    public subrect(delta: number): Rect {
        const left = int(this.left, this.left + (this.width * delta | 0));
        const top = int(this.top, this.top + (this.height * delta | 0));
        const right = int(this.right - (this.width * delta | 0), this.right);
        const bottom = int(this.bottom - (this.height * delta | 0), this.bottom);

        return Rect.fromLTRB(left, top, right, bottom);
    }

    /** Returns a random point withing the rect's bounds */
    get randomPoint(): Vec2 {
        return V2(
            this.left + 1 + int(0, this.width - 2),
            this.top + 1 + int(0, this.height - 2),
        );
    }

    /** Returns the middle of the rect with a bias towars top-left */
    get middle(): Vec2 {
        return V2(
            this.left + this.width / 2 | 0,
            this.top + this.height / 2 | 0,
        );
    }
};
