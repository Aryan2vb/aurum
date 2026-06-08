import fs from 'fs';
import path from 'path';

describe('ImportExportMenu PDF export settings', () => {
  it('generates PDFs on FS landscape paper instead of A3', () => {
    const source = fs.readFileSync(path.join(__dirname, 'ImportExportMenu.js'), 'utf8');

    expect(source).toContain('FS_LANDSCAPE_FORMAT_PT');
    expect(source).toContain('format: FS_LANDSCAPE_FORMAT_PT');
    expect(source).not.toContain("format: 'a3'");
  });
});
