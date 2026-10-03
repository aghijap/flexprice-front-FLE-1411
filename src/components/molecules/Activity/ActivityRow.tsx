import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/types/dto/ActivityLog';
import ActorBadge from './ActorBadge';
import { EntityRef, FormattedValue } from './formatters';
import { shortId } from './entityRegistry';
import { entityTitle, summaryOf } from './summary';
import { timeOf } from './time';

// eslint-disable-next-line react-refresh/only-export-components
export const verbOf = (action: string): 'created' | 'updated' | 'deleted' | 'other' => {
	const v = action.slice(action.lastIndexOf('.') + 1);
	return v === 'created' || v === 'updated' || v === 'deleted' ? v : 'other';
};

interface Props {
	item: ActivityItem;
	onOpen: (id: string) => void;
	compact?: boolean;
	showCustomer?: boolean;
	selected?: boolean;
}

const ActivityRow: FC<Props> = ({ item, onOpen, compact, showCustomer = true, selected }) => {
	const { t } = useTranslation('activity');
	const entries = Object.entries(item.changes ?? {});
	const single = entries.length === 1 ? entries[0][1] : null;
	const entityType = t(`entity.${item.entity_type}`, { defaultValue: item.entity_type.replace(/_/g, ' ') });
	const titleIsShortId = entityTitle(item) === shortId(item.entity_id);
	return (
		<div
			role='button'
			tabIndex={0}
			aria-current={selected || undefined}
			onClick={() => onOpen(item.id)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onOpen(item.id);
				}
			}}
			className={cn(
				'w-full text-left grid grid-cols-[auto_1fr_auto] gap-3 items-start rounded-md border border-transparent hover:bg-surface-faint hover:border-line px-2',
				compact ? 'py-1.5' : 'py-2',
				selected && 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900',
			)}>
			<ActorBadge actor={item.actor} showLabel={false} />
			<span className='min-w-0 grid gap-0.5'>
				<span className='font-medium text-content truncate'>{summaryOf(item, t)}</span>
				<span className='flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-content-muted text-xs'>
					{!compact && <span className='font-medium text-blue-700 dark:text-blue-300'>{entityType}</span>}
					{!compact && titleIsShortId && <EntityRef type={item.entity_type} id={item.entity_id} customerId={item.customer_id} />}
					{!compact && showCustomer && item.customer_id && item.entity_type !== 'customer' && (
						<EntityRef type='customer' id={item.customer_id} />
					)}
					{single &&
						(single.redacted ? (
							<span>{t('row.redactedChanged', { field: single.label })}</span>
						) : (
							<span className='inline-flex flex-wrap items-center gap-1'>
								{single.label}
								<span className='line-through text-red-700 dark:text-red-400'>
									<FormattedValue value={single.from} format={single.format} siblings={item.snapshot} customerId={item.customer_id} />
								</span>
								<span aria-hidden>→</span>
								<span className='text-green-700 dark:text-green-400'>
									<FormattedValue value={single.to} format={single.format} siblings={item.snapshot} customerId={item.customer_id} />
								</span>
							</span>
						))}
					{entries.length > 1 && <span>{t('row.fieldsChanged', { count: entries.length })}</span>}
				</span>
			</span>
			<span className='text-content-muted text-xs tabular-nums whitespace-nowrap'>{timeOf(item.occurred_at)}</span>
		</div>
	);
};

export default ActivityRow;
