import { Vec2 } from "./vectors";

export class Segment {
    private point1: Vec2;
    private point2: Vec2;

    constructor(point1: Vec2, point2: Vec2) {
        this.point1 = point1;
        this.point2 = point2;
    }

    public getPoint1() {
        return this.point1;
    }

    public getPoint2() {
        return this.point2;
    }

    // Returns all the points on the line between point1 and point2
    public getPoints() {
        let points: Vec2[] = [];

        let x1 = this.point1.x;
        let y1 = this.point1.y;
        let x2 = this.point2.x;
        let y2 = this.point2.y;

        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);

        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;

        let err = dx - dy;

        while (true) {
            points.push(new Vec2(x1, y1));

            if ((x1 == x2) && (y1 == y2)) break;

            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x1 += sx; }
            if (e2 < dx) { err += dx; y1 += sy; }
        }

        return points;
    }
}