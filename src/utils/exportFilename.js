const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const formatFilterDate = (date) => {
  if (!date) return '';

  const [year, month, day] = date.split('-');
  if (!year || !month || !day || !MONTHS[Number(month) - 1]) return date;

  return `${day}-${MONTHS[Number(month) - 1]}-${year}`;
};

export const getDateRangeFilenameQualifier = ({ dateFrom, dateTo } = {}) => {
  const formattedFrom = formatFilterDate(dateFrom);
  const formattedTo = formatFilterDate(dateTo);

  if (formattedFrom && formattedTo) {
    return formattedFrom === formattedTo
      ? formattedFrom
      : `${formattedFrom} to ${formattedTo}`;
  }
  if (formattedFrom) return `From ${formattedFrom}`;
  if (formattedTo) return `Up to ${formattedTo}`;
  return 'All Time';
};

export const buildExportFilename = (filename, extension, qualifier) => {
  if (qualifier) return `${filename} - ${qualifier}.${extension}`;

  const exportDate = new Date().toISOString().split('T')[0];
  return `${filename}_${exportDate}.${extension}`;
};
