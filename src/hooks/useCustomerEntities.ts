import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import CustomerApi from '@/api/CustomerApi';
import WalletApi from '@/api/WalletApi';
import InvoiceApi from '@/api/InvoiceApi';
import { SelectOption } from '@/components/atoms';
import { labelFor } from '@/components/molecules/Activity/entityRegistry';

type Row = Record<string, unknown> & { id: string };
type Groups = { subscription: Row[]; wallet: Row[]; invoice: Row[] };

const EMPTY: Groups = { subscription: [], wallet: [], invoice: [] };

const useCustomerEntities = (customerId: string) => {
	const { t } = useTranslation('activity');
	const query = useQuery({
		queryKey: ['customer-entities', customerId],
		enabled: !!customerId,
		staleTime: 60 * 1000,
		queryFn: async (): Promise<Groups> => {
			const [subs, wallets, invoices] = await Promise.all([
				CustomerApi.getCustomerSubscriptions(customerId).catch(() => ({ items: [] })),
				WalletApi.getCustomerWallets({ id: customerId }).catch(() => []),
				InvoiceApi.listInvoices({ customer_id: customerId, limit: 50 }).catch(() => ({ items: [] })),
			]);
			return {
				subscription: (subs.items ?? []) as unknown as Row[],
				wallet: (wallets ?? []) as unknown as Row[],
				invoice: (invoices.items ?? []) as unknown as Row[],
			};
		},
	});

	const options = useMemo<SelectOption[]>(() => {
		const groups = query.data ?? EMPTY;
		const typed = (type: keyof Groups) =>
			groups[type].map((r) => ({ value: `${type}:${r.id}`, label: `${t(`entity.${type}`)} · ${labelFor(type, r)}` }));
		return [{ value: '', label: t('scope.allRelated') }, ...typed('subscription'), ...typed('wallet'), ...typed('invoice')];
	}, [query.data, t]);

	return { options, isLoading: query.isLoading };
};

export default useCustomerEntities;
