import { AnyRouter } from '@trpc/server';
import { TRPCResponse, TRPCResponseMessage } from '@trpc/server/rpc';

// This is a 1:1 copy of internals/transformTRPCResponse.ts in @trpc/server.
//
// This copy exists because the method is not exported from the server package.
// @see https://github.com/trpc/trpc/blob/2ae2c7e0a62e0283e08c359ce58ade30d0b95187/packages/server/src/internals/transformTRPCResponse.ts

function transformTRPCResponseItem<
  TResponseItem extends TRPCResponse | TRPCResponseMessage
>(router: AnyRouter, item: TResponseItem): TResponseItem {
  if ('error' in item) {
    return {
      ...item,
      error: router._def._config.transformer.output.serialize(item.error),
    };
  }

  if ('data' in item.result) {
    return {
      ...item,
      result: {
        ...item.result,
        data: router._def._config.transformer.output.serialize(
          item.result.data
        ),
      },
    };
  }

  return item;
}

/**
 * Takes a unserialized `TRPCResponse` and serializes it with the router's transformers
 **/
export function transformTRPCResponse<
  TResponse extends
    | TRPCResponse
    | TRPCResponse[]
    | TRPCResponseMessage
    | TRPCResponseMessage[]
>(router: AnyRouter, itemOrItems: TResponse) {
  return Array.isArray(itemOrItems)
    ? itemOrItems.map((item) => transformTRPCResponseItem(router, item))
    : transformTRPCResponseItem(router, itemOrItems);
}
