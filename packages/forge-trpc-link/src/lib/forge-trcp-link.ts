import { TRPCClientError, TRPCLink } from '@trpc/client';
import type { CoercedTransformerParameters, TransformerOptions } from '@trpc/client/dist/unstable-internals';
import type { DataTransformerOptions } from '@trpc/server/dist/unstable-core-do-not-import';
import type { AnyTRPCRouter, TRPCCombinedDataTransformer } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { customUiBridgeRequest } from './custom-ui-bridge-request';
import { transformResult } from './transform-result';

export interface CustomUiBridgeLinkOptions {
  /**
   * Key of the Forge resolver function that handles tRPC
   * requests from this link.
   *
   * @defaultValue 'rpc'
   */
  resolverFunctionKey?: string;
  transformer?: DataTransformerOptions;
}

/**
 * Creates a tRPC terminating link for Forge Custom UI that sends tRPC requests over the Forge
 * Custom UI bridge to the Forge app backend.
 *
 * Use the options to configure the Forge function key that handles tRPC requests from this
 * tRPC link.
 *
 * @see https://trpc.io/docs/links#the-terminating-link
 *
 * @param opts Configuration options for this link
 * @returns Terminating tRPC link
 *
 */
export const customUiBridgeLink = <TRouter extends AnyTRPCRouter>(
  opts: CustomUiBridgeLinkOptions
): TRPCLink<TRouter> => {
  return () =>
    ({ op }) =>
      observable((observer) => {
        const { path, input, type } = op;
        const transformer = getTransformer(opts.transformer);
        const promise = customUiBridgeRequest({
          type,
          input,
          path,
          resolverFunctionKey: opts.resolverFunctionKey,
          transformer,
        });

        promise
          .then((res) => {
            const transformed = transformResult(res, transformer.output);
            if (!transformed.ok) {
              observer.error(TRPCClientError.from(transformed.error));
              return;
            }
            observer.next({
              result: transformed.result,
            });
            observer.complete();
          })
          .catch((cause) => observer.error(TRPCClientError.from(cause)));
      });
};

function getTransformer(
  transformer:
    | TransformerOptions<{ transformer: false }>['transformer']
    | TransformerOptions<{ transformer: true }>['transformer']
    | undefined,
): TRPCCombinedDataTransformer {
  const _transformer =
    transformer as CoercedTransformerParameters['transformer'];
  if (!_transformer) {
    return {
      input: {
        serialize: (data) => data,
        deserialize: (data) => data,
      },
      output: {
        serialize: (data) => data,
        deserialize: (data) => data,
      },
    };
  }
  if ('input' in _transformer) {
    return _transformer;
  }
  return {
    input: _transformer,
    output: _transformer,
  };
}