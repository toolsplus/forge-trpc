import { TRPCClientRuntime } from '@trpc/client';
import { defaultResolverFunctionKey } from '@forge-trpc/forge-trpc-protocol';

const invokeMock = jest.fn();
jest.mock('@forge/bridge', () => ({
  invoke: invokeMock,
}));
import { customUiBridgeRequest } from './custom-ui-bridge-request';

const mockRuntime: TRPCClientRuntime = {
  transformer: {
    serialize: (v) => v,
    deserialize: (v) => v,
  },
};

const baseOptions = {
  path: 'test',
  input: { test: 'abc' },
};

describe('customUiBridgeRequest', () => {
  describe('single requests', () => {
    it('query request', async () => {
      const options = {
        ...baseOptions,
        type: 'query',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: mockRuntime,
      });
      expect(invokeMock).toBeCalledWith(
        defaultResolverFunctionKey,
        expect.objectContaining({
          ...options,
          isBatchCall: false,
        })
      );
    });

    it('mutation request', async () => {
      const options = {
        ...baseOptions,
        type: 'mutation',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: mockRuntime,
      });
      expect(invokeMock).toBeCalledWith(
        defaultResolverFunctionKey,
        expect.objectContaining({
          ...options,
          isBatchCall: false,
        })
      );
    });

    it('custom resolver function key', async () => {
      const functionKey = 'custom-resolver-function-key';
      const options = {
        ...baseOptions,
        type: 'query',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: mockRuntime,
        resolverFunctionKey: functionKey,
      });
      expect(invokeMock).toBeCalledWith(
        functionKey,
        expect.objectContaining({
          ...options,
          isBatchCall: false,
        })
      );
    });

    it('custom input serializer', async () => {
      const options = {
        ...baseOptions,
        type: 'query',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: {
          transformer: {
            serialize: (v) => JSON.stringify(v),
            deserialize: (v) => v,
          },
        },
      });
      expect(invokeMock).toBeCalledWith(
        defaultResolverFunctionKey,
        expect.objectContaining({
          path: options.path,
          input: JSON.stringify(options.input),
          isBatchCall: false,
        })
      );
    });
  });

  describe('batch requests', () => {
    const inputs = [{ one: 'abc' }, { two: 'xyz' }];

    it('batch query', async () => {
      const options = {
        path: baseOptions.path,
        inputs,
        type: 'query',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: mockRuntime,
      });
      expect(invokeMock).toBeCalledWith(
        defaultResolverFunctionKey,
        expect.objectContaining({
          type: options.type,
          path: options.path,
          input: { 0: inputs[0], 1: inputs[1] },
          isBatchCall: true,
        })
      );
    });

    it('custom batch input serializer', async () => {
      const options = {
        path: baseOptions.path,
        inputs,
        type: 'query',
      } as const;
      await customUiBridgeRequest({
        ...options,
        runtime: {
          transformer: {
            serialize: (v) => JSON.stringify(v),
            deserialize: (v) => v,
          },
        },
      });
      expect(invokeMock).toBeCalledWith(
        defaultResolverFunctionKey,
        expect.objectContaining({
          type: options.type,
          path: options.path,
          input: { 0: JSON.stringify(inputs[0]), 1: JSON.stringify(inputs[1]) },
          isBatchCall: true,
        })
      );
    });
  });
});
