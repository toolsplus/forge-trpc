import { TRPCError } from '@trpc/server';

// This is a 1:1 copy of error/utils.ts in @trpc/server.
//
// This copy exists because the method is not exported from the server package.
// @see https://github.com/trpc/trpc/blob/b85bbbe825b66d5ac20506c1f0bcedec0f76841b/packages/server/src/error/utils.ts
export function getMessageFromUnknownError(
  err: unknown,
  fallback: string
): string {
  if (typeof err === 'string') {
    return err;
  }

  if (err instanceof Error && typeof err.message === 'string') {
    return err.message;
  }
  return fallback;
}

export function getErrorFromUnknown(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }
  const message = getMessageFromUnknownError(cause, 'Unknown error');
  return new Error(message);
}

export function getTRPCErrorFromUnknown(cause: unknown): TRPCError {
  const error = getErrorFromUnknown(cause);
  // this should ideally be an `instanceof TRPCError` but for some reason that isn't working
  // ref https://github.com/trpc/trpc/issues/331
  if (error.name === 'TRPCError') {
    return cause as TRPCError;
  }

  const trpcError = new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    cause: error,
    message: error.message,
  });

  // Inherit stack from error
  trpcError.stack = error.stack;

  return trpcError;
}

export function getCauseFromUnknown(cause: unknown) {
  if (cause instanceof Error) {
    return cause;
  }

  return undefined;
}
