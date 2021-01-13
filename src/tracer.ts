import { assert } from "https://deno.land/std@0.60.0/testing/asserts.ts"

/**
 * The information returned from `getSourceInfo`.
 * A `null` for any of the fields means that information was unable to be retrieved.
*/
type SourceInfo = {
    readonly function: string | null,
    readonly file: string | null,
    readonly line: number | null,
    readonly column: number | null,
};

/**
 * ````
 * // matches `    at ${file}:${line}:${column}`
 * $1: ${file}
 * $2: ${line}
 * $3: ${column}
 * ````
 */
const StackTraceEntryMatch3 = / {4}at ([^:]+):(\d+):(\d+)/;
/**
 * ````
 * // matches  `    at ${func} (${file}:${line}:${column})`
 * $1: ${func}
 * $2: ${file}
 * $3: ${line}
 * $4: ${column}
 * ````
 */
const StackTraceEntryMatch4 = / {4}at ([^ ]+) \(([^:]+):(\d+):(\d+)\)/;

/**
 * Gets the info of the caller by generating and examining a stack trace.
 *
 * @param position The position in the stack (how far to look back); Must be non-negative
 * @param assertFailure Assert that a stack trace was grabbed
 *
 * @default
 * position: 0
 * assertFailure: false
 *
 * @returns
 * The information from the stack trace.
 * `null` is returned if the information couldn't be retrieved.
 *
 * @remarks
 * The `position` parameter refers to how many steps down in the stack to look (beginning at `getSourceInfo`'s caller).
 * Therefore, a value of 0 would refer to `getSourceInfo`'s call site.
 * A value of 1 would refer to the caller of *that* function.
 * Etc.
 * 
 * If `true`, the `assertFailure` parameter will raise an assertion if a stack can't be obtained.
 * An assertion will *not* be raised if the stack frame can be obtained, but the information is not extractable.
 * In the case of an unobtainable stack frame (if `assertFailure` is `false`) or unextractable information, `null` will be returned.
 */
function getSourceInfo(position = 0, assertFailure = false): SourceInfo | null {
    assert(position >= 0, "Position must be non-negative.");
    assert(position < 9, `Stack history only goes back a maximum of 9 frames; Requested ${position}.`);

    const stack = new Error().stack;
    if (assertFailure)
        assert(stack, "Failed to capture a stack snapshot.");
    if (!stack) return null;

    // plus 2 as [0] is just "Error" and [1] is this function
    const callSite = stack.split("\n")[position + 2];
    if (assertFailure)
        assert(callSite, "Failed to retrieve stack frame; Attempts to retrieve past the bottom of the stack will fail.")
    if (!callSite) return null;

    // The following is tested on Deno 1.6.3 (v8 8.8.294) and may break in the future
    // The regex tests used are lazy and will match invalid functions as long as 

    const test3 = callSite.match(StackTraceEntryMatch3);
    if (test3) {
        return {
            function: null,
            file: test3[1],
            line: parseInt(test3[2]),
            column: parseInt(test3[3]),
        };
    }

    const test4 = callSite.match(StackTraceEntryMatch4);
    if (test4) {
        return {
            function: test4[1],
            file: test4[2],
            line: parseInt(test4[3]),
            column: parseInt(test4[4]),
        };
    }

    return null;
}

export type { SourceInfo }
export { getSourceInfo };
