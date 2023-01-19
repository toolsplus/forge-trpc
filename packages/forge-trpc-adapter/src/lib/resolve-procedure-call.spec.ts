import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/function';
import * as t from 'io-ts';
import * as PathReporter from 'io-ts/PathReporter';
import { initTRPC, TRPCError } from '@trpc/server';
import { resolveProcedureCall } from './resolve-procedure-call';

describe('resolveProcedureCall', () => {
  const onErrorMock = jest.fn();

  afterEach(() => {
    onErrorMock.mockReset();
  });

  const identity = <A>(a: A) => a;
  const mockTransformer = {
    input: {
      serialize: identity,
      deserialize: identity,
    },
    output: {
      serialize: identity,
      deserialize: identity,
    },
  };
  const tRPC = initTRPC.create({
    transformer: mockTransformer,
  });

  const router = tRPC.router({
    hello: tRPC.procedure.query(({}) => {
      return 'world';
    }),
  });

  it('should fail if call options cannot be decoded', async () => {
    const response = await resolveProcedureCall({
      router,
      createContext: () =>
        Promise.resolve({
          user: 'fake-user',
        }),
      unverifiedCallOptions: {
        type: 'fake-type',
        path: 'hello',
        isBatchCall: false,
      },
      onError: onErrorMock,
    });
    expect(onErrorMock).toBeCalledTimes(1);
    expect(response).toMatchObject({
      error: {
        code: -32600,
        message: expect.stringContaining(
          'Unexpected RPC payload: Invalid value "fake-type"'
        ),
        data: {
          code: 'BAD_REQUEST',
        },
      },
    });
  });

  it('should fail if call type is "subscription"', async () => {
    const response = await resolveProcedureCall({
      router,
      createContext: () =>
        Promise.resolve({
          user: 'fake-user',
        }),
      unverifiedCallOptions: {
        type: 'subscription',
        path: 'hello',
        isBatchCall: false,
      },
      onError: onErrorMock,
    });

    expect(onErrorMock).toBeCalledTimes(1);
    expect(response).toMatchObject({
      error: {
        code: -32005,
        message: expect.stringContaining('Subscriptions should use wsLink'),
        data: {
          code: 'METHOD_NOT_SUPPORTED',
        },
      },
    });
  });

  it('should fail if create context throws', async () => {
    const response = await resolveProcedureCall({
      router,
      createContext: () =>
        Promise.reject(new Error('Failed to create context')),
      unverifiedCallOptions: {
        type: 'query',
        path: 'hello',
        isBatchCall: false,
      },
      onError: onErrorMock,
    });

    expect(onErrorMock).toBeCalledTimes(1);
    expect(response).toMatchObject({
      error: {
        code: -32603,
        message: expect.stringContaining('Failed to create context'),
        data: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
    });
  });

  describe('single call', () => {
    it('should resolve single calls', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello',
          isBatchCall: false,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).not.toBeCalled();
      expect(response).toMatchObject({
        result: { data: 'world' },
      });
    });

    describe('custom transformer', () => {
      const tRPC = initTRPC.create();
      const transformerRouter = tRPC.router({
        echo: tRPC.procedure
          .input(
            flow(
              t.exact(t.type({ foo: t.literal('bar') })).decode,
              E.fold((e) => {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Unexpected echo input: ${PathReporter.failure(
                    e
                  ).join(', ')}`,
                });
              }, identity)
            )
          )
          .query(({ input }) => {
            return { ...input, queryName: 'echo', test: 'x' };
          }),
      });

      const input = { foo: 'bar' };

      it('should apply input and output transformer', async () => {
        const response = await resolveProcedureCall({
          router: transformerRouter,
          createContext: () =>
            Promise.resolve({
              user: 'fake-user',
            }),
          unverifiedCallOptions: {
            type: 'query',
            path: 'echo',
            input: input,
            isBatchCall: false,
          },
          onError: onErrorMock,
        });

        expect(onErrorMock).not.toBeCalled();
        expect(response).toMatchObject({
          result: { data: { ...input, queryName: 'echo' } },
        });
      });

      it('should handle failing input transformer', async () => {
        const response = await resolveProcedureCall({
          router: transformerRouter,
          createContext: () =>
            Promise.resolve({
              user: 'fake-user',
            }),
          unverifiedCallOptions: {
            type: 'query',
            path: 'echo',
            input: { foo: 'baz' },
            isBatchCall: false,
          },
          onError: onErrorMock,
        });

        expect(onErrorMock).toBeCalledTimes(1);
        expect(response).toMatchObject({
          error: {
            code: -32600,
            message: expect.stringContaining(
              'Unexpected echo input: Invalid value "baz"'
            ),
            data: {
              code: 'BAD_REQUEST',
              path: 'echo',
            },
          },
        });
      });
    });

    it('should handle throwing procedure implementation', async () => {
      const throwingProcedureRouter = tRPC.router({
        hello: tRPC.procedure.query(({}) => {
          throw new Error('this should be caught');
        }),
      });
      const response = await resolveProcedureCall({
        router: throwingProcedureRouter,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello',
          isBatchCall: false,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalledTimes(1);
      expect(response).toMatchObject({
        error: {
          code: -32603,
          message: 'this should be caught',
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            path: 'hello',
          },
        },
      });
    });
  });

  describe('batch call', () => {
    it('should fail if batching is disabled', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello',
          isBatchCall: true,
        },
        batching: { enabled: false },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalledTimes(1);
      expect(response).toMatchObject({
        error: {
          code: -32603,
          message: expect.stringContaining(
            'Batching is not enabled on the server'
          ),
          data: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        },
      });
    });

    it('should resolve batch calls', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello,hello,hello',
          input: { 0: { foo: 'foo' }, 1: { bar: 'bar' }, 2: { baz: 'baz' } },
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).not.toBeCalled();
      expect(response).toEqual([
        { result: { data: 'world' } },
        { result: { data: 'world' } },
        { result: { data: 'world' } },
      ]);
    });

    it('should fail if input object is in unexpected format', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello,hello,hello',
          input: {
            a: { foo: 'foo' },
            b: { bar: 'bar' },
            c: { baz: 'baz' },
          },
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalled();
      expect(response).toMatchObject({
        error: {
          code: -32600,
          message: expect.stringContaining(
            '"input" object keys need to be numbers when doing a batch call'
          ),
          data: {
            code: 'BAD_REQUEST',
          },
        },
      });
    });

    it('should fail if input is null', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello,hello,hello',
          input: null,
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalled();
      expect(response).toMatchObject({
        error: {
          code: -32600,
          message: expect.stringContaining(
            '"input" needs to be an object when doing a batch call'
          ),
          data: {
            code: 'BAD_REQUEST',
          },
        },
      });
    });

    it('should fail if input is an array', async () => {
      const response = await resolveProcedureCall({
        router,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'hello,hello,hello',
          input: [{ foo: 'foo' }, { bar: 'bar' }, { baz: 'baz' }],
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalled();
      expect(response).toMatchObject({
        error: {
          code: -32600,
          message: expect.stringContaining(
            '"input" needs to be an object when doing a batch call'
          ),
          data: {
            code: 'BAD_REQUEST',
          },
        },
      });
    });

    it('should succeed with mixed result if input deserialization fails for some inputs', async () => {
      const tRPC = initTRPC.create();
      const inputValidationRouter = tRPC.router({
        echo: tRPC.procedure
          .input(
            flow(
              t.keyof({
                foo: null,
                bar: null,
                // missing baz triggers error
              }).decode,
              E.fold((e) => {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Unexpected echo input: ${PathReporter.failure(
                    e
                  ).join(', ')}`,
                });
              }, identity)
            )
          )
          .query(({ input }) => {
            return input;
          }),
      });
      const response = await resolveProcedureCall({
        router: inputValidationRouter,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'echo,echo,echo',
          input: { 0: 'foo', 1: 'bar', 2: 'baz' },
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalled();
      if (Array.isArray(response)) {
        expect(response[0]).toEqual({ result: { data: 'foo' } });
        expect(response[1]).toEqual({ result: { data: 'bar' } });
        expect(response[2]).toMatchObject({
          error: {
            code: -32600,
            message: expect.stringContaining(
              'Unexpected echo input: Invalid value "baz"'
            ),
            data: {
              code: 'BAD_REQUEST',
              path: 'echo',
            },
          },
        });
      } else {
        fail('Expected array response');
      }
    });

    it('should succeed with mixed result if some procedure calls fail', async () => {
      const tRPC = initTRPC.create();
      const inputValidationRouter = tRPC.router({
        echo: tRPC.procedure
          .input(
            flow(
              t.keyof({
                foo: null,
                bar: null,
                baz: null,
              }).decode,
              E.fold((e) => {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Unexpected echo input: ${PathReporter.failure(
                    e
                  ).join(', ')}`,
                });
              }, identity)
            )
          )
          .query(({ input }) => {
            if (input === 'bar') {
              throw new Error('Input "bar" not allowed');
            }
            return input;
          }),
      });
      const response = await resolveProcedureCall({
        router: inputValidationRouter,
        createContext: () =>
          Promise.resolve({
            user: 'fake-user',
          }),
        unverifiedCallOptions: {
          type: 'query',
          path: 'echo,echo,echo',
          input: { 0: 'foo', 1: 'bar', 2: 'baz' },
          isBatchCall: true,
        },
        onError: onErrorMock,
      });

      expect(onErrorMock).toBeCalled();
      if (Array.isArray(response)) {
        expect(response[0]).toEqual({ result: { data: 'foo' } });
        expect(response[1]).toMatchObject({
          error: {
            code: -32603,
            message: expect.stringContaining('Input "bar" not allowed'),
            data: {
              code: 'INTERNAL_SERVER_ERROR',
              path: 'echo',
            },
          },
        });
        expect(response[2]).toEqual({ result: { data: 'baz' } });
      } else {
        fail('Expected array response');
      }
    });
  });
});
