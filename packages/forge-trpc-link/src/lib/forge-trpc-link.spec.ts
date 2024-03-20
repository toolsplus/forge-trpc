import { TRPCClientRuntime } from '@trpc/client';
import { observableToPromise } from '@trpc/server/observable';

const customUiBridgeRequestMock = jest.fn();
jest.mock('./custom-ui-bridge-request', () => ({
  customUiBridgeRequest: customUiBridgeRequestMock,
}));
import { customUiBridgeLink } from './forge-trcp-link';

const mockRuntime: TRPCClientRuntime = {
  transformer: {
    serialize: (v) => v,
    deserialize: (v) => v,
  },
  combinedTransformer: {
    input: {
      serialize: (v) => v,
      deserialize: (v) => v,
    },
    output: {
      serialize: (v) => v,
      deserialize: (v) => v,
    }
  }
};

const tRPCSuccessResponse = <T>({ id, data }: { id: number; data: T }) => ({
  id,
  jsonrpc: '2.0',
  result: { type: 'data', data },
});

const tRPCErrorResponse = <T>({
  id,
  code,
  message,
  data,
}: {
  id: number;
  code: number;
  message: string;
  data: T;
}) => ({
  id,
  jsonrpc: '2.0',
  error: { code, message, data },
});

const link = customUiBridgeLink({});

describe('customUiBridgeLink', () => {
  afterEach(() => {
    customUiBridgeRequestMock.mockReset();
  });

  describe('tRPC success response', () => {
    it('should handle a tRPC success response', async () => {
      const fakeResponseData = 'fake-response-data';
      customUiBridgeRequestMock.mockImplementation(() =>
        Promise.resolve(
          tRPCSuccessResponse({ id: 123, data: fakeResponseData })
        )
      );
      const customUiBridgeLinkObservable = link(mockRuntime)({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
        },
        next: jest.fn(),
      });

      const result = await observableToPromise(customUiBridgeLinkObservable)
        .promise;

      expect(result).toEqual({
        result: {
          type: 'data',
          data: fakeResponseData,
        },
      });
    });

    it('should apply custom deserializer', async () => {
      const fakeResponseData = 'fake-response-data';
      customUiBridgeRequestMock.mockImplementation(() =>
        Promise.resolve(
          tRPCSuccessResponse({ id: 123, data: fakeResponseData })
        )
      );
      const customUiBridgeLinkObservable = link({
        transformer: {
          serialize: (v) => v,
          deserialize: (v) => ({ x: v }),
        },
        combinedTransformer: mockRuntime.combinedTransformer
      })({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
        },
        next: jest.fn(),
      });

      const result = await observableToPromise(customUiBridgeLinkObservable)
        .promise;

      expect(result).toEqual({
        result: {
          type: 'data',
          data: { x: fakeResponseData },
        },
      });
    });
  });

  describe('tRPC error response', () => {
    it('should handle a tRPC error response', async () => {
      const fakeResponseData = 'fake-response-data';
      const fakeErrorMessage = 'fake-error-message';
      customUiBridgeRequestMock.mockImplementation(() =>
        Promise.resolve(
          tRPCErrorResponse({
            id: 123,
            code: -32004,
            message: fakeErrorMessage,
            data: fakeResponseData,
          })
        )
      );

      const customUiBridgeLinkObservable = link(mockRuntime)({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
        },
        next: jest.fn(),
      });

      // Make sure a fulfilled promise does not pass the test
      // https://jestjs.io/docs/tutorial-async#rejects
      expect.assertions(1);

      await expect(
        observableToPromise(customUiBridgeLinkObservable).promise
      ).rejects.toMatchObject({
        name: 'TRPCClientError',
        message: fakeErrorMessage,
        data: fakeResponseData,
        cause: undefined,
      });
    });

    it('should apply custom deserializer', async () => {
      const fakeResponseData = 'fake-response-data';
      const fakeErrorMessage = 'fake-error-message';
      customUiBridgeRequestMock.mockImplementation(() =>
        Promise.resolve(
          tRPCErrorResponse({
            id: 123,
            code: -32004,
            message: fakeErrorMessage,
            data: fakeResponseData,
          })
        )
      );

      const customDeserializerMessage = 'custom-deserializer-message';
      const customUiBridgeLinkObservable = link({
        transformer: {
          serialize: (v) => v,
          deserialize: (v) => ({
            ...v,
            message: customDeserializerMessage,
          }),
        },
        combinedTransformer: mockRuntime.combinedTransformer
      })({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
        },
        next: jest.fn(),
      });

      // Make sure a fulfilled promise does not pass the test
      // https://jestjs.io/docs/tutorial-async#rejects
      expect.assertions(1);

      await expect(
        observableToPromise(customUiBridgeLinkObservable).promise
      ).rejects.toMatchObject({
        name: 'TRPCClientError',
        message: customDeserializerMessage,
        data: fakeResponseData,
        cause: undefined,
      });
    });
  });
});
