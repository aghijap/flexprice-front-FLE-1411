import { describe, expect, it } from 'vitest';
import { formatFxPair, formatFxRate, formatRateValue } from './formatFxRate';

describe('formatRateValue', () => {
	it('pads a whole number to two decimals', () => {
		expect(formatRateValue('83')).toBe('83.00');
	});
	it('pads one decimal to two', () => {
		expect(formatRateValue('83.5')).toBe('83.50');
	});
	it('never rounds extra precision', () => {
		expect(formatRateValue('83.33335')).toBe('83.33335');
	});
});

describe('formatFxRate', () => {
	it('renders one unit of from in to, uppercase codes', () => {
		expect(formatFxRate('usd', 'inr', '83')).toBe('1 USD = 83.00 INR');
	});
});

describe('formatFxPair', () => {
	it('renders an arrow pair, uppercase codes', () => {
		expect(formatFxPair('usd', 'inr')).toBe('USD → INR');
	});
});
