// Tests for src/utils/price.ts (entry fee amounts).
// Node loads the TypeScript file directly, since it has no imports.
const test = require('node:test');
const assert = require('node:assert/strict');
const {formatPrice, isValidPriceCents, parsePrice, MAX_PRICE_CENTS, MIN_PRICE_CENTS} = require('../src/utils/price.ts');

test('whole dollars and cents become cents', () => {
    assert.equal(parsePrice('5'), 500);
    assert.equal(parsePrice('5.50'), 550);
    assert.equal(parsePrice('0.50'), 50);
    assert.equal(parsePrice('0'), 0);
});

test('a typed dollar sign, commas and spaces are ignored', () => {
    assert.equal(parsePrice('$5.50'), 550);
    assert.equal(parsePrice('  5.50  '), 550);
    assert.equal(parsePrice('$1,000'), 100000);
});

test('amounts that are not prices come back as null', () => {
    assert.equal(parsePrice(''), null);
    assert.equal(parsePrice('.'), null);
    assert.equal(parsePrice('abc'), null);
    assert.equal(parsePrice('-5'), null);
    assert.equal(parsePrice('5.555'), null);     // more precision than money has
    assert.equal(parsePrice('1e3'), null);
});

test('cents never drift through floating point', () => {
    // 5.1 * 100 is 510.0000000000001, and 0.29 * 100 is 28.999999999999996
    assert.equal(parsePrice('5.10'), 510);
    assert.equal(parsePrice('0.29'), 29);
    assert.equal(parsePrice('1.15'), 115);
});

test('valid prices match the database constraint (0, or 50 to 100000)', () => {
    assert.equal(isValidPriceCents(0), true);
    assert.equal(isValidPriceCents(MIN_PRICE_CENTS), true);
    assert.equal(isValidPriceCents(MAX_PRICE_CENTS), true);
    assert.equal(isValidPriceCents(MIN_PRICE_CENTS - 1), false);   // under Stripe's minimum charge
    assert.equal(isValidPriceCents(MAX_PRICE_CENTS + 1), false);
    assert.equal(isValidPriceCents(-1), false);
    assert.equal(isValidPriceCents(5.5), false);                   // cents are whole numbers
    assert.equal(isValidPriceCents(Number.NaN), false);
});

test('the minimum matches what Stripe will accept for USD', () => {
    assert.equal(MIN_PRICE_CENTS, 50);
});

test('prices show with two decimal places', () => {
    assert.equal(formatPrice(500, 'usd'), '$5.00');
    assert.equal(formatPrice(50, 'usd'), '$0.50');
    assert.equal(formatPrice(100000, 'usd'), '$1,000.00');
});
