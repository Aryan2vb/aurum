import {
  puritiesForMetal,
  purityLabelsForMetal,
  withOrphanPurityOption,
} from './metalPurities';

describe('metalPurities helpers', () => {
  const list = [
    { metalType: 'GOLD', label: '22K', sortOrder: 1, isActive: true },
    { metalType: 'GOLD', label: '24K', sortOrder: 0, isActive: true },
    { metalType: 'GOLD', label: '18K', sortOrder: 3, isActive: false },
    { metalType: 'SILVER', label: 'fancy', sortOrder: 2, isActive: true },
    { metalType: 'SILVER', label: 'F', sortOrder: 0, isActive: true },
  ];

  it('filters and sorts active labels for a metal', () => {
    expect(purityLabelsForMetal(list, 'GOLD')).toEqual(['24K', '22K']);
    expect(purityLabelsForMetal(list, 'SILVER')).toEqual(['F', 'fancy']);
  });

  it('can include inactive rows for settings', () => {
    expect(puritiesForMetal(list, 'GOLD', { includeInactive: true }).map((r) => r.label)).toEqual([
      '24K',
      '22K',
      '18K',
    ]);
  });

  it('appends orphan current purity for edit forms', () => {
    expect(withOrphanPurityOption(['22K', '20K'], '916/22k')).toEqual(['22K', '20K', '916/22k']);
    expect(withOrphanPurityOption(['22K'], '22K')).toEqual(['22K']);
  });
});
