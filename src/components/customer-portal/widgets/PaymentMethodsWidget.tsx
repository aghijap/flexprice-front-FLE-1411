import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, CreditCard, MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react';
import CustomerPortalApi from '@/api/CustomerPortalApi';
import { portalReturnUrl } from '../portalReturnUrl';
import { Button, Chip, Dialog } from '@/components/atoms';
import { DropdownMenu } from '@/components/molecules';
import { refetchPortalQueries } from '../refetchPortalQueries';
import type { PaymentGatewayType, ProviderSavedPaymentMethods, SavedPaymentMethod } from '@/types/dto/CustomerPortalBilling';
import { portalPaymentMethodsQueryKey } from '../queryKeys';
import usePortalIntegrations from '../usePortalIntegrations';
import { openPaymentUrl } from '@/utils/common/openPaymentUrl';
import CheckoutLinkDialog from './CheckoutLinkDialog';
import EmptyState from '../EmptyState';
import PortalSection from '../PortalSection';
import PortalRow, { PortalRows } from '../PortalRow';
import { cn } from '@/lib/utils';

interface PaymentMethodsWidgetProps {
	label?: string;
}

/** Names a method for an accessible label without leaking the gateway. */
const formatExpiry = (month?: number, year?: number) => {
	if (!month || !year) return null;
	return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
};

interface MethodRowProps {
	method: SavedPaymentMethod;
	canSetDefault: boolean;
	onSetDefault: (method: SavedPaymentMethod) => void;
	onDelete: (method: SavedPaymentMethod) => void;
	isBusy: boolean;
}

const MethodRow = ({ method, canSetDefault, onSetDefault, onDelete, isBusy }: MethodRowProps) => {
	const { t } = useTranslation('customer-portal');
	const expiry = formatExpiry(method.card?.exp_month, method.card?.exp_year);
	const isExpired = method.status === 'EXPIRED';
	const described = method.card?.last4
		? t('paymentMethods.cardLabel', { brand: method.card.brand ?? 'card', last4: method.card.last4 })
		: method.id;

	return (
		<PortalRow
			icon={<CreditCard />}
			title={described}
			meta={expiry ? t('paymentMethods.expires', { expiry }) : undefined}
			trailing={
				<>
					{isExpired && <Chip label={t('paymentMethods.expired')} variant='failed' />}
					{method.is_default && <Chip label={t('paymentMethods.default')} variant='success' />}
					<Chip label={t(`paymentProviders.${method.provider}`, method.provider)} variant='default' />
					<DropdownMenu
						align='end'
						trigger={
							<button
								type='button'
								aria-label={t('paymentMethods.rowActions', { method: described })}
								className='rounded-md p-1.5 text-content-tertiary transition-colors hover:text-content'>
								<MoreHorizontal className='h-4 w-4' />
							</button>
						}
						options={[
							{
								label: t('paymentMethods.setDefault'),
								icon: <Star className='w-4 h-4' />,
								disabled: method.is_default || !canSetDefault || isExpired || isBusy,
								disabledReason: method.is_default
									? t('paymentMethods.alreadyDefault')
									: !canSetDefault
										? t('paymentMethods.setDefaultUnsupported')
										: isExpired
											? t('paymentMethods.expiredCannotDefault')
											: undefined,
								onSelect: () => onSetDefault(method),
							},
							{
								label: t('paymentMethods.remove'),
								icon: <Trash2 className='w-4 h-4' />,
								disabled: isBusy,
								onSelect: () => onDelete(method),
							},
						]}
					/>
				</>
			}
		/>
	);
};

const ProviderGroup = ({ group, children }: { group: ProviderSavedPaymentMethods; children: React.ReactNode }) => {
	const { t } = useTranslation('customer-portal');

	if (group.error) {
		return (
			<div className='flex items-start gap-2 px-5 py-3.5'>
				<AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-danger' />
				<div>
					<p className='text-sm text-content'>{t('paymentMethods.providerUnavailable')}</p>
					<p className='mt-0.5 text-xs text-content-tertiary'>{group.error.message}</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

/**
 * Saved payment methods, with provider tabs and attribution.
 */
const PaymentMethodsWidget = ({ label }: PaymentMethodsWidgetProps) => {
	const { t } = useTranslation('customer-portal');
	const {
		supports,
		providersFor,
		defaultProviderFor,
		isLoading: integrationsLoading,
		isError: integrationsError,
	} = usePortalIntegrations();
	const [pendingDelete, setPendingDelete] = useState<SavedPaymentMethod | null>(null);
	const [setupUrl, setSetupUrl] = useState<string | null>(null);
	const [selectedFilter, setSelectedFilter] = useState<PaymentGatewayType | 'all'>('all');
	const queryClient = useQueryClient();

	const canManage = supports('payment_method_management');
	const setDefaultProviders = providersFor('set_default_method');
	const manageProviders = providersFor('payment_method_management');

	const { data, isLoading, isError } = useQuery({
		queryKey: portalPaymentMethodsQueryKey,
		queryFn: () => CustomerPortalApi.getPaymentMethods(),
		enabled: canManage,
	});

	const { mutate: addMethod, isPending: isAdding } = useMutation({
		mutationFn: (provider: PaymentGatewayType) =>
			CustomerPortalApi.addPaymentMethod({
				payment_provider: provider,
				success_url: portalReturnUrl(provider),
				cancel_url: portalReturnUrl(provider),
			}),
		onSuccess: async (response) => {
			if (response.action.type === 'redirect' && response.action.url) {
				setSetupUrl(response.action.url);
				openPaymentUrl(response.action.url);
				return;
			}
			toast.success(t('paymentMethods.added'));
			await refetchPortalQueries(['portal-payment-methods']);
		},
		onError: (error: Error) => toast.error(error.message || t('errors.addPaymentMethod')),
	});

	const { mutate: setDefault, isPending: isSettingDefault } = useMutation({
		mutationFn: (method: SavedPaymentMethod) =>
			CustomerPortalApi.setDefaultPaymentMethod({ payment_provider: method.provider, payment_method_id: method.id }),
		onSuccess: (updated) => {
			toast.success(t('paymentMethods.defaultUpdated'));
			queryClient.setQueryData(portalPaymentMethodsQueryKey, updated);
		},
		onError: (error: Error) => toast.error(error.message || t('errors.setDefaultPaymentMethod')),
	});

	const { mutate: deleteMethod, isPending: isDeleting } = useMutation({
		mutationFn: (method: SavedPaymentMethod) =>
			CustomerPortalApi.deletePaymentMethod({ payment_provider: method.provider, payment_method_id: method.id }),
		onSuccess: (updated) => {
			toast.success(t('paymentMethods.removed'));
			setPendingDelete(null);
			queryClient.setQueryData(portalPaymentMethodsQueryKey, updated);
		},
		onError: (error: Error) => toast.error(error.message || t('errors.deletePaymentMethod')),
	});

	const groups = data?.providers ?? [];
	const totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);
	const hasAnyMethod = totalCount > 0;
	const isBusy = isSettingDefault || isDeleting;
	const defaultAddProvider = defaultProviderFor('payment_method_management');

	if (integrationsError) {
		return (
			<PortalSection icon={<CreditCard />} title={label ?? t('paymentMethods.title')}>
				<EmptyState icon={<AlertTriangle />} title={t('paymentMethods.providerUnavailable')} description={t('paymentMethods.retryHint')} />
			</PortalSection>
		);
	}

	if (!integrationsLoading && !canManage) {
		return (
			<PortalSection icon={<CreditCard />} title={label ?? t('paymentMethods.title')}>
				<EmptyState
					icon={<CreditCard />}
					title={t('paymentMethods.unsupportedTitle')}
					description={t('paymentMethods.unsupportedDescription')}
				/>
			</PortalSection>
		);
	}

	const renderAddButton = () => {
		if (selectedFilter !== 'all') {
			return (
				<Button size='sm' onClick={() => addMethod(selectedFilter)} isLoading={isAdding} prefixIcon={<Plus />}>
					{t('paymentMethods.add')}
				</Button>
			);
		}

		if (manageProviders.length > 1) {
			return (
				<DropdownMenu
					align='end'
					trigger={
						<Button size='sm' isLoading={isAdding} prefixIcon={<Plus />}>
							{t('paymentMethods.add')}
						</Button>
					}
					options={manageProviders.map((provider) => ({
						label: t('paymentMethods.addForProvider', { provider: t(`paymentProviders.${provider}`, provider) }),
						onSelect: () => addMethod(provider),
					}))}
				/>
			);
		}

		if (defaultAddProvider) {
			return (
				<Button size='sm' onClick={() => addMethod(defaultAddProvider)} isLoading={isAdding} prefixIcon={<Plus />}>
					{t('paymentMethods.add')}
				</Button>
			);
		}

		return null;
	};

	return (
		<PortalSection
			flush
			icon={<CreditCard />}
			title={label ?? t('paymentMethods.title')}
			description={t('paymentMethods.description')}
			action={renderAddButton()}>
			<CheckoutLinkDialog url={setupUrl} purpose='setup' onOpenChange={(open) => !open && setSetupUrl(null)} />
			<Dialog
				isOpen={pendingDelete !== null}
				onOpenChange={(open) => !open && setPendingDelete(null)}
				title={t('paymentMethods.removeTitle')}
				description={t('paymentMethods.removeConfirm')}>
				<div className='flex justify-end gap-2'>
					<Button variant='outline' onClick={() => setPendingDelete(null)} disabled={isDeleting}>
						{t('paymentMethods.cancel')}
					</Button>
					<Button variant='destructive' onClick={() => pendingDelete && deleteMethod(pendingDelete)} isLoading={isDeleting}>
						{t('paymentMethods.remove')}
					</Button>
				</div>
			</Dialog>

			{canManage && manageProviders.length > 1 && (
				<div className='flex items-center gap-2 border-b border-line px-5 py-2.5 bg-surface-subtle/30'>
					<button
						type='button'
						onClick={() => setSelectedFilter('all')}
						className={cn(
							'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
							selectedFilter === 'all'
								? 'bg-surface text-content border-line shadow-xs font-semibold'
								: 'text-content-secondary border-transparent hover:text-content hover:bg-surface/60'
						)}>
						{t('paymentMethods.all')} {totalCount > 0 && `(${totalCount})`}
					</button>
					{manageProviders.map((provider) => {
						const count = groups.find((g) => g.provider === provider)?.items.length ?? 0;
						const isSelected = selectedFilter === provider;
						return (
							<button
								key={provider}
								type='button'
								onClick={() => setSelectedFilter(provider)}
								className={cn(
									'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer',
									isSelected
										? 'bg-surface text-content border-line shadow-xs font-semibold'
										: 'text-content-secondary border-transparent hover:text-content hover:bg-surface/60'
								)}>
								{t(`paymentProviders.${provider}`, provider)} {count > 0 && `(${count})`}
							</button>
						);
					})}
				</div>
			)}

			{isLoading || integrationsLoading ? (
				<div className='animate-pulse space-y-3 px-5 py-4'>
					{[1, 2].map((i) => (
						<div key={i} className='h-12 rounded bg-surface-subtle'></div>
					))}
				</div>
			) : isError ? (
				<EmptyState icon={<AlertTriangle />} title={t('errors.loadPaymentMethods')} description={t('paymentMethods.retryHint')} />
			) : selectedFilter !== 'all' ? (
				(() => {
					const activeGroup = groups.find((g) => g.provider === selectedFilter);
					if (activeGroup?.error) {
						return <ProviderGroup group={activeGroup}>{null}</ProviderGroup>;
					}
					if (!activeGroup || activeGroup.items.length === 0) {
						const providerName = t(`paymentProviders.${selectedFilter}`, selectedFilter);
						return (
							<EmptyState
								icon={<CreditCard />}
								title={t('paymentMethods.providerEmptyTitle', { provider: providerName })}
								description={t('paymentMethods.providerEmptyDescription', { provider: providerName })}
								action={{
									label: t('paymentMethods.addForProvider', { provider: providerName }),
									onClick: () => addMethod(selectedFilter),
								}}
							/>
						);
					}
					return (
						<PortalRows>
							{activeGroup.items.map((method) => (
								<MethodRow
									key={`${activeGroup.provider}:${method.id}`}
									method={method}
									canSetDefault={setDefaultProviders.includes(activeGroup.provider)}
									onSetDefault={setDefault}
									onDelete={setPendingDelete}
									isBusy={isBusy}
								/>
							))}
						</PortalRows>
					);
				})()
			) : hasAnyMethod || groups.some((g) => g.error) ? (
				<PortalRows>
					{groups.map((group) => (
						<ProviderGroup key={group.provider} group={group}>
							{group.items.map((method) => (
								<MethodRow
									key={`${group.provider}:${method.id}`}
									method={method}
									canSetDefault={setDefaultProviders.includes(group.provider)}
									onSetDefault={setDefault}
									onDelete={setPendingDelete}
									isBusy={isBusy}
								/>
							))}
						</ProviderGroup>
					))}
				</PortalRows>
			) : (
				<EmptyState icon={<CreditCard />} title={t('paymentMethods.emptyTitle')} description={t('paymentMethods.emptyDescription')} />
			)}
		</PortalSection>
	);
};

export default PaymentMethodsWidget;
