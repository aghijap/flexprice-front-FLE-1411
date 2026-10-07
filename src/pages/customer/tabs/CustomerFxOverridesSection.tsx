import { type ReactNode, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ActionButton, AddButton, Chip, Loader, ShortPagination, Tooltip } from '@/components/atoms';
import FlexpriceTable, { type ColumnData } from '@/components/molecules/Table';
import ForexRateModal, { type ForexRateFieldErrors, type ForexRateFormValues } from '@/components/molecules/ForexRateModal';
import { RouteNames } from '@/core/routes/Routes';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import usePagination, { PAGINATION_PREFIX } from '@/hooks/usePagination';
import { getTypographyClass } from '@/lib/typography';
import type { FxRate } from '@/models/FxRate';
import { formatDateShort } from '@/utils/common/helper_functions';
import { formatFxPair, formatFxRate } from '@/utils/fx/formatFxRate';
import { getOverrideStatus, type OverrideStatus } from '@/utils/fx/overrideStatus';
import { CUSTOMER_FX_OVERRIDES_KEY, classifyOverrideError, useCustomerFxOverrides } from './useCustomerFxOverrides';

const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<OverrideStatus, 'success' | 'info' | 'default'> = {
	active: 'success',
	scheduled: 'info',
	expired: 'default',
};

interface Props {
	customerId: string;
	isArchived: boolean;
}

const toValues = (rate: FxRate): ForexRateFormValues => ({
	from_currency: rate.from_currency,
	to_currency: rate.to_currency,
	rate: rate.rate,
	...(rate.start_date ? { start_date: rate.start_date } : {}),
	...(rate.end_date ? { end_date: rate.end_date } : {}),
});

const CustomerFxOverridesSection = ({ customerId, isArchived }: Props) => {
	const { t } = useTranslation(['customers', 'common']);
	const { can } = useCurrentUserPermissions();
	const canWrite = can('fxrate', 'write');
	const { page, limit, offset } = usePagination({ initialLimit: PAGE_SIZE, prefix: PAGINATION_PREFIX.CUSTOMER_FX_OVERRIDES });
	const { overrides, total, isLoading, isError, createOverride, updateOverride, deleteOverride } = useCustomerFxOverrides(customerId, {
		page,
		limit,
		offset,
	});

	const [isOpen, setIsOpen] = useState(false);
	const [editing, setEditing] = useState<FxRate | null>(null);
	const [fieldErrors, setFieldErrors] = useState<ForexRateFieldErrors>({});
	const editingValues = useMemo(() => (editing ? toValues(editing) : undefined), [editing]);

	const open = (rate: FxRate | null) => {
		setEditing(rate);
		setFieldErrors({});
		setIsOpen(true);
	};

	const onError = (values: ForexRateFormValues) => (error: Error) => {
		const pair = formatFxPair(values.from_currency, values.to_currency);
		const kind = classifyOverrideError(error);
		if (kind === 'overlap') {
			setFieldErrors({ window: t('tabPanels.information.fxOverrides.errors.overlap', { pair }) });
			return;
		}
		if (kind === 'noTenantRate') {
			setFieldErrors({
				pair: (
					<>
						{t('tabPanels.information.fxOverrides.errors.noTenantRate', { pair })}{' '}
						<Link className='underline' to={`${RouteNames.settings}?tab=billing`}>
							{t('tabPanels.information.fxOverrides.errors.openSettings')}
						</Link>
					</>
				),
			});
			return;
		}
		toast.error(error.message);
	};

	const handleSave = (values: ForexRateFormValues) => {
		setFieldErrors({});
		const done = (key: 'created' | 'updated') => () => {
			toast.success(t(`tabPanels.information.fxOverrides.toast.${key}`));
			setIsOpen(false);
		};
		if (editing && editingValues) {
			updateOverride.mutate({ id: editing.id, original: editingValues, values }, { onSuccess: done('updated'), onError: onError(values) });
			return;
		}
		createOverride.mutate(values, { onSuccess: done('created'), onError: onError(values) });
	};

	const writeDenied = t('tabPanels.information.fxOverrides.writeDeniedTooltip');
	const dateOr = (value: string | null | undefined, fallback: string) => (value ? formatDateShort(value) : fallback);

	const columns: ColumnData<FxRate>[] = [
		{
			title: t('tabPanels.information.fxOverrides.columns.rate'),
			render: (row) => formatFxRate(row.from_currency, row.to_currency, row.rate),
		},
		{
			title: t('tabPanels.information.fxOverrides.columns.validFrom'),
			render: (row) => dateOr(row.start_date, t('tabPanels.information.fxOverrides.always')),
		},
		{
			title: t('tabPanels.information.fxOverrides.columns.validUntil'),
			render: (row) => dateOr(row.end_date, t('tabPanels.information.fxOverrides.noEnd')),
		},
		{
			title: t('tabPanels.information.fxOverrides.columns.status'),
			render: (row) => {
				const status = getOverrideStatus(row.start_date, row.end_date);
				return <Chip variant={STATUS_VARIANT[status]} label={t(`tabPanels.information.fxOverrides.status.${status}`)} />;
			},
		},
		...(isArchived
			? []
			: [
					{
						fieldVariant: 'interactive' as const,
						hideOnEmpty: true,
						render: (row: FxRate) => (
							<ActionButton
								id={row.id}
								entityName={t('tabPanels.information.fxOverrides.entityName')}
								deleteMutationFn={async (id) => {
									await deleteOverride(id);
									toast.success(t('tabPanels.information.fxOverrides.toast.deleted'));
								}}
								refetchQueryKey={CUSTOMER_FX_OVERRIDES_KEY}
								disableToast
								edit={{ enabled: true, disabled: !canWrite, disabledReason: canWrite ? undefined : writeDenied, onClick: () => open(row) }}
								archive={{
									enabled: true,
									disabled: !canWrite,
									disabledReason: canWrite ? undefined : writeDenied,
									text: t('tabPanels.information.fxOverrides.delete'),
								}}
							/>
						),
					},
				]),
	];

	const addButton: ReactNode = canWrite ? (
		<AddButton variant='outline' label={t('tabPanels.information.fxOverrides.add')} onClick={() => open(null)} />
	) : (
		<Tooltip content={writeDenied}>
			<span tabIndex={0} className='inline-block'>
				<AddButton variant='outline' label={t('tabPanels.information.fxOverrides.add')} disabled />
			</span>
		</Tooltip>
	);

	return (
		<div className='mt-8'>
			<div className='flex justify-between items-center mb-2'>
				<h3 className={getTypographyClass('card-header') + '!text-[16px]'}>{t('tabPanels.information.fxOverrides.title')}</h3>
				{!isArchived && addButton}
			</div>
			{isLoading ? (
				<div className='flex min-h-[120px] items-center justify-center'>
					<Loader />
				</div>
			) : isError ? (
				<p className='text-sm text-destructive'>{t('tabPanels.information.fxOverrides.loadError')}</p>
			) : overrides.length === 0 ? (
				<p className='py-4 text-sm text-content-zinc-subtle'>{t('tabPanels.information.fxOverrides.empty')}</p>
			) : (
				<div className='space-y-4'>
					<div className='rounded-[6px] border border-line-strong'>
						<FlexpriceTable columns={columns} data={overrides} />
					</div>
					<ShortPagination
						unit={t('tabPanels.information.fxOverrides.paginationUnit')}
						totalItems={total}
						pageSize={limit}
						prefix={PAGINATION_PREFIX.CUSTOMER_FX_OVERRIDES}
					/>
				</div>
			)}
			<ForexRateModal
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				data={editingValues}
				showWindow
				isSaving={createOverride.isPending || updateOverride.isPending}
				fieldErrors={fieldErrors}
				onSave={handleSave}
			/>
		</div>
	);
};

export default CustomerFxOverridesSection;
