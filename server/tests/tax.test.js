import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTax } from '../src/utils/tax.js';

test('intra-state GST is split equally into CGST and SGST', () => {
  const result = calculateTax({ subtotal: 200, discount: 0, gstRate: 5, placeOfSupply: 'intra-state' });
  assert.equal(result.cgst, 5);
  assert.equal(result.sgst, 5);
  assert.equal(result.igst, 0);
  assert.equal(result.grandTotal, 210);
});

test('inter-state GST uses IGST', () => {
  const result = calculateTax({ subtotal: 100, gstRate: 18, placeOfSupply: 'inter-state' });
  assert.equal(result.igst, 18);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
  assert.equal(result.grandTotal, 118);
});

test('discount is deducted before tax', () => {
  const result = calculateTax({ subtotal: 100, discount: 20, gstRate: 5 });
  assert.equal(result.taxableAmount, 80);
  assert.equal(result.taxTotal, 4);
  assert.equal(result.grandTotal, 84);
});

test('invalid discount is rejected', () => {
  assert.throws(() => calculateTax({ subtotal: 100, discount: 101, gstRate: 5 }));
});
