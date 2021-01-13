import { IDictionary, Range } from "../types.ts";
import { SourceInfo, getSourceInfo } from "../tracer.ts";

import { assert } from "https://deno.land/std@0.60.0/testing/asserts.ts"
import { bitsFor } from "../util.ts";

/**
 * @internal
 * Deterministic Unique Identifier.
 * 
 * A monotonically increasing ID.
 */
class DUID {
    private static __next = 0;

    /** The ID this `DUID` instance represents */
    public value: number;

    /** Constructs a new `DUID` */
    constructor() {
        this.value = DUID.__next;
        DUID.__next++;
    }
}

type ShapeCastFrom = Shape | number | [number, boolean] | Range | IDictionary<number>;
type ShapeCompareTo = Shape | [number, boolean];

/** Bit width and signedness of a signal. */
class Shape {
    /** The bit width of the signal this `Shape` represents */
    public width: number;
    /** Whether the signal represents a signed value or not */
    public signed: boolean;

    /**
     * @param width The bit width of the signal this `Shape` represents
     * @param signed Whether the signal represents a signed value or not
     * 
     * @default
     * signed: false
     */
    constructor(width: number, signed = false) {
        assert(width >= 1, "Shape must be non-negative and non-zero.");
        this.width = width;
        this.signed = signed;
    }

    /**
     * Constructs a signed `Shape` from a width.
     * 
     * @param width The bit width of the signal this `Shape` represents
     */
    static signed(width: number): Shape {
        return new Shape(width, true);
    }
    /**
     * Constructs an unsigned `Shape` from a width.
     * 
     * @param width The bit width of the signal this `Shape` represents
     */
    static unsigned(width: number): Shape {
        return new Shape(width, false);
    }

    /**
     * Constructs a `Shape` from another compatible object
     * 
     * @param obj The object to convert into a `Signal`
     * 
     * @remarks
     * When given a `Shape`, a duplicate `Shape` object will be returned.
     * 
     * When given a `number` an unsigned `Shape` object will be created with the `width` of the provided `obj`.
     * 
     * When given a tuple of `[number, boolean]`, those values will be used as the `width` and `signed` parameters when creating the `Shape` object.
     * 
     * When given a `Range` object, a `Shape` object will be created with `width` and `signed` values needed to hold every possible value.
     * 
     * When given an `IDictionary<number>`, a `Shape` object will be created with `width` and `signed` values needed to hold every possible value.
     */
    static cast(obj: ShapeCastFrom): Shape {
        if (obj instanceof Shape)
            return new Shape(obj.width, obj.signed);

        if (typeof obj === "number")
            return Shape.unsigned(obj);

        // Tuple<number, boolean>
        if (Array.isArray(obj))
            return new Shape(obj[0], obj[1]);

        if (obj instanceof Range) {
            const signed = obj.start < 0 || (obj.stop - obj.step) < 0;
            const width = Math.max(
                bitsFor(obj.start, signed),
                bitsFor(obj.stop - obj.step, signed)
            );
            return new Shape(width, signed);
        }

        const min = Math.min(...Object.values(obj));
        const max = Math.min(...Object.values(obj));
        const signed = min < 0 || max < 0;
        const width = Math.max(
            bitsFor(min, signed),
            bitsFor(max, signed)
        );
        return new Shape(width, signed);
    }

    toString(): string {
        if (this.signed)
            return `Shape.signed{${this.width}}`;
        return `Shape.unsigned{${this.width}}`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }

    equals(other: ShapeCompareTo): boolean {
        if (Array.isArray(other))
            return (this.width === other[0]) && (this.signed === other[1]);

        return (this.width === other.width) && (this.signed === other.signed);
    }
}

type ValueCastFrom = Value | number | IDictionary<number>;
type UnaryOp = "~" | "-";
type ArithOp = "+" | "-" | "*" | "%" | "/";
type ShiftOp = "<<" | ">>" | ">>>";
type BitwiseOp = "&" | "^" | "|" | "^"
type EqualityOp = "==" | "!=" | "<" | "<=" | ">" | ">="
type OtherOp = "abs"
type ConvertOp = "u" | "s" | "b";
type TestOp = "any" | "all" | "mux"
type ValueOp = UnaryOp | ArithOp | ShiftOp | BitwiseOp | EqualityOp | OtherOp | ConvertOp | TestOp;

// WIP: Compile type validation of `Value.matches`
type ValidMatchChar = "1" | "0" | "*";
type ValidMatch<S> =
    S extends ""
    ? ""
    : (S extends `${infer S0}${infer Ss}`
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ? (S0 extends ValidMatchChar ? `${S0}${ValidMatch<Ss>}` : never)
        : never);

/**
 * Base class for all tshdl values.
 */
abstract class Value {
    private src: SourceInfo | null;

    // TODO: annotate
    static cast(obj: ValueCastFrom): Value {
        if (obj instanceof Value)
            return obj;

        if (typeof obj === "number")
            throw ""; // TODO: Const(obj)

        // TODO: IDictionary<number>
        throw "";
    }

    /**
     * @param __srcLoc Internal parameter; Do not use
     */
    constructor(__srcLoc = 0) {
        this.src = getSourceInfo(__srcLoc + 1);
    }

    op(op: ValueOp, ...args: ValueCastFrom[]): Operator {
        throw "";
    }

    parity() {
        throw "";
    }

    static implies(premise: ValueCastFrom, conclusion: ValueCastFrom) {
        throw "";
    }

    bitSelect(offset: number, width: number) {
        throw "";
    }

    matches(...patterns: string[]): boolean {
        patterns.forEach((testStr) => {
            assert(/[^01*]+/.test(testStr), `Match test string '${testStr}' contains invalid characters.`);
        });
        throw "";
    }

    eq(value: ValueCastFrom) {
        throw "";
    }

    __lhsSignals(): SignalSet {
        throw "Value cannot be used in assignments.";
    }
    abstract __rhsSignals(): SignalSet;

    __asConst(): Const {
        throw "Value cannot be evaluated as a constant.";
    }

    abstract toString(): string;

    abstract get shape(): Shape;
}

/**
 * A constant, literal integer value.
 */
class Const extends Value {
    public value: bigint;
    public shape: Shape;

    static normalize(value: bigint, shape: Shape): bigint {
        const { width, signed } = shape;

        // a string of 1 bits `width` long
        const mask = (1n << BigInt(width)) - 1n;

        // chop off bits at positions greater than `width`
        value &= mask;

        // set the highest bit if `signed`
        if (signed && (value >> BigInt(width - 1)))
            value |= ~mask;

        return value;
    }

    /**
     * @param value The value this `Const` represents
     * @param shape The `Shape` this `Const` takes
     * @param __srcLoc Internal parameter; Do not use
     * 
     * @default
     * shape: the smallest `Shape` that can hold `value`
     * 
     * @remarks
     * If `value` is too large to fit into `shape`, it will be coerced down
     */
    constructor(value: bigint, shape: Shape | undefined = undefined, __srcLoc = 0) {
        super(__srcLoc + 1);

        this.shape = shape || new Shape(bitsFor(value), value < 0);
        this.value = Const.normalize(value, this.shape);
    }

    __rhsSignals(): SignalSet {
        return {};
    }

    __asConst(): Const {
        return this;
    }

    toString(): string {
        return `Const{value=${this.value},shape=${this.shape}}`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }
}

class AnyValue extends Value {
    public shape: Shape;

    constructor(shape: ShapeCastFrom, __srcLoc = 0) {
        super(__srcLoc + 1);
        this.shape = Shape.cast(shape);
    }

    __rhsSignals(): SignalSet {
        return {};
    }

    toString(): string {
        return `AnyValue{shape=${this.shape}}`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }
}

// TODO: AnyConst
// TODO: AnySeq

class Operator extends Value {
    public operator: ValueOp;
    public operands: Value[];

    constructor(operator: ValueOp, operands: ValueCastFrom[], __srcLoc = 0) {
        super(__srcLoc + 1);
        this.operator = operator;
        this.operands = operands.map((value) => Value.cast(value));
    }

    get shape(): Shape {
        throw "";
    }

    __rhsSignals(): SignalSet {
        // TODO: join all of operands[].__rhsSignals()
        throw "";
    }

    toString(): string {
        return `${this.operator}(${this.operands.map((value) => value.toString()).join(",")})`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }
}

function Mux(selector: ValueCastFrom, valTrue: Value, valFalse: Value): Operator {
    const value = Value.cast(selector);
    const bool = value.op("b");
    return new Operator("mux", [bool, valTrue, valFalse]);
}

class Slice extends Value {
    public value: Value;
    public start: number;
    public stop: number;

    constructor(value: ValueCastFrom, start: number, stop: number, __srcLoc = 0) {
        const value2 = Value.cast(value);
        const n = value2.shape.width;

        assert((-(n + 1) >= start) && ((n + 1) <= start),
            `Cannot start a slice ${start} bits into ${n}-bit value.`);
        assert((-(n + 1) >= stop) && ((n + 1) <= stop),
            `Cannot stop a slice ${stop} bits into ${n}-bit value.`);

        // negative indexing wraps around
        if (start < 0)
            start += n;
        if (stop < 0)
            stop = + n;

        assert(stop <= start,
            `Slice start (${start}) must be less than slice stop (${stop}).`);

        super(__srcLoc + 1);
        this.value = value2;
        this.start = start;
        this.stop = stop;
    }

    get shape(): Shape {
        return new Shape(this.stop - this.start);
    }

    __lhsSignals(): SignalSet {
        return this.value.__lhsSignals();
    }

    __rhsSignals(): SignalSet {
        return this.value.__rhsSignals();
    }

    toString(): string {
        return `${this.value}[${this.start}..${this.stop}]`;
    }
    [Symbol.toStringTag](): string {
        return this.toString();
    }
}

type SignalSet = {
    [key: string]: unknown;
}

export { DUID, Shape, Value, Const, AnyValue, Operator, Mux, Slice };
