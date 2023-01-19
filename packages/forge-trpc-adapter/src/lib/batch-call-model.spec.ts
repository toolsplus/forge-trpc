import * as E from 'fp-ts/Either';
import { PositiveIntegerFromString } from './batch-call.model';

describe('batch call model', () => {
  describe('PositiveIntegerFromString', () => {
    it('should successfully decode positive string values', () => {
      expect(PositiveIntegerFromString.decode('1')).toEqual(E.right(1));
      expect(PositiveIntegerFromString.decode('1.0')).toEqual(E.right(1));
      expect(PositiveIntegerFromString.decode('0')).toEqual(E.right(0));
      expect(PositiveIntegerFromString.decode('0.0')).toEqual(E.right(0));
      expect(PositiveIntegerFromString.decode('99999')).toEqual(E.right(99999));
    });

    it('should fail to decode decimal and negative values', () => {
      expect(PositiveIntegerFromString.decode('-1')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('-99999')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('-1.1')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('1.1')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('1.00001')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('-9.9999')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('9.9999')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('a-string')).toMatchObject({
        _tag: 'Left',
      });
      expect(PositiveIntegerFromString.decode('NaN')).toMatchObject({
        _tag: 'Left',
      });
    });
  });
});
