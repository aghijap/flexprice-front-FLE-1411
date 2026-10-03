import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ActivityRow from './ActivityRow';
import { ActivityItem } from '@/types/dto/ActivityLog';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => {
			if (key === 'row.redactedChanged') return `${opts?.field} changed`;
			if (typeof opts?.defaultValue === 'string') return opts.defaultValue;
			return key;
		},
	}),
}));

const wrap = (ui: React.ReactNode) => (
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
		<MemoryRouter>{ui}</MemoryRouter>
	</QueryClientProvider>
);

const item: ActivityItem = {
	id: 'act_1',
	entity_type: 'subscription',
	entity_id: 'subs_01HXABCDEF',
	entity_label: 'growth-acme',
	action: 'subscription.paused',
	actor: { type: 'user', id: 'user_1', label: 'Alice' },
	source: 'dashboard',
	occurred_at: '2026-10-03T09:00:00Z',
	changes: { subscription_status: { from: 'active', to: 'paused', label: 'Status', format: 'enum' } },
	display: {
		summary: 'Alice paused growth-acme',
		entity_label: 'growth-acme',
		parts: { actor: 'Alice', verb: 'paused', entity_type: 'subscription', entity: 'growth-acme', field: null, count: 1 },
	},
};

describe('ActivityRow', () => {
	it('renders summary, action chip and single-field inline diff', () => {
		render(wrap(<ActivityRow item={item} onOpen={vi.fn()} />));
		expect(screen.getByText('Alice paused growth-acme')).toBeInTheDocument();
		expect(screen.getAllByText('paused').length).toBeGreaterThan(0);
		expect(screen.getByText(/Status/)).toBeInTheDocument();
	});
	it('marks redacted fields without values', () => {
		render(
			wrap(<ActivityRow item={{ ...item, changes: { tax_id: { redacted: true, label: 'Tax id', format: 'text' } } }} onOpen={vi.fn()} />),
		);
		expect(screen.getByText(/Tax id changed/)).toBeInTheDocument();
	});
	it('calls onOpen with the id on click', () => {
		const onOpen = vi.fn();
		render(wrap(<ActivityRow item={item} onOpen={onOpen} />));
		screen.getByRole('button', { name: /Alice paused growth-acme/ }).click();
		expect(onOpen).toHaveBeenCalledWith('act_1');
	});
});
