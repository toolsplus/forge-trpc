import * as t from 'io-ts';

/**
 * Default Forge function resolver key.
 */
export const defaultResolverFunctionKey = 'rpc';

/**
 * Codec for allowed tRPC procedure types.
 */
export const procedureTypeCodec = t.union([
  t.literal('query'),
  t.literal('mutation'),
  t.literal('subscription'),
]);
export type ProcedureType = t.TypeOf<typeof procedureTypeCodec>;

/**
 * Codec for accepted tRPC procedure call options.
 */
export const procedureCallOptionsCodec = t.intersection([
  t.type({
    input: t.unknown,
    path: t.string,
    type: procedureTypeCodec,
    isBatchCall: t.boolean,
  }),
  t.partial({ input: t.unknown }),
]);
export type ProcedureCallOptions = t.TypeOf<typeof procedureCallOptionsCodec>;

