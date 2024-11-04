import type { AnyRouter } from '@trpc/server';
import { TRPCClientError, TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { transformResult } from './transform-result';
import { customUiBridgeRequest } from './custom-ui-bridge-request';

export interface CustomUiBridgeLinkOptions {
  /**
   * Key of the Forge resolver function that handles tRPC
   * requests from this link.
   *
   * @defaultValue 'rpc'
   */
  resolverFunctionKey?: string;
}

interface DataTransformer {
  serialize: (object: any) => any;
  deserialize: (object: any) => any;
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
export const customUiBridgeLink = <TRouter extends AnyRouter>(
  opts: CustomUiBridgeLinkOptions & {
    transformer: DataTransformer;
  }
): TRPCLink<TRouter> => {
  return (runtime) =>
    ({ op }) =>
      observable((observer) => {
        const { path, input, type } = op;
        const promise = customUiBridgeRequest({
          runtime,
          type,
          input,
          path,
          resolverFunctionKey: opts.resolverFunctionKey,
          transformer: opts.transformer,
        });
        promise
          .then((res) => {
            const transformed = transformResult(res, opts.transformer);
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
