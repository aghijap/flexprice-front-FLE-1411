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
			if (typeof opts?.defaultValue === 'string')
				return opts.defaultValue.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts[k] ?? ''));
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
	it('renders the summary and a single-field inline diff, without an action chip', () => {
		render(wrap(<ActivityRow item={item} onOpen={vi.fn()} />));
		expect(screen.getByText('Alice paused subscription growth-acme')).toBeInTheDocument();
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
		screen.getByRole('button', { name: /Alice paused subscription growth-acme/ }).click();
		expect(onOpen).toHaveBeenCalledWith('act_1');
	});

	it('shows the short id, not the raw id, when the label is the id', () => {
		const raw = {
			...item,
			entity_id: 'subs_01HX7KQ2M9RQ',
			entity_label: 'subs_01HX7KQ2M9RQ',
			display: { ...item.display, parts: { ...item.display.parts, entity: 'subs_01HX7KQ2M9RQ' } },
		};
		render(wrap(<ActivityRow item={raw} onOpen={vi.fn()} />));
		expect(screen.getAllByText(/subs_…Q2M9RQ/).length).toBeGreaterThan(0);
		expect(screen.queryByText(/subs_01HX7KQ2M9RQ/)).not.toBeInTheDocument();
	});

	it('renders a single change as an inline before → after diff', () => {
		render(wrap(<ActivityRow item={item} onOpen={vi.fn()} />));
		expect(screen.getByText('Status')).toBeInTheDocument();
		expect(screen.getByText('→')).toBeInTheDocument();
	});

	it('hides the customer reference when showCustomer is false', () => {
		render(wrap(<ActivityRow item={{ ...item, customer_id: 'cust_01HXAAAAAAAA' }} onOpen={vi.fn()} showCustomer={false} />));
		expect(screen.queryByText('cust_…AAAAAA')).not.toBeInTheDocument();
	});

	it('shows the plan a price belongs to, as a short reference', () => {
		const price = {
			...item,
			entity_type: 'price',
			entity_id: 'price_01HXABCDEF',
			snapshot: { entity_type: 'PLAN', entity_id: 'plan_01HX7KQ2M9RQ' },
			changes: undefined,
		};
		render(wrap(<ActivityRow item={price} onOpen={vi.fn()} />));
		expect(screen.getByText(/plan_…Q2M9RQ/)).toBeInTheDocument();
		expect(screen.queryByText(/plan_01HX7KQ2M9RQ/)).not.toBeInTheDocument();
	});

	it('names the changed fields when several changed', () => {
		const many = {
			...item,
			changes: {
				a: { from: 1, to: 2, label: 'Checkout status', format: 'text' },
				b: { from: 1, to: 2, label: 'Payment id', format: 'text' },
				c: { from: 1, to: 2, label: 'Provider result', format: 'text' },
				d: { from: 1, to: 2, label: 'Extra', format: 'text' },
			},
		};
		render(wrap(<ActivityRow item={many} onOpen={vi.fn()} />));
		expect(screen.getByText(/Checkout status, Payment id, Provider result/)).toBeInTheDocument();
		expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
	});

	it('says a field changed instead of dumping a JSON blob', () => {
		const blob = {
			...item,
			changes: { metadata: { from: null, to: '{"razorpay_customer_id":"cust_Tj"}', label: 'Metadata', format: 'text' } },
		};
		render(wrap(<ActivityRow item={blob} onOpen={vi.fn()} />));
		expect(screen.getByText('Metadata changed')).toBeInTheDocument();
		expect(screen.queryByText(/razorpay_customer_id/)).not.toBeInTheDocument();
	});

	it('describes a created row by how many fields it recorded', () => {
		const created = { ...item, action: 'subscription.created', changes: undefined, snapshot: { name: 'x', amount: '5' } };
		render(wrap(<ActivityRow item={created} onOpen={vi.fn()} />));
		expect(screen.getByText('Created with 2 fields')).toBeInTheDocument();
	});
});
