import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FxRateApi from '@/api/FxRateApi';
import type { ForexRateFormValues } from '@/components/molecules/ForexRateModal';
import type { UpdateFxRateRequest } from '@/types/dto/FxRate';

export const CUSTOMER_FX_OVERRIDES_KEY = 'customer-fx-overrides';

const OVERLAP_HINT = 'overlapping period';
const NO_TENANT_RATE_HINT = 'Configure a tenant rate';

/** Maps the backend's 400 hints for overrides to the field they belong to. */
export const classifyOverrideError = (error: unknown): 'overlap' | 'noTenantRate' | undefined => {
	if (!(error instanceof Error)) return undefined;
	if (error.message.includes(OVERLAP_HINT)) return 'overlap';
	if (error.message.includes(NO_TENANT_RATE_HINT)) return 'noTenantRate';
	return undefined;
};

const sameInstant = (a?: string, b?: string) => (a && b ? new Date(a).getTime() === new Date(b).getTime() : a === b);

/** Fields that changed; a cleared date is not sent because the backend cannot clear one. */
export const diffOverride = (original: ForexRateFormValues, next: ForexRateFormValues): UpdateFxRateRequest => {
	const update: UpdateFxRateRequest = {};
	if (next.rate !== original.rate) update.rate = next.rate;
	if (next.start_date && !sameInstant(next.start_date, original.start_date)) update.start_date = next.start_date;
	if (next.end_date && !sameInstant(next.end_date, original.end_date)) update.end_date = next.end_date;
	return update;
};

interface PageArgs {
	page: number;
	limit: number;
	offset: number;
}

export function useCustomerFxOverrides(customerId: string, { page, limit, offset }: PageArgs) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: [CUSTOMER_FX_OVERRIDES_KEY, customerId, page],
		queryFn: () => FxRateApi.queryFxRates({ scope: 'customer', scope_id: customerId, limit, offset }),
		enabled: !!customerId,
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: [CUSTOMER_FX_OVERRIDES_KEY, customerId] });

	const createOverride = useMutation({
		mutationFn: (values: ForexRateFormValues) =>
			FxRateApi.createFxRate({
				scope: 'customer',
				scope_id: customerId,
				from_currency: values.from_currency,
				to_currency: values.to_currency,
				rate: values.rate,
				...(values.start_date ? { start_date: values.start_date } : {}),
				...(values.end_date ? { end_date: values.end_date } : {}),
			}),
		onSuccess: invalidate,
	});

	const updateOverride = useMutation({
		mutationFn: ({ id, original, values }: { id: string; original: ForexRateFormValues; values: ForexRateFormValues }) =>
			FxRateApi.updateFxRate(id, diffOverride(original, values)),
		onSuccess: invalidate,
	});

	const deleteOverride = async (id: string) => {
		await FxRateApi.deleteFxRate(id);
	};

	return {
		overrides: query.data?.items ?? [],
		total: query.data?.pagination?.total ?? 0,
		isLoading: query.isLoading,
		isError: query.isError,
		createOverride,
		updateOverride,
		deleteOverride,
	};
}
