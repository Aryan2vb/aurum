/**
 * Active (or all) org purity labels for a metal, sorted by sortOrder then label.
 */
export const puritiesForMetal = (list = [], metalType, { includeInactive = false } = {}) => {
  if (!metalType) return [];
  return [...list]
    .filter(
      (row) =>
        row.metalType === metalType &&
        (includeInactive || row.isActive !== false),
    )
    .sort((a, b) => {
      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (order !== 0) return order;
      return String(a.label).localeCompare(String(b.label));
    });
};

export const purityLabelsForMetal = (list = [], metalType) =>
  puritiesForMetal(list, metalType).map((row) => row.label);

/** Keep current value in the dropdown even if it was soft-hidden or legacy. */
export const withOrphanPurityOption = (labels = [], current) => {
  if (!current || labels.includes(current)) return labels;
  return [...labels, current];
};
