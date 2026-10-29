const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calculateTax({ subtotal, discount = 0, gstRate = 5, placeOfSupply = 'intra-state' }) {
  if (![subtotal, discount, gstRate].every(Number.isFinite)) throw new Error('Amounts must be numbers');
  if (subtotal < 0 || discount < 0 || discount > subtotal || gstRate < 0 || gstRate > 100) {
    throw new Error('Invalid subtotal, discount, or GST rate');
  }
  const taxableAmount = round2(subtotal - discount);
  const taxTotal = round2(taxableAmount * gstRate / 100);
  const cgst = placeOfSupply === 'intra-state' ? round2(taxTotal / 2) : 0;
  const sgst = placeOfSupply === 'intra-state' ? round2(taxTotal - cgst) : 0;
  const igst = placeOfSupply === 'inter-state' ? taxTotal : 0;
  return {
    subtotal: round2(subtotal), discount: round2(discount), taxableAmount,
    gstRate, cgst, sgst, igst, taxTotal, grandTotal: round2(taxableAmount + taxTotal)
  };
}
