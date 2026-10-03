import { useQuery } from '@tanstack/react-query';
import CustomerApi from '@/api/CustomerApi';
import WalletApi from '@/api/WalletApi';
import InvoiceApi from '@/api/InvoiceApi';
import { SelectOption } from '@/components/atoms';
import { labelFor } from '@/components/molecules/Activity/entityRegistry';

type Row = Record<string, unknown> & { id: string };

const opt = (type: string, row: Row): SelectOption => ({ value: `${type}:${row.id}`, label: labelFor(type, row) });

const useCustomerEntities = (customerId: string, customerName?: string) => {
	const query = useQuery({
		queryKey: ['customer-entities', customerId],
		enabled: !!customerId,
		staleTime: 60 * 1000,
		queryFn: async () => {
			const [subs, wallets, invoices] = await Promise.all([
				CustomerApi.getCustomerSubscriptions(customerId).catch(() => ({ items: [] })),
				WalletApi.getCustomerWallets({ id: customerId }).catch(() => []),
				InvoiceApi.listInvoices({ customer_id: customerId, limit: 50 }).catch(() => ({ items: [] })),
			]);
			const options: SelectOption[] = [
				{ value: '', label: customerName || labelFor('customer', { id: customerId }) },
				...((subs.items ?? []) as unknown as Row[]).map((r) => opt('subscription', r)),
				...((wallets ?? []) as unknown as Row[]).map((r) => opt('wallet', r)),
				...((invoices.items ?? []) as unknown as Row[]).map((r) => opt('invoice', r)),
			];
			return options;
		},
	});
	return { options: query.data ?? [], isLoading: query.isLoading };
};

export default useCustomerEntities;
