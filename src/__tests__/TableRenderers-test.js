import {buildDisplayItems} from '../TableRenderers';
import {PivotData} from '../Utilities';
/* eslint-disable no-magic-numbers */

const fixtureData = [
  ['name', 'gender', 'colour', 'birthday', 'trials', 'successes'],
  ['Nick', 'male', 'blue', '1982-11-07', 103, 12],
  ['Jane', 'female', 'red', '1982-11-08', 95, 25],
  ['John', 'male', 'blue', '1982-12-08', 112, 30],
  ['Carol', 'female', 'yellow', '1983-12-08', 102, 14],
];

const sep = String.fromCharCode(0);

describe('buildDisplayItems', function() {
  const pd = new PivotData({
    data: fixtureData,
    rows: ['gender', 'colour', 'name'],
  });
  const rowKeys = pd.getRowKeys();
  const attrs = ['gender', 'colour', 'name'];

  it('produces correct 3-level row keys', () => {
    expect(rowKeys).toEqual([
      ['female', 'red', 'Jane'],
      ['female', 'yellow', 'Carol'],
      ['male', 'blue', 'John'],
      ['male', 'blue', 'Nick'],
    ]);
  });

  describe('with grouping + subtotals', function() {
    it('shows level-0 subtotal when only level 0 is expanded', () => {
      const expanded = {female: true, male: true};
      const items = buildDisplayItems(rowKeys, attrs, expanded, true, true);
      expect(items).toEqual([
        {key: ['female', 'red'], isSummary: true, isSubtotal: false},
        {key: ['female', 'yellow'], isSummary: true, isSubtotal: false},
        {key: ['female'], isSummary: false, isSubtotal: true},
        {key: ['male', 'blue'], isSummary: true, isSubtotal: false},
        {key: ['male'], isSummary: false, isSubtotal: true},
      ]);
    });

    it('shows subtotals at all expanded levels when all levels expanded', () => {
      const expanded = {
        female: true,
        male: true,
        ['female' + sep + 'red']: true,
        ['female' + sep + 'yellow']: true,
        ['male' + sep + 'blue']: true,
      };
      const items = buildDisplayItems(rowKeys, attrs, expanded, true, true);
      expect(items).toEqual([
        {key: ['female', 'red', 'Jane'], isSummary: false, isSubtotal: false},
        {key: ['female', 'red'], isSummary: false, isSubtotal: true},
        {
          key: ['female', 'yellow', 'Carol'],
          isSummary: false,
          isSubtotal: false,
        },
        {key: ['female', 'yellow'], isSummary: false, isSubtotal: true},
        {key: ['female'], isSummary: false, isSubtotal: true},
        {key: ['male', 'blue', 'John'], isSummary: false, isSubtotal: false},
        {key: ['male', 'blue', 'Nick'], isSummary: false, isSubtotal: false},
        {key: ['male', 'blue'], isSummary: false, isSubtotal: true},
        {key: ['male'], isSummary: false, isSubtotal: true},
      ]);
    });

    it('shows only top-level summaries when nothing is expanded', () => {
      const items = buildDisplayItems(rowKeys, attrs, {}, true, true);
      expect(items).toEqual([
        {key: ['female'], isSummary: true, isSubtotal: false},
        {key: ['male'], isSummary: true, isSubtotal: false},
      ]);
    });

    it('shows no subtotals when showSubtotals is false', () => {
      const expanded = {female: true, male: true};
      const items = buildDisplayItems(rowKeys, attrs, expanded, true, false);
      expect(items).toEqual([
        {key: ['female', 'red'], isSummary: true, isSubtotal: false},
        {key: ['female', 'yellow'], isSummary: true, isSubtotal: false},
        {key: ['male', 'blue'], isSummary: true, isSubtotal: false},
      ]);
    });

    it('shows level-1 subtotal when only level 1 is expanded (mixed)', () => {
      const expanded = {
        female: true,
        ['female' + sep + 'red']: true,
        ['female' + sep + 'yellow']: true,
        ['male' + sep + 'blue']: true,
      };
      const items = buildDisplayItems(rowKeys, attrs, expanded, true, true);
      expect(items).toEqual([
        {key: ['female', 'red', 'Jane'], isSummary: false, isSubtotal: false},
        {key: ['female', 'red'], isSummary: false, isSubtotal: true},
        {
          key: ['female', 'yellow', 'Carol'],
          isSummary: false,
          isSubtotal: false,
        },
        {key: ['female', 'yellow'], isSummary: false, isSubtotal: true},
        {key: ['female'], isSummary: false, isSubtotal: true},
        {key: ['male'], isSummary: true, isSubtotal: false},
      ]);
    });
  });

  describe('without grouping', function() {
    it('returns all keys as-is', () => {
      const items = buildDisplayItems(rowKeys, attrs, {}, false, true);
      expect(items).toEqual([
        {key: ['female', 'red', 'Jane'], isSummary: false, isSubtotal: false},
        {
          key: ['female', 'yellow', 'Carol'],
          isSummary: false,
          isSubtotal: false,
        },
        {key: ['male', 'blue', 'John'], isSummary: false, isSubtotal: false},
        {key: ['male', 'blue', 'Nick'], isSummary: false, isSubtotal: false},
      ]);
    });
  });

  describe('single-level attrs (no grouping possible)', function() {
    it('returns all keys as-is even with grouping flag', () => {
      const singleAttrs = ['gender'];
      const singleKeys = [['female'], ['male']];
      const items = buildDisplayItems(singleKeys, singleAttrs, {}, true, true);
      expect(items).toEqual([
        {key: ['female'], isSummary: false, isSubtotal: false},
        {key: ['male'], isSummary: false, isSubtotal: false},
      ]);
    });
  });
});
