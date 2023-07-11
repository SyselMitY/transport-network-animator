import { Utils } from "./Utils";

export class Rotation {
    private static DIRS: { [id: string]: number } = {'sw': -135, 'w': -90, 'nw': -45, 'n': 0, 'ne': 45, 'e': 90, 'se': 135, 's': 180};

    constructor(private _degrees: number) {

    }

    static from(direction: string): Rotation {
        return new Rotation(Rotation.DIRS[direction] || 0);
    }

    get name(): string {
        for (const [key, value] of Object.entries(Rotation.DIRS)) {
            if (Utils.equals(value, this.degrees)) {
                return key;
            }
        }
        return 'n';
    }

    get degrees(): number {
        return this._degrees;
    }

    get radians(): number {
        return this.degrees / 180 * Math.PI;
    }

    add(that: Rotation): Rotation {
        let sum = this.degrees + that.degrees;
        if (sum <= -180)
            sum += 360;
        if (sum > 180)
            sum -= 360;
        return new Rotation(sum);
    }

    delta(that: Rotation): Rotation {
        let a = this.degrees;
        let b = that.degrees;
        let dist = b-a;
        if (Math.abs(dist) > 180) {
            if (a < 0)
                a += 360;
            if (b < 0)
                b += 360;
            dist = b-a;
        }
        return new Rotation(dist);
    }

    normalize(): Rotation {
        let dir = this.degrees;
        if (Utils.equals(dir, -90))
            dir = 0;
        else if (dir < -90)
            dir += 180;
        else if (dir > 90)
            dir -= 180;
        return new Rotation(dir);
    }

    isVertical(): boolean {
        return this.degrees % 180 == 0;
    }

    quarterDirection(relativeTo: Rotation): Rotation {
        const deltaDir = relativeTo.delta(this).degrees;
        const deg = deltaDir < 0 ? Math.ceil((deltaDir-45)/90) : Math.floor((deltaDir+45)/90);
        return new Rotation(deg*90);
    }

    halfDirection(relativeTo: Rotation, splitAxis: Rotation): Rotation {
        const deltaDir = relativeTo.delta(this).degrees;
        let deg;
        if (splitAxis.isVertical()) {
            if (deltaDir < 0 && deltaDir >= -180)
                deg = -90;
            else
                deg = 90;
        } else {
            if (deltaDir < 90 && deltaDir >= -90)
                deg = 0;
            else
                deg = 180;
        }
        return new Rotation(deg);
    }

    nearestRoundedInDirection(relativeTo: Rotation, direction: number) {
        const ceiledOrFlooredOrientation = relativeTo.round(direction);
        const differenceInOrientation = Math.abs(ceiledOrFlooredOrientation.degrees - this.degrees) % 90;
        return this.add(new Rotation(Math.sign(direction)*differenceInOrientation));
    }

    private round(direction: number): Rotation {
        const deg = this.degrees / 45;
        return new Rotation((direction >= 0 ? Math.ceil(deg) : Math.floor(deg)) * 45);
    }

    
}