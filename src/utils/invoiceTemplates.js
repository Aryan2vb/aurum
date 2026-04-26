import { calcItemAmount } from './invoiceCalc';

export function generateInvoiceHtml(data) {
    const {
        company,
        buyer,
        metadata,
        items,
        taxes,
        hsnSummary,
        roundOff,
        totalAmount,
        amountInWords,
        taxAmountInWords,
        declaration = 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    } = data;

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const hallmarkingCharge = data.totalHallmarkingCharges !== undefined ? data.totalHallmarkingCharges : 0;

    const itemRows = items.map(item => {
        const { effectiveRate, makingChargesAmount } = calcItemAmount(item);
        const rateDisplay = makingChargesAmount > 0
            ? `<strong>${formatCurrency(effectiveRate)}</strong><br/><span style="font-size:11px;">+ ${formatCurrency(makingChargesAmount)} Making Charge</span>`
            : formatCurrency(effectiveRate);

        const descLines = (item.description || '').split('\n');
        const huidLine = item.huid ? `<br/><span class="text-sm"><strong>HUID:</strong> ${item.huid}</span>` : '';

        return `<tr>
      <td class="text-center">${item.slNo}</td>
      <td><strong>${descLines[0] || ''}</strong>${descLines.slice(1).map(l => `<br/><span class="text-sm">${l}</span>`).join('')}${huidLine}</td>
      <td class="text-center">${item.hsnSac || ''}</td>
      <td class="text-right">${item.grossWeight ? formatCurrency(item.grossWeight) + ' GMS' : ''}</td>
      <td class="text-right">${item.netWeight ? formatCurrency(item.netWeight) + ' GMS' : ''}</td>
      <td class="text-right">${rateDisplay}</td>
      <td class="text-right">${formatCurrency(item.amount || 0)}</td>
    </tr>`;
    }).join('');

    const hsnRows = hsnSummary.map(hsn => `<tr>
      <td>${hsn.hsnSac || ''}</td>
      <td class="text-right">${formatCurrency(hsn.taxableValue || 0)}</td>
      <td class="text-center">${hsn.cgstRate || 0}%</td>
      <td class="text-right">${formatCurrency(hsn.cgstAmount || 0)}</td>
      <td class="text-center">${hsn.sgstRate || 0}%</td>
      <td class="text-right">${formatCurrency(hsn.sgstAmount || 0)}</td>
      <td class="text-right">${formatCurrency(hsn.totalTaxAmount || 0)}</td>
    </tr>`).join('');

    const totalTaxableValue = hsnSummary.reduce((sum, h) => sum + (h.taxableValue || 0), 0);
    const totalCgst = hsnSummary.reduce((sum, h) => sum + (h.cgstAmount || 0), 0);
    const totalSgst = hsnSummary.reduce((sum, h) => sum + (h.sgstAmount || 0), 0);
    const totalTax = hsnSummary.reduce((sum, h) => sum + (h.totalTaxAmount || 0), 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${metadata.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
    .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .border { border: 1px solid #000; }
    .border-t { border-top: 1px solid #000; }
    .border-b { border-bottom: 1px solid #000; }
    .border-l { border-left: 1px solid #000; }
    .border-r { border-right: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; }
    .items-table { border: 1px solid #000; }
    .items-table th { border: 1px solid #000; padding: 6px 8px; background: #f5f5f5; font-weight: bold; }
    .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 4px 8px; }
    .items-table tbody tr:last-child td { border-bottom: 1px solid #000; }
    .hsn-table th, .hsn-table td { border: 1px solid #000; padding: 4px 8px; }
    .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
    .font-bold { font-weight: bold; } .text-sm { font-size: 11px; } .text-lg { font-size: 14px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; }
    .mantra-text { text-align: center; font-size: 11px; font-style: italic; padding: 6px 8px; }
    .logo-container { display: flex; justify-content: center; align-items: center; padding: 15px 8px; border: 1px solid #000; border-bottom: none; position: relative; }
    .logo-container .main-logo img { max-height: 80px; max-width: 200px; object-fit: contain; }
    .logo-container .bis-logo { position: absolute; right: 20px; }
    .logo-container .bis-logo img { max-height: 50px; max-width: 100px; object-fit: contain; }
    .header-title { text-align: center; font-size: 16px; font-weight: bold; padding: 8px; border: 1px solid #000; border-bottom: none; }
    .company-section { display: grid; grid-template-columns: 1fr 1fr; }
    .company-left, .company-right { border: 1px solid #000; padding: 8px; }
    .company-right { border-left: none; }
    .meta-row { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000; }
    .meta-row:last-child { border-bottom: none; }
    .meta-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 24px; }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 10px; color: #666; }
    .tax-row td { padding-top: 2px; padding-bottom: 2px; }
    .total-row { font-weight: bold; background: #f5f5f5; }
    .total-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .footer-section { border: 1px solid #000; border-top: none; }
    .declaration-section { display: grid; grid-template-columns: 2fr 1fr; }
    .signature-box { text-align: right; padding: 20px 10px 10px; border-left: 1px solid #000; }
    .computer-generated { text-align: center; padding: 8px; font-style: italic; font-size: 11px; border-top: 1px solid #000; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .invoice-container { padding: 0; max-width: 100%; } @page { margin: 10mm; size: A4; } }
  </style>
</head>
<body>
  <div class="invoice-container">
    ${company.mantra ? `<div class="mantra-text">${company.mantra}</div>` : ''}
    ${(company.logo || company.bisLogo) ? `<div class="logo-container">
      ${company.logo ? `<div class="main-logo"><img src="${company.logo}" alt="${company.name} Logo"/></div>` : ''}
      ${company.bisLogo ? `<div class="bis-logo"><img src="${company.bisLogo}" alt="BIS Hallmarked"/></div>` : ''}
    </div>` : ''}
    <div class="header-title">Tax Invoice</div>
    <div class="company-section">
      <div class="company-left">
        <div class="font-bold text-lg mb-1">${company.name || ''}</div>
        <div class="mb-1">${company.address || ''}</div>
        <div class="mb-1">GSTIN/UIN: ${company.gstin || ''}</div>
        <div class="mb-2">State Name: ${company.state || ''}, Code: ${company.stateCode || ''}</div>
        <div class="font-bold mb-1">Buyer (Bill to)</div>
        <div class="font-bold">${buyer.name || ''}</div>
        <div>${buyer.address || ''}</div>
        ${buyer.phone ? `<div>Phn No-${buyer.phone}</div>` : ''}
        <div>State Name: ${buyer.state || ''}, Code: ${buyer.stateCode || ''}</div>
      </div>
      <div class="company-right">
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Invoice No.</div><div class="font-bold">${metadata.invoiceNo || ''}</div></div><div class="meta-cell"><div class="meta-label">Dated</div><div class="font-bold">${metadata.date || ''}</div></div></div>
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Delivery Note</div><div>${metadata.deliveryNote || ''}</div></div><div class="meta-cell"><div class="meta-label">Mode of Payment</div><div>${data.payments?.length ? data.payments.map(p => p.mode).join(', ') : (metadata.modeOfPayment || '')}</div></div></div>
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Reference No. &amp; Date</div><div>${metadata.referenceNo || ''} ${metadata.referenceDate || ''}</div></div><div class="meta-cell"><div class="meta-label">Other References</div><div></div></div></div>
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Buyer's Order No.</div><div>${metadata.buyerOrderNo || ''}</div></div><div class="meta-cell"><div class="meta-label">Dated</div><div>${metadata.buyerOrderDate || ''}</div></div></div>
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Dispatch Doc No.</div><div>${metadata.dispatchDocNo || ''}</div></div><div class="meta-cell"><div class="meta-label">Delivery Note Date</div><div>${metadata.deliveryNoteDate || ''}</div></div></div>
        <div class="meta-row"><div class="meta-cell"><div class="meta-label">Dispatched through</div><div>${metadata.dispatchedThrough || ''}</div></div><div class="meta-cell"><div class="meta-label">Destination</div><div>${metadata.destination || ''}</div></div></div>
        <div class="meta-row"><div class="meta-cell" style="grid-column:span 2;"><div class="meta-label">Terms of Delivery</div><div>${metadata.termsOfDelivery || ''}</div></div></div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr>
        <th class="text-center" style="width:35px;">Sl<br/>No.</th>
        <th class="text-left">Description of Goods</th>
        <th class="text-center" style="width:80px;">HSN/SAC</th>
        <th class="text-center" style="width:70px;">Gross<br/>Weight</th>
        <th class="text-center" style="width:70px;">Net<br/>Weight</th>
        <th class="text-center" style="width:100px;">Rate</th>
        <th class="text-right" style="width:100px;">Amount</th>
      </tr></thead>
      <tbody>
        ${itemRows}
        <tr class="tax-row"><td class="text-right font-bold">Taxable Value:</td><td></td><td></td><td></td><td></td><td></td><td class="text-right font-bold">${formatCurrency(totalTaxableValue)}</td></tr>
        ${hallmarkingCharge > 0 ? `<tr class="tax-row"><td class="text-right">Hallmarking Charges:</td><td></td><td></td><td></td><td></td><td></td><td class="text-right">${formatCurrency(hallmarkingCharge)}</td></tr>` : ''}
        <tr class="tax-row"><td></td><td class="text-right font-bold">CGST(${taxes.cgstRate || 0}%)</td><td></td><td></td><td></td><td></td><td class="text-right">${formatCurrency(taxes.cgstAmount || 0)}</td></tr>
        <tr class="tax-row"><td></td><td class="text-right font-bold">SGST(${taxes.sgstRate || 0}%)</td><td></td><td></td><td></td><td></td><td class="text-right">${formatCurrency(taxes.sgstAmount || 0)}</td></tr>
        ${taxes.igstRate && taxes.igstRate > 0 ? `<tr class="tax-row"><td></td><td class="text-right font-bold">IGST(${taxes.igstRate}%)</td><td></td><td></td><td></td><td></td><td class="text-right">${formatCurrency(taxes.igstAmount || 0)}</td></tr>` : ''}
        <tr class="tax-row"><td>Less:</td><td class="text-right font-bold">ROUND OFF</td><td></td><td></td><td></td><td></td><td class="text-right">${roundOff >= 0 ? '' : '(-)'}${formatCurrency(Math.abs(roundOff || 0))}</td></tr>
        ${Array(3).fill('<tr style="height:16px;"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
        <tr class="total-row"><td></td><td class="text-right">Total</td><td></td><td></td><td></td><td></td><td class="text-right font-bold text-lg">₹${formatCurrency(totalAmount || 0)}</td></tr>
        ${
          data.payments && data.payments.length > 0
            ? data.payments.map(p => `
        <tr class="tax-row">
          <td colspan="6" class="text-right">${p.mode} Received</td>
          <td class="text-right">${formatCurrency(p.amount || 0)}</td>
        </tr>`).join('')
            : (data.cashReceived || 0) > 0
            ? `
        <tr class="tax-row">
          <td colspan="6" class="text-right">Paid Amount</td>
          <td class="text-right">${formatCurrency(data.cashReceived || 0)}</td>
        </tr>`
            : ''
        }
        <tr class="tax-row">
          <td colspan="6" class="text-right font-bold" style="font-size: 14px;">Balance Due</td>
          <td class="text-right font-bold" style="font-size: 14px;">₹${formatCurrency(data.amtBalance || 0)}</td>
        </tr>
      </tbody>
    </table>
    <div class="border border-t-0 px-2 py-1"><span>Amount Chargeable (in words)</span><span style="float:right;">E. &amp; O.E</span></div>
    <div class="border border-t-0 px-2 py-1 font-bold">${amountInWords || ''}</div>
    <table class="hsn-table">
      <thead>
        <tr><th rowspan="2">HSN/SAC</th><th rowspan="2">Taxable<br/>Value</th><th colspan="2">CGST</th><th colspan="2">SGST/UTGST</th><th rowspan="2">Total<br/>Tax Amount</th></tr>
        <tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr>
      </thead>
      <tbody>
        ${hsnRows}
        <tr class="total-row"><td class="text-right">Total</td><td class="text-right">${formatCurrency(totalTaxableValue)}</td><td></td><td class="text-right">${formatCurrency(totalCgst)}</td><td></td><td class="text-right">${formatCurrency(totalSgst)}</td><td class="text-right">${formatCurrency(totalTax)}</td></tr>
      </tbody>
    </table>
    <div class="border border-t-0 px-2 py-1">Tax Amount (in words) : <strong>${taxAmountInWords || ''}</strong></div>
    <div class="footer-section declaration-section">
      <div class="px-2 py-2"><div class="font-bold mb-1">Declaration</div><div class="text-sm">${declaration}</div></div>
      <div class="signature-box"><div class="mb-1">for ${company.name || ''}</div><div style="height:40px;"></div><div>Authorised Signatory</div></div>
    </div>
    <div class="computer-generated">This is a Computer Generated Invoice</div>
  </div>
</body>
</html>`.trim();
}

export function generateModernInvoiceHtml(data) {
    const {
        company,
        buyer,
        metadata,
        items,
        taxes,
        hsnSummary,
        roundOff,
        totalAmount,
        amountInWords,
        taxAmountInWords,
        declaration = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
    } = data;

    const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    const totalTaxableValue = hsnSummary.reduce((s, h) => s + (h.taxableValue || 0), 0);
    const totalCgst = hsnSummary.reduce((s, h) => s + (h.cgstAmount || 0), 0);
    const totalSgst = hsnSummary.reduce((s, h) => s + (h.sgstAmount || 0), 0);
    const totalTax = hsnSummary.reduce((s, h) => s + (h.totalTaxAmount || 0), 0);

    const itemRows = items.map(item => `
        <tr>
            <td style="text-align:center;padding:10px 8px;border-bottom:1px solid #eee;">${item.slNo}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:500;">${item.description || ''}</td>
            <td style="text-align:center;padding:10px 8px;border-bottom:1px solid #eee;color:#666;">${item.hsnSac || ''}</td>
            <td style="text-align:center;padding:10px 8px;border-bottom:1px solid #eee;">${item.quantity || 0} ${item.unit || ''}</td>
            <td style="text-align:right;padding:10px 8px;border-bottom:1px solid #eee;">₹${fmt(item.rate || 0)}</td>
            <td style="text-align:right;padding:10px 8px;border-bottom:1px solid #eee;font-weight:600;">₹${fmt(item.amount || 0)}</td>
        </tr>
    `).join('');

    const hsnRows = hsnSummary.map(h => `
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${h.hsnSac || ''}</td>
            <td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;">₹${fmt(h.taxableValue || 0)}</td>
            <td style="text-align:center;padding:6px 10px;border-bottom:1px solid #eee;">${h.cgstRate || 0}%</td>
            <td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;">₹${fmt(h.cgstAmount || 0)}</td>
            <td style="text-align:center;padding:6px 10px;border-bottom:1px solid #eee;">${h.sgstRate || 0}%</td>
            <td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;">₹${fmt(h.sgstAmount || 0)}</td>
            <td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;font-weight:600;">₹${fmt(h.totalTaxAmount || 0)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${metadata.invoiceNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
        .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #2563eb; }
        .company-name { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .company-info { color: #64748b; font-size: 12px; line-height: 1.6; }
        .invoice-badge { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 1px; }
        .invoice-meta { text-align: right; margin-top: 8px; }
        .invoice-meta div { font-size: 12px; color: #64748b; margin-top: 3px; }
        .invoice-meta strong { color: #1e293b; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 10px; }
        .buyer-card { background: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; }
        .buyer-name { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .buyer-info { font-size: 12px; color: #64748b; line-height: 1.6; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .meta-item { background: #f8fafc; border-radius: 6px; padding: 8px 12px; border: 1px solid #e2e8f0; }
        .meta-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-size: 12px; font-weight: 500; color: #1e293b; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; }
        .items-table th { background: #f1f5f9; padding: 10px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .subtotal-section { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .subtotal-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #475569; }
        .total-row-modern { display: flex; justify-content: space-between; padding: 12px 0 4px; font-size: 18px; font-weight: 700; color: #1e293b; border-top: 2px solid #e2e8f0; margin-top: 8px; }
        .words-box { background: #eff6ff; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #1e40ad; margin-top: 12px; border-left: 3px solid #2563eb; }
        .hsn-section { margin-top: 24px; }
        .hsn-table th { background: #f1f5f9; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        .declaration-text { font-size: 11px; color: #64748b; line-height: 1.6; }
        .signature-area { text-align: right; }
        .signature-line { border-top: 1px solid #cbd5e1; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #475569; }
        .bottom-note { text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8; font-style: italic; }
        @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .invoice { padding: 20px; max-width: 100%; }
            @page { margin: 10mm; size: A4; }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <!-- Header -->
        <div class="header">
            <div>
                <div class="company-name">${company.name || ''}</div>
                <div class="company-info">
                    ${company.address || ''}<br>
                    GSTIN: ${company.gstin || ''}<br>
                    State: ${company.state || ''} (${company.stateCode || ''})
                </div>
            </div>
            <div>
                <div class="invoice-badge">TAX INVOICE</div>
                <div class="invoice-meta">
                    <div><strong>${metadata.invoiceNo || ''}</strong></div>
                    <div>Date: <strong>${metadata.date || ''}</strong></div>
                    ${data.payments?.length ? `<div>Payment: ${data.payments.map(p => p.mode).join(', ')}</div>` : (metadata.modeOfPayment ? `<div>Payment: ${metadata.modeOfPayment}</div>` : '')}
                </div>
            </div>
        </div>

        <!-- Buyer + Meta -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
            <div class="section">
                <div class="section-title">Bill To</div>
                <div class="buyer-card">
                    <div class="buyer-name">${buyer.name || ''}</div>
                    <div class="buyer-info">
                        ${buyer.address || ''}<br>
                        ${buyer.phone ? `Phone: ${buyer.phone}<br>` : ''}
                        State: ${buyer.state || ''} (${buyer.stateCode || ''})
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="section-title">Details</div>
                <div class="meta-grid" style="grid-template-columns:1fr 1fr;">
                    ${metadata.referenceNo ? `<div class="meta-item"><div class="meta-label">Ref No.</div><div class="meta-value">${metadata.referenceNo}</div></div>` : ''}
                    ${metadata.buyerOrderNo ? `<div class="meta-item"><div class="meta-label">Buyer Order</div><div class="meta-value">${metadata.buyerOrderNo}</div></div>` : ''}
                    ${metadata.dispatchedThrough ? `<div class="meta-item"><div class="meta-label">Dispatch</div><div class="meta-value">${metadata.dispatchedThrough}</div></div>` : ''}
                    ${metadata.destination ? `<div class="meta-item"><div class="meta-label">Destination</div><div class="meta-value">${metadata.destination}</div></div>` : ''}
                    ${metadata.termsOfDelivery ? `<div class="meta-item" style="grid-column:span 2;"><div class="meta-label">Terms</div><div class="meta-value">${metadata.termsOfDelivery}</div></div>` : ''}
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <div class="section">
            <div class="section-title">Items</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="text-align:center;width:40px;">#</th>
                        <th style="text-align:left;">Description</th>
                        <th style="text-align:center;width:90px;">HSN/SAC</th>
                        <th style="text-align:center;width:80px;">Qty</th>
                        <th style="text-align:right;width:90px;">Rate</th>
                        <th style="text-align:right;width:100px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <!-- Subtotal -->
            <div class="subtotal-section">
                <div class="subtotal-row"><span>Subtotal</span><span>₹${fmt(totalTaxableValue)}</span></div>
                <div class="subtotal-row"><span>CGST @ ${taxes.cgstRate}%</span><span>₹${fmt(taxes.cgstAmount || 0)}</span></div>
                <div class="subtotal-row"><span>SGST @ ${taxes.sgstRate}%</span><span>₹${fmt(taxes.sgstAmount || 0)}</span></div>
                ${roundOff !== 0 ? `<div class="subtotal-row"><span>Round Off</span><span>${roundOff >= 0 ? '' : '(-)'}₹${fmt(Math.abs(roundOff || 0))}</span></div>` : ''}
                <div class="total-row-modern"><span>Total</span><span>₹${fmt(totalAmount || 0)}</span></div>
                ${
                  data.payments && data.payments.length > 0
                    ? data.payments
                        .map(
                          (p) => `
                <div class="subtotal-row" style="margin-top:4px;">
                  <span style="font-size:11px;color:#64748b;">${p.mode} Received</span>
                  <span style="font-size:11px;color:#64748b;font-weight:600;">₹${fmt(p.amount || 0)}</span>
                </div>`,
                        )
                        .join('')
                    : (data.cashReceived || 0) > 0
                    ? `<div class="subtotal-row" style="margin-top:4px;">
                  <span style="font-size:11px;color:#64748b;">Paid Amount</span>
                  <span style="font-size:11px;color:#64748b;font-weight:600;">₹${fmt(data.cashReceived || 0)}</span>
                </div>`
                    : ''
                }
                <div class="subtotal-row" style="margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;">
                    <span style="font-weight:700;color:#2563eb;">Balance Due</span>
                    <span style="font-weight:700;color:#2563eb;">₹${fmt(data.amtBalance || 0)}</span>
                </div>
            </div>

            <div class="words-box">
                <strong>Amount in words:</strong> ${amountInWords || ''}
            </div>
        </div>

        <!-- HSN Summary -->
        <div class="hsn-section">
            <div class="section-title">HSN/SAC Summary</div>
            <table class="hsn-table">
                <thead>
                    <tr>
                        <th style="text-align:left;">HSN/SAC</th>
                        <th style="text-align:right;">Taxable Value</th>
                        <th style="text-align:center;">CGST Rate</th>
                        <th style="text-align:right;">CGST Amt</th>
                        <th style="text-align:center;">SGST Rate</th>
                        <th style="text-align:right;">SGST Amt</th>
                        <th style="text-align:right;">Total Tax</th>
                    </tr>
                </thead>
                <tbody>
                    ${hsnRows}
                    <tr style="font-weight:600;border-top:2px solid #e2e8f0;">
                        <td style="padding:8px 10px;">Total</td>
                        <td style="text-align:right;padding:8px 10px;">₹${fmt(totalTaxableValue)}</td>
                        <td></td>
                        <td style="text-align:right;padding:8px 10px;">₹${fmt(totalCgst)}</td>
                        <td></td>
                        <td style="text-align:right;padding:8px 10px;">₹${fmt(totalSgst)}</td>
                        <td style="text-align:right;padding:8px 10px;">₹${fmt(totalTax)}</td>
                    </tr>
                </tbody>
            </table>
            <div style="font-size:11px;color:#64748b;margin-top:6px;">
                Tax Amount (in words): <strong>${taxAmountInWords || ''}</strong>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>
                <div class="section-title">Declaration</div>
                <div class="declaration-text">${declaration}</div>
            </div>
            <div class="signature-area">
                <div style="font-size:12px;color:#64748b;">for ${company.name || ''}</div>
                <div class="signature-line">Authorised Signatory</div>
            </div>
        </div>

        <div class="bottom-note">This is a Computer Generated Invoice</div>
    </div>
</body>
</html>`.trim();
}

export function generateJewelleryInvoiceHtml(data) {
    const {
        company,
        buyer,
        metadata,
        items,
        taxes,
        roundOff,
        totalAmount,
        amountInWords,
        declaration,
    } = data;

    const fmt = (n) =>
        new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    const cashReceived = data.cashReceived !== undefined ? data.cashReceived : totalAmount;
    const amtBalance = data.amtBalance !== undefined ? data.amtBalance : 0;
    
    let paymentsHtml = '';
    if (data.payments && data.payments.length > 0) {
        paymentsHtml = data.payments.map(p => `<div>${p.mode}: &nbsp; ${fmt(p.amount)}</div>`).join('');
    } else {
        paymentsHtml = `<div>CASH RECEIVED : &nbsp; ${fmt(cashReceived)}</div>`;
    }

    const itemRows = items.map(item => `
        <tr>
            <td>${(item.description || '').split('\\n')[0].replace(/GOLD JEWELLERY-\\d+\\n?/i, '').trim() || (item.description || '').split('\\n').pop()}</td>
            <td class="ctr">${item.quantity || 0}</td>
            <td class="ctr">${item.hsnSac || ''}</td>
            <td class="ctr">${item.grossWeight ? fmt(item.grossWeight) + ' GM' : (item.quantity || 0) + ' ' + (item.unit || '')}</td>
            <td class="rgt">${fmt(item.rate || 0)}</td>
            <td class="rgt">${item.makingCharges ? fmt(parseFloat(item.makingCharges) * parseFloat(item.quantity || 0)) : '-'}</td>
            <td class="rgt">${(item.hallmarkingCharge || item.hallmarkCharge) ? fmt(parseFloat(item.hallmarkingCharge || item.hallmarkCharge || 0)) : (item.huid ? '0.00' : '-')}</td>
            <td class="rgt">${fmt(item.amount || 0)}</td>
        </tr>`).join('');

    const emptyRows = Array(Math.max(0, 6 - items.length))
        .fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>')
        .join('');

    const termsDefault = `1. All disputes are subject to REWA Jurisdiction Only.
2. Interest @18% p.a. will be charged if the payment is not paid within 30 days.
3. I have checked the ornaments mentioned above and I am satisfied with the quality, rates, designs and specifications, thereof which are in perfect and acceptable condition and in taken thereof I have appended my signature here.
4. Making Charges & GST are not refundable in case of changing/exchanging of jewellery.
5. Choose wisely & purchase only if it satisfies you.`;

    const terms = declaration || termsDefault;

    const coAny = company || {};

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice - ${metadata.invoiceNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
        .invoice { max-width: 800px; margin: 0 auto; padding: 20px; border: 2px solid #000; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #000; }
        .header-left { display: flex; align-items: flex-start; gap: 12px; }
        .logo-circle { width: 60px; height: 60px; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: serif; font-size: 28px; font-weight: bold; flex-shrink: 0; }
        .header-center { text-align: center; flex: 1; }
        .mantra { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .company-name { font-size: 20px; font-weight: bold; margin-bottom: 2px; }
        .company-addr { font-size: 11px; color: #333; }
        .company-phone { font-size: 11px; font-weight: bold; }
        .header-right { text-align: right; flex-shrink: 0; }
        .scan-text { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
        .qr-placeholder { width: 70px; height: 70px; border: 1px solid #ccc; display: inline-block; background: #f9f9f9; }
        .tax-title { text-align: center; font-size: 16px; font-weight: bold; color: #c00; padding: 6px 0; border-bottom: 2px solid #c00; margin-bottom: 8px; }
        .buyer-meta { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #000; margin-bottom: 8px; }
        .buyer-info { font-size: 12px; }
        .meta-info { text-align: right; font-size: 12px; }
        .meta-info div { margin-bottom: 1px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .items-table th { background: #f0f0f0; border: 1px solid #000; padding: 6px 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 5px 4px; font-size: 11px; vertical-align: top; }
        .items-table tbody tr:last-child td { border-bottom: 1px solid #000; }
        .ctr { text-align: center; } .rgt { text-align: right; } .lft { text-align: left; }
        .totals-section { border: 1px solid #000; border-top: none; }
        .totals-row { display: flex; justify-content: flex-end; padding: 2px 10px; font-size: 12px; }
        .totals-row .label { font-weight: bold; min-width: 140px; text-align: right; margin-right: 10px; }
        .totals-row .value { min-width: 100px; text-align: right; font-weight: bold; }
        .totals-divider { border-top: 1px solid #000; margin: 0; }
        .cash-section { display: flex; justify-content: space-between; padding: 6px 10px; border: 1px solid #000; border-top: none; font-size: 12px; font-weight: bold; }
        .balance-row { text-align: right; padding: 2px 10px; font-size: 12px; font-weight: bold; border: 1px solid #000; border-top: none; }
        .dr-text { color: #c00; }
        .payable-section { border: 1px solid #000; border-top: none; padding: 8px 10px; }
        .payable-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .payable-label { font-weight: bold; font-size: 12px; }
        .payable-words { font-size: 12px; font-weight: bold; }
        .bank-details { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
        .bank-table { font-size: 11px; }
        .bank-table td { padding: 1px 4px; vertical-align: top; }
        .bank-table .blabel { font-weight: bold; white-space: nowrap; }
        .terms-section { border: 1px solid #000; border-top: none; padding: 10px; }
        .terms-title { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
        .terms-text { font-size: 10px; line-height: 1.5; white-space: pre-line; }
        .signature-section { display: flex; justify-content: space-between; padding: 40px 10px 10px; border: 1px solid #000; border-top: none; }
        .sig-label { font-weight: bold; font-size: 12px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .invoice { padding: 10px; max-width: 100%; border-width: 1px; } @page { margin: 8mm; size: A4; } }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="header-left"><div class="logo-circle">${company.name ? company.name.slice(0, 2).toUpperCase() : ''}</div></div>
            <div class="header-center">
                <div class="mantra">${coAny.mantra || 'ॐ भूर्भुवः स्वः'}</div>
                <div class="company-name">${company.name || ''}</div>
                <div class="company-addr">${company.address || ''}</div>
                <div class="company-phone">PHONE : ${coAny.phone || ''}</div>
            </div>
            <div class="header-right">
                <div class="scan-text">Scan this</div>
                <div class="qr-placeholder"></div>
            </div>
        </div>
        <div class="tax-title">TAX INVOICE</div>
        <div class="buyer-meta">
            <div class="buyer-info">
                <div><strong>NAME &nbsp; : &nbsp; ${buyer.name || ''}</strong></div>
                <div><strong>ADDRESS : </strong> ${buyer.address || ''}</div>
                ${buyer.state ? `<div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${buyer.state}</div>` : ''}
            </div>
            <div class="meta-info">
                <div><strong>INVOICE NO:</strong> ${metadata.invoiceNo || ''}</div>
                <div><strong>DATE:</strong> ${metadata.date || ''}</div>
                <div><strong>GSTIN :</strong> ${company.gstin || ''}</div>
            </div>
        </div>
        <table class="items-table">
            <thead><tr>
                <th class="lft" style="width:180px;">PROD DESC</th>
                <th style="width:40px;">QTY</th>
                <th style="width:70px;">HSN</th>
                <th style="width:85px;">GS WT</th>
                <th style="width:80px;">RATE</th>
                <th style="width:65px;">MKG</th>
                <th style="width:50px;">HMC</th>
                <th style="width:100px;">FINAL AMT</th>
            </tr></thead>
            <tbody>${itemRows}${emptyRows}</tbody>
        </table>
        <div class="totals-section">
            <div class="totals-row" style="padding-top:6px;"><span class="label">AMT :</span><span class="value">${fmt(subtotal)}</span></div>
            <div class="totals-row"><span class="label">CGST (${taxes.cgstRate || 0}%) :</span><span class="value">${fmt(taxes.cgstAmount || 0)}</span></div>
            <div class="totals-row"><span class="label">SGST (${taxes.sgstRate || 0}%) :</span><span class="value">${fmt(taxes.sgstAmount || 0)}</span></div>
            ${taxes.igstRate && taxes.igstRate > 0 ? `<div class="totals-row"><span class="label">IGST (${taxes.igstRate}%) :</span><span class="value">${fmt(taxes.igstAmount || 0)}</span></div>` : ''}
            <div class="totals-row"><span class="label">ROUND OFF :</span><span class="value">${roundOff >= 0 ? '+ ' : '- '}${fmt(Math.abs(roundOff || 0))}</span></div>
            <div class="totals-divider"></div>
            <div class="totals-row" style="padding:4px 10px;font-size:13px;"><span class="label">TOTAL AMOUNT :</span><span class="value">${fmt(totalAmount || 0)}</span></div>
        </div>
        <div class="cash-section">
            <div style="display:flex; flex-direction:column; gap:2px;">${paymentsHtml}</div>
            <div style="display:flex; align-items:flex-end;">NET RECEIVABLE AMT : ${fmt(totalAmount || 0)}</div>
        </div>
        <div class="balance-row">AMT BALANCE: ${fmt(Math.abs(amtBalance))} <span class="dr-text">${amtBalance >= 0 ? 'DR' : 'CR'}</span></div>
        <div class="payable-section">
            <div class="payable-row">
                <div class="payable-label">PAYABLE AMOUNT :</div>
                <div class="payable-words">${amountInWords || ''}</div>
            </div>
            <div class="bank-details">
                <table class="bank-table">
                    <tr><td class="blabel">Bank Name</td><td>: ${coAny.bankDetails?.bankName || ''} ${coAny.bankDetails?.branch || ''}</td></tr>
                    <tr><td class="blabel">Bank Acc No</td><td>: ${coAny.bankDetails?.accountNumber || ''}</td></tr>
                    <tr><td class="blabel">Bank IFSC No</td><td>: ${coAny.bankDetails?.ifsc || ''}</td></tr>
                </table>
                <div style="text-align:center;">
                    <div style="font-size:10px;font-weight:bold;">SCAN QR CODE</div>
                    <div class="qr-placeholder" style="width:80px;height:80px;"></div>
                </div>
            </div>
        </div>
        <div class="terms-section">
            <div class="terms-title">Terms and Conditions :</div>
            <div class="terms-text">${terms}</div>
        </div>
        <div class="signature-section">
            <div class="sig-label">Customer Signatory</div>
            <div class="sig-label">Authorized Signatory</div>
        </div>
    </div>
</body>
</html>`.trim();
}
