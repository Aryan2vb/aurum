const fs = require('fs');
const path = require('path');

describe('role visibility permissions', () => {
  it('allows viewers to open the reports route', () => {
    const appSource = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');

    expect(appSource).toContain("allowedRoles={['OWNER', 'ADMIN', 'STAFF', 'VIEWER']}");
  });

  it('shows reports in the sidebar for viewers', () => {
    const sidebarSource = fs.readFileSync(
      path.join(__dirname, 'components/organisms/Sidebar/Sidebar.js'),
      'utf8',
    );

    expect(sidebarSource).not.toContain("item.label === 'Reports' && userRole !== 'OWNER'");
  });

  it('does not require write access to export invoice tables', () => {
    const invoiceTableSource = fs.readFileSync(
      path.join(__dirname, 'components/organisms/InvoiceTable/InvoiceTable.js'),
      'utf8',
    );

    expect(invoiceTableSource).not.toContain("{can('write') && (\n            <ImportExportMenu");
  });

  it('keeps invoice create and edit routes unavailable to viewers', () => {
    const appSource = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');

    expect(appSource).toContain("<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'STAFF']}>");
  });

  it('hides invoice write controls from read-only users', () => {
    const invoiceTableSource = fs.readFileSync(
      path.join(__dirname, 'components/organisms/InvoiceTable/InvoiceTable.js'),
      'utf8',
    );
    const invoiceDetailSource = fs.readFileSync(
      path.join(__dirname, 'components/molecules/InvoiceDetailModal/InvoiceDetailModal.js'),
      'utf8',
    );

    expect(invoiceTableSource).toContain("canWrite && status !== 'CANCELLED'");
    expect(invoiceTableSource).toContain('canWrite && hasBalance');
    expect(invoiceDetailSource).toContain("canWrite && invoice.status !== 'CANCELLED'");
    expect(invoiceDetailSource).toContain("canWrite && (invoice.status === 'UNPAID' || invoice.status === 'PARTIAL')");
    expect(invoiceDetailSource).toContain("canDelete && invoice.status !== 'CANCELLED'");
  });
});
