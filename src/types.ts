import { assert } from "https://deno.land/std@0.60.0/testing/asserts.ts"

interface IDictionary<T> {
    [id: string]: T;
}

type RangeNamedArgs = {
    start?: number,
    stop: number,
    step?: number,
};

/**
 * Represents a range of numbers.
 * 
 * When used as an iterator, the values `yield`ed will go from `start` (inclusive) to `stop` (exclusive).
 * 
 * @example
 * new Range([0, 5, 2]) // [0, 2, 4]
 * new Range(4) // [0, 1, 2, 3]
 */
class Range {
    /** The starting value for the iterator */
    public start: number;
    /** The stopping value for the iterator */
    public stop: number;
    /** The stepping amount for the iterator */
    public step: number;

    /**
     * @param args The values to use when constructing this `Range`
     * 
     * @remarks
     * When given a single `number`, it will be used for `stop`.
     * 
     * When given an array of `number`, the array must have a length of one, two, or three.
     * If the length is 1, the value will be used for `stop`.
     * If the length is 2, the first value will be used for `start` and the second for `stop`.
     * If the length is 3, the first value will be used for `start`, second for `stop`, and the last for `step`.
     * 
     * When given an object of `RangeNamedArgs`, the provided values will be used with the defaults for the rest (if any).
     * 
     * @default
     * start: 0
     * step: 1
     */
    constructor(args: number | number[] | RangeNamedArgs) {
        if (typeof args === "number") {
            this.start = 0;
            this.stop = args;
            this.step = 1;
            return;
        }

        if (!Array.isArray(args)) {
            if (args.step) {
                assert(args.step !== 0, "`step` must be non-zero.");
                assert(args.step > 0, "`step` must be positive.");
            }
            this.start = args.start ?? 0;
            this.stop = args.stop;
            this.step = args.step ?? 1;
            return;
        }

        assert(args.length !== 0, "Invalid amount of arguments. Expected 1, 2, or 3; Given 0.");
        assert(args.length <= 3, `Invalid amount of arguments. Expected 1, 2, or 3; Given ${args.length}.`);

        if (args.length === 1) {
            this.start = 0;
            this.stop = args[0];
            this.step = 1;
            return;
        }

        if (args.length === 2) {
            this.start = args[0];
            this.stop = args[1];
            this.step = 1;
            return;
        }

        assert(args[2] !== 0, "`step` must be non-zero.");
        assert(args[2] > 0, "`step` must be positive.");
        this.start = args[0];
        this.stop = args[1];
        this.step = args[2];
    }

    *[Symbol.iterator](): Iterable<number> {
        // Bail quickly if nothing is needed.
        if (this.start === this.stop)
            return;

        // Counting down?
        if (this.stop < this.start) {
            for (let current = this.start; current > this.stop; current -= this.step)
                yield current;
            return;
        }

        for (let current = this.start; current < this.stop; current += this.step)
            yield current;
    }

    toString(): string {
        return `Range{start:${this.start},stop:${this.stop},step:${this.step}}`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }
}

export type { IDictionary, Range };
