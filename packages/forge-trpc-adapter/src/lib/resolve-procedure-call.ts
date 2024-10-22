import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import * as T from 'fp-ts/Task';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as PathReporter from 'io-ts/PathReporter';
import {
  AnyRouter,
  callProcedure, getErrorShape,
  inferRouterContext,
  inferRouterError,
  TRPCError
} from '@trpc/server';
import { TRPCResponse } from '@trpc/server/rpc';
import {
  ProcedureCallOptions,
  procedureCallOptionsCodec,
  ProcedureType
} from '@toolsplus/forge-trpc-protocol';
import { getTRPCErrorFromUnknown } from './error-util';
import { transformTRPCResponse } from './transform-trpc-response';
import { Payload } from './forge-resolver.model';
import { batchInputCodec } from './batch-call.model';

type OnErrorFunction<TRouter extends AnyRouter> = (opts: {
  error: TRPCError;
  type: ProcedureType | 'unknown';
  path: string | undefined;
  input: unknown;
  ctx: undefined | inferRouterContext<TRouter>;
}) => void;

interface ProcedureCallError {
  error: TRPCError | Error;
  callOptions?: ProcedureCallOptions;
}

const decodeProcedureCallOptions = (
  payload: Payload
): E.Either<ProcedureCallError, ProcedureCallOptions> => {
  return pipe(
    payload,
    procedureCallOptionsCodec.decode,
    E.mapLeft((validationError) => ({
      error: new TRPCError({
        code: 'BAD_REQUEST',
        message: `Unexpected RPC payload: ${PathReporter.failure(
          validationError
        ).join(', ')}`
      })
    }))
  );
};

const validateProcedureCallOptions = (
  callOptions: ProcedureCallOptions,
  batchingEnabled: boolean
): E.Either<ProcedureCallError, ProcedureCallOptions> => {
  if (callOptions.isBatchCall && !batchingEnabled) {
    return E.left({
      error: new Error(`Batching is not enabled on the server`),
      callOptions
    });
  }
  if (callOptions.type === 'subscription') {
    return E.left({
      error: new TRPCError({
        message: 'Subscriptions should use wsLink',
        code: 'METHOD_NOT_SUPPORTED'
      }),
      callOptions
    });
  }
  return E.right(callOptions);
};

const getInputs = <TRouter extends AnyRouter>({
                                                callOptions,
                                                router
                                              }: {
  callOptions: ProcedureCallOptions;
  router: TRouter;
}): E.Either<ProcedureCallError, Record<number, unknown>> => {
  const deserializeInputValue = E.tryCatchK(
    (rawValue: unknown) => {
      return typeof rawValue !== 'undefined'
        ? router._def._config.transformer.input.deserialize(rawValue)
        : rawValue;
    },
    (error): ProcedureCallError => ({
      error: error as Error,
      callOptions
    })
  );

  if (!callOptions.isBatchCall) {
    return pipe(
      deserializeInputValue(callOptions.input),
      E.map((value) => ({
        0: value
      }))
    );
  }

  if (
    callOptions.input == null ||
    typeof callOptions.input !== 'object' ||
    Array.isArray(callOptions.input)
  ) {
    return E.left({
      error: new TRPCError({
        code: 'BAD_REQUEST',
        message: '"input" needs to be an object when doing a batch call'
      }),
      callOptions
    });
  }
  const inputValidation = batchInputCodec.decode(callOptions.input);
  if (E.isLeft(inputValidation)) {
    return E.left({
      error: new TRPCError({
        code: 'BAD_REQUEST',
        message:
          '"input" object keys need to be numbers when doing a batch call'
      }),
      callOptions
    });
  }

  return pipe(
    inputValidation.right,
    R.partitionMap(deserializeInputValue),
    ({ left, right }) =>
      R.isEmpty(left)
        ? E.right(right)
        : E.left({
          error: new Error(
            `Batch input deserialization failed on the following inputs:\n
                    ${Object.entries(left)
              .map(([key, e]) => `[${key}]: ${e.error}`)
              .join('\n')}`
          ),
          callOptions
        })
  );
};

type ProcedureCallResult =
  | { type: 'error'; input: unknown; path: string; error: TRPCError }
  | { type: 'data'; input: unknown; path: string; data: unknown };

const callProcedures = <TRouter extends AnyRouter>({
                                                     callOptions,
                                                     inputs,
                                                     router,
                                                     ctx,
                                                     onError
                                                   }: {
  callOptions: ProcedureCallOptions;
  inputs: Record<number, unknown>;
  router: TRouter;
  ctx: inferRouterContext<TRouter>;
  onError?: OnErrorFunction<TRouter>;
}): T.Task<ProcedureCallResult[]> => {
  const paths = callOptions.isBatchCall
    ? callOptions.path.split(',')
    : [callOptions.path];

  return pipe(
    paths,
    A.mapWithIndex((index, path) => ({ path, input: inputs[index] })),
    A.map(({ path, input }) =>
      pipe(
        TE.tryCatch(
          () =>
            callProcedure({
              procedures: router._def.procedures,
              path,
              getRawInput: async () => input,
              ctx,
              type: callOptions.type,
              signal: undefined
            }),
          (cause) => {
            const error = getTRPCErrorFromUnknown(cause);
            onError?.({
              error,
              path,
              input,
              ctx,
              type: callOptions.type
            });
            return error;
          }
        ),
        TE.match<TRPCError, ProcedureCallResult, unknown>(
          (error) => ({
            type: 'error',
            input,
            path,
            error
          }),
          (output) => ({
            type: 'data',
            input,
            path,
            data: output
          })
        )
      )
    ),
    A.sequence(T.ApplicativePar)
  );
};

const toTRPCResponse = <TRouter extends AnyRouter>({
                                                     callResult,
                                                     router,
                                                     callOptions,
                                                     ctx
                                                   }: {
  callResult: ProcedureCallResult;
  router: TRouter;
  callOptions: ProcedureCallOptions;
  ctx: inferRouterContext<TRouter>;
}): TRPCResponse<unknown, inferRouterError<TRouter>> => {
  const { path, input } = callResult;
  if (callResult.type === 'error') {
    return {
      error: getErrorShape({
        config: router._def._config,
        error: callResult.error,
        type: callOptions.type,
        path,
        input,
        ctx
      })
    };
  } else {
    return {
      result: {
        data: callResult.data
      }
    };
  }
};

const transformResponse = <TRouter extends AnyRouter>(
  router: TRouter,
  result: TRPCResponse | TRPCResponse[]
): TRPCResponse | TRPCResponse[] =>
  // How to type this better without the type cast?
  transformTRPCResponse(router, result) as TRPCResponse | TRPCResponse[];

/**
 * Base interface for any response handler
 */
interface BaseHandlerOptions<TRouter extends AnyRouter> {
  onError?: OnErrorFunction<TRouter>;
  batching?: {
    enabled: boolean;
  };
  router: TRouter;
}

interface ResolveProcedureCallOptions<TRouter extends AnyRouter>
  extends BaseHandlerOptions<TRouter> {
  createContext: () => Promise<inferRouterContext<TRouter>>;
  unverifiedCallOptions: Payload;
}

export const resolveProcedureCall = async <TRouter extends AnyRouter>(
  opts: ResolveProcedureCallOptions<TRouter>
): Promise<TRPCResponse | TRPCResponse[]> => {
  const { createContext, onError, router, unverifiedCallOptions } = opts;
  const batchingEnabled = opts.batching?.enabled ?? true;

  const ctx: inferRouterContext<TRouter> | undefined = undefined;

  return pipe(
    TE.Do,
    TE.bind('callOptions', () =>
      TE.fromEither(decodeProcedureCallOptions(unverifiedCallOptions))
    ),
    TE.chainFirst(({ callOptions }) =>
      TE.fromEither(validateProcedureCallOptions(callOptions, batchingEnabled))
    ),
    TE.bind('inputs', ({ callOptions }) =>
      TE.fromEither(getInputs({ callOptions, router }))
    ),
    TE.bind('ctx', ({ callOptions }) =>
      TE.tryCatch(
        createContext,
        (error): ProcedureCallError => ({ error: error as Error, callOptions })
      )
    ),
    TE.bind('rawResults', ({ callOptions, inputs, ctx }) =>
      TE.fromTask(callProcedures({ callOptions, inputs, ctx, router, onError }))
    ),
    TE.bind('resultEnvelopes', ({ rawResults, callOptions, ctx }) =>
      pipe(
        rawResults,
        A.map((callResult) =>
          toTRPCResponse({ callResult, router, ctx, callOptions })
        ),
        (response) =>
          TE.right<
            ProcedureCallError,
            TRPCResponse<unknown, inferRouterError<TRouter>>[]
          >(response)
      )
    ),
    TE.match(
      (cause) => {
        // we get here if
        // - batching is called when it's not enabled
        // - `createContext()` throws
        // - procedure call options cannot be decoded
        // - input deserialization fails
        const error = getTRPCErrorFromUnknown(cause.error);
        const errorMeta = {
          error,
          type: cause.callOptions?.type ?? ('unknown' as const),
          path: cause.callOptions?.path ?? undefined,
          input: cause.callOptions?.input ?? undefined,
          ctx
        };
        onError?.(errorMeta);
        return transformResponse(router, {
          error: getErrorShape({ ...errorMeta, config: router._def._config })
        });
      },
      ({ resultEnvelopes, callOptions }) =>
        transformResponse(
          router,
          callOptions.isBatchCall ? resultEnvelopes : resultEnvelopes[0]
        )
    )
  )();
};
