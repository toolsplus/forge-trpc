import * as t from 'io-ts';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

export type PositiveIntegerFromStringC = t.Type<number, string, unknown>;

/**
 * Codec that validates that the given input string is a positive integer value.
 *
 * @see https://github.com/gcanti/io-ts-types/blob/master/src/NumberFromString.ts
 */
export const PositiveIntegerFromString: PositiveIntegerFromStringC = new t.Type<
  number,
  string,
  unknown
>(
  'PositiveIntegerFromString',
  t.Integer.is,
  (u, c) =>
    pipe(
      t.string.validate(u, c),
      E.chain((s) => {
        const n = +s;
        return n < 0 ? t.failure(u, c) : t.Integer.validate(n, c);
      })
    ),
  String
);

/**
 * Batch call input codec that validates that a given input is a record of positive number
 * to unknown.
 *
 * Note that a custom key codec is required here because Javascript will coerce the number
 * key types to strings at runtime. Defining input as t.record(t.number, t.unknown)
 * will fail to validate the input parameter for batch calls.
 *
 */
export const batchInputCodec = t.record(PositiveIntegerFromString, t.unknown);
