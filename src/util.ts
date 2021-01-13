/**
 * Find `k` such that 2**(k-1) <= n < 2**k.
 * Effectively the same as `Math.floor(Math.log2(n))`, but also works on `BigInt`.
 * Negative numbers are converted to their numerical inverse (`Math.abs`) before processing.
 * 
 * @param n The number to process
 * @param zeroIsZero Treat the bit length of `0` as 0
 * 
 * @default
 * zeroIsZero: false
 * 
 * @remarks
 * When `n` is 0, 1 will be returned by default.
 * If this behavior is not desired, pass `true` to the `zeroIsZero` parameter.
 */
function bitLength(n: number | bigint, zeroIsZero = false): number {
    if (n < 0)
        n = -n;

    if (n === 0 && zeroIsZero)
        return 0;

    return n.toString(2).length;
}

/**
 * `log_2{n}`, but returns an integer.
 * If `need_pow2` is `true`, an exception will be thrown on non-power-of-2 values of `n`.
 * 
 * @param n The number to process
 * @param need_pow2 Whether `n` must be a power of 2 or now
 * 
 * @default
 * need_pow2: true
 * 
 * @throws If `need_pow2` is `true`, but `n` is not a power of 2.
 */
function log2_int(n: number | bigint, need_pow2 = true): number {
    if (n === 0)
        return 0;

    n = BigInt(n);
    const r = bitLength(n - 1n);
    if (need_pow2 && (1n << BigInt(r)) !== n)
        throw `${n} is not a power of 2.`;

    return r;
}

/**
 * Calculates the number of bits required to store `n`.
 * 
 * @param n The number to process
 * @param requireSignBit Whether a bit should be added to the returned count or not
 * 
 * @default
 * requireSignBit: false
 * 
 * @remarks
 * When `n` is negative, the passed value of `requireSignBit` is ignored and treated as `true`.
 */
function bitsFor(n: number | bigint, requireSignBit = false): number {
    n = BigInt(n);

    let r: number;
    if (n > 0) {
        r = log2_int(n + 1n, false);
    } else {
        requireSignBit = true;
        r = log2_int(-n, false);
    }

    if (requireSignBit)
        return r + 1;
    return r;
}

export { bitLength, log2_int, bitsFor };
