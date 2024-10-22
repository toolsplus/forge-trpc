import { AnyRouter, inferRouterError } from '@trpc/server';
import { TRPCResponse, TRPCResponseMessage, TRPCResultMessage } from '@trpc/server/rpc';
import { TRPCClientError } from '@trpc/client';

interface DataTransformer {
  serialize: (object: any) => any;
  deserialize: (object: any) => any;
}

function transformResultInner<TRouter extends AnyRouter, TOutput>(
  response:
    | TRPCResponseMessage<TOutput, inferRouterError<TRouter>>
    | TRPCResponse<TOutput, inferRouterError<TRouter>>,
  transformer: DataTransformer
) {
  if ('error' in response) {
    const error = transformer.deserialize(
      response.error
    ) as inferRouterError<TRouter>;
    return {
      ok: false,
      error: {
        ...response,
        error,
      },
    } as const;
  }

  const result = {
    ...response.result,
    ...((!response.result.type || response.result.type === 'data') && {
      type: 'data',
      data: transformer.deserialize(response.result.data),
    }),
  } as TRPCResultMessage<TOutput>['result'];
  return { ok: true, result } as const;
}

/**
 * Checks that value is an object
 *
 * @param value to test
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === 'object';
}

/**
 * Transforms the result and validates that  is a valid TRPCResponse
 *
 * This is a 1:1 copy of transformResult.ts in @trpc/client. The copy exists because the method is not exported from the client package.
 *
 * @see https://github.com/trpc/trpc/blob/c49e0333ced133a883d276e51679c10de2f575e8/packages/client/src/links/internals/transformResult.ts
 */
export function transformResult<TRouter extends AnyRouter, TOutput>(
  response:
    | TRPCResponseMessage<TOutput, inferRouterError<TRouter>>
    | TRPCResponse<TOutput, inferRouterError<TRouter>>,
  transformer: DataTransformer
): ReturnType<typeof transformResultInner> {
  let result: ReturnType<typeof transformResultInner>;
  try {
    // Use the data transformers on the JSON-response
    result = transformResultInner(response, transformer);
  } catch (err) {
    throw new TRPCClientError('Unable to transform response from server');
  }

  // check that output of the transformers is a valid TRPCResponse
  if (
    !result.ok &&
    (!isObject(result.error.error) ||
      typeof result.error.error['code'] !== 'number')
  ) {
    throw new TRPCClientError('Badly formatted response from server');
  }
  if (result.ok && !isObject(result.result)) {
    throw new TRPCClientError('Badly formatted response from server');
  }
  return result;
}
