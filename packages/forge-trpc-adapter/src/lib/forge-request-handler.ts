import { AnyRouter, inferRouterContext, TRPCError } from '@trpc/server';
import { Request, ResolverFunction } from './forge-resolver.model';
import { resolveProcedureCall } from './resolve-procedure-call';
import { ProcedureType } from '@toolsplus/forge-trpc-protocol';

// Copy of the following tRCP definition because it is not exported:
// https://github.com/trpc/trpc/blob/2ae2c7e0a62e0283e08c359ce58ade30d0b95187/packages/server/src/internals/types.ts
export type OnErrorFunction<TRouter extends AnyRouter, TRequest> = (opts: {
  error: TRPCError;
  type: ProcedureType | 'unknown';
  path: string | undefined;
  req: TRequest;
  input: unknown;
  ctx: undefined | inferRouterContext<TRouter>;
}) => void;

export type CreateForgeContextOptions = {
  request: Request;
};
export type ForgeCreateContextFn<TRouter extends AnyRouter> = ({
  request,
}: CreateForgeContextOptions) =>
  | inferRouterContext<TRouter>
  | Promise<inferRouterContext<TRouter>>;

export type ForgeOptions<TRouter extends AnyRouter> =
  | {
      router: TRouter;
      batching?: {
        enabled: boolean;
      };
      onError?: OnErrorFunction<TRouter, Request>;
    } & (
      | {
          /**
           * @link https://trpc.io/docs/context
           **/
          createContext: ForgeCreateContextFn<TRouter>;
        }
      | {
          /**
           * @link https://trpc.io/docs/context
           **/
          createContext?: ForgeCreateContextFn<TRouter>;
        }
    );

/**
 * Creates a Forge function resolver that handles tRPC requests over the Forge Custom UI bridge.
 *
 * The handler can be hooked up with any Forge function to handle tRPC client requests. Make sure the
 * Forge function key matches function key used by the Forge tRPC client.
 *
 * @param opts tRPC configuration for this handler
 * @returns Forge function resolver that handles tRPC requests over the Forge bridge
 */
export function forgeRequestHandler<TRouter extends AnyRouter>(
  opts: ForgeOptions<TRouter>
): ResolverFunction {
  return (request) => {
    const createContext = async function _createContext(): Promise<
      inferRouterContext<TRouter>
    > {
      return await opts.createContext?.({ request });
    };

    return resolveProcedureCall({
      router: opts.router,
      batching: opts.batching,
      createContext,
      unverifiedCallOptions: request.payload,
      onError: (o) => {
        opts?.onError?.({
          ...o,
          req: request,
        });
      },
    });
  };
}
