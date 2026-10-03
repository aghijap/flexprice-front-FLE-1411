import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ActivityApi from '@/api/ActivityApi';
import CustomerApi from '@/api/CustomerApi';
import WalletApi from '@/api/WalletApi';
import InvoiceApi from '@/api/InvoiceApi';
import CustomerActivityTab, { scopeFromSelection } from './CustomerActivityTab';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => (typeof opts?.defaultValue === 'string' ? opts.defaultValue : key),
	}),
}));

const wrap = (ui: React.ReactNode) => (
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
		<MemoryRouter initialEntries={['/billing/customers/cust_1/activity']}>
			<Routes>
				<Route path='/billing/customers/:id/activity' element={ui} />
			</Routes>
		</MemoryRouter>
	</QueryClientProvider>
);

describe('scopeFromSelection', () => {
	it('returns the customer scope when nothing is selected', () => {
		expect(scopeFromSelection('', 'cust_1')).toEqual({ kind: 'customer', customerId: 'cust_1' });
	});
	it('returns an entity scope for a type:id selection', () => {
		expect(scopeFromSelection('subscription:subs_1', 'cust_1')).toEqual({ kind: 'entity', entityType: 'subscription', entityId: 'subs_1' });
	});
	it('keeps colons in the id', () => {
		expect(scopeFromSelection('wallet:wal:1', 'cust_1')).toEqual({ kind: 'entity', entityType: 'wallet', entityId: 'wal:1' });
	});
});

describe('CustomerActivityTab', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(CustomerApi, 'getCustomerSubscriptions').mockResolvedValue({ items: [], pagination: {} } as never);
		vi.spyOn(WalletApi, 'getCustomerWallets').mockResolvedValue([]);
		vi.spyOn(InvoiceApi, 'listInvoices').mockResolvedValue({ items: [] } as never);
		vi.spyOn(CustomerApi, 'getCustomerById').mockResolvedValue({ id: 'cust_1', name: 'Acme' } as never);
	});

	it('defaults to the customer roll-up scope', async () => {
		const list = vi.spyOn(ActivityApi, 'list').mockResolvedValue({ items: [], has_more: false });
		render(wrap(<CustomerActivityTab />));
		await waitFor(() => expect(list).toHaveBeenCalled());
		expect(list.mock.calls[0][0]).toEqual(expect.objectContaining({ customer_id: 'cust_1' }));
		expect(list.mock.calls[0][0].entity_type).toBeUndefined();
	});
});
