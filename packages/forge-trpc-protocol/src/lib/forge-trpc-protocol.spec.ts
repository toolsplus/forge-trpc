import * as E from 'fp-ts/Either'
import {procedureTypeCodec} from './forge-trpc-protocol';

describe('Forge tRPC protocol', () => {
  describe('procedureTypeCodec', () => {
    it('should accept query type', () => {
      expect(procedureTypeCodec.decode('query')).toEqual(E.right('query'));
    });
    it('should accept mutation type', () => {
      expect(procedureTypeCodec.decode('mutation')).toEqual(E.right('mutation'));
    });
    it('should accept query type', () => {
      expect(procedureTypeCodec.decode('subscription')).toEqual(E.right('subscription'));
    });
    it('should not accept invalid type', () => {
      expect(E.isLeft(procedureTypeCodec.decode('test'))).toEqual(true);
    });
  })
});
