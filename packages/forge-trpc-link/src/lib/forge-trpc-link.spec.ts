import { observableToPromise } from '@trpc/server/observable';

const customUiBridgeRequestMock = jest.fn();
jest.mock('./custom-ui-bridge-request', () => ({
  customUiBridgeRequest: customUiBridgeRequestMock,
}));
import { customUiBridgeLink } from './forge-trcp-link';

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

const link = customUiBridgeLink({
  resolverFunctionKey: 'rpc',
  transformer: {
    serialize: (v) => v,
    deserialize: (v) => v,
  },
});

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
      const customUiBridgeLinkObservable = link({})({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
          signal: undefined,
        },
        next: jest.fn(),
      });

      const result = await observableToPromise(customUiBridgeLinkObservable);

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
      const customizedLink = customUiBridgeLink({
        resolverFunctionKey: 'rpc',
        transformer: {
          serialize: (v) => v,
          deserialize: (v) => ({ x: v }),
        },
      });
      const customUiBridgeLinkObservable = customizedLink({})({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
          signal: undefined,
        },
        next: jest.fn(),
      });

      const result = await observableToPromise(customUiBridgeLinkObservable);

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

      const customUiBridgeLinkObservable = link({})({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
          signal: undefined,
        },
        next: jest.fn(),
      });

      // Make sure a fulfilled promise does not pass the test
      // https://jestjs.io/docs/tutorial-async#rejects
      expect.assertions(1);

      await expect(
        observableToPromise(customUiBridgeLinkObservable)
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
      const customizedLink = customUiBridgeLink({
        transformer: {
          serialize: (v) => v,
          deserialize: (v) => ({
            ...v,
            message: customDeserializerMessage,
          }),
        },
      });
      const customUiBridgeLinkObservable = customizedLink({})({
        op: {
          id: 123,
          type: 'query',
          input: { one: 'abc', two: 'xyz' },
          path: 'test',
          context: {},
          signal: undefined,
        },
        next: jest.fn(),
      });

      // Make sure a fulfilled promise does not pass the test
      // https://jestjs.io/docs/tutorial-async#rejects
      expect.assertions(1);

      await expect(
        observableToPromise(customUiBridgeLinkObservable)
      ).rejects.toMatchObject({
        name: 'TRPCClientError',
        message: customDeserializerMessage,
        data: fakeResponseData,
        cause: undefined,
      });
    });
  });
});
