import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/atoms';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/types/dto/ActivityLog';
import ActorBadge from './ActorBadge';
import { EntityRef, FormattedValue } from './formatters';

// eslint-disable-next-line react-refresh/only-export-components
export const verbOf = (action: string): 'created' | 'updated' | 'deleted' | 'other' => {
	const v = action.slice(action.lastIndexOf('.') + 1);
	return v === 'created' || v === 'updated' || v === 'deleted' ? v : 'other';
};

const CHIP_VARIANT = { created: 'success', updated: 'default', deleted: 'failed', other: 'info' } as const;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

interface Props {
	item: ActivityItem;
	onOpen: (id: string) => void;
	compact?: boolean;
}

const ActivityRow: FC<Props> = ({ item, onOpen, compact }) => {
	const { t } = useTranslation('activity');
	const entries = Object.entries(item.changes ?? {});
	const single = entries.length === 1 ? entries[0] : null;
	const verb = verbOf(item.action);
	const actionLabel = item.action.slice(item.action.lastIndexOf('.') + 1).replace(/_/g, ' ');
	const parts = item.display.parts;
	const entityType = t(`entity.${parts.entity_type}`, { defaultValue: parts.entity_type.replace(/_/g, ' ') });
	const summary = t(`verb.${parts.verb}`, { ...parts, entityType, defaultValue: item.display.summary });
	return (
		<button
			type='button'
			onClick={() => onOpen(item.id)}
			className={cn(
				'w-full text-left grid grid-cols-[auto_1fr_auto] gap-3 items-start rounded-md border border-transparent hover:bg-surface-faint hover:border-line px-2',
				compact ? 'py-1.5' : 'py-2',
			)}>
			<ActorBadge actor={item.actor} showLabel={false} />
			<span className='min-w-0 grid gap-0.5'>
				<span className='font-medium text-content truncate'>{summary}</span>
				{!compact && item.customer_id && item.entity_type !== 'customer' && (
					<span className='text-xs text-content-muted'>
						<EntityRef type='customer' id={item.customer_id} />
					</span>
				)}
				<span className='flex flex-wrap items-center gap-2 text-content-muted text-xs'>
					<Chip label={actionLabel} variant={CHIP_VARIANT[verb]} />
					{single &&
						(single[1].redacted ? (
							<span>{t('row.redactedChanged', { field: single[1].label })}</span>
						) : (
							<span className='inline-flex items-center gap-1'>
								{single[1].label}
								<span className='line-through opacity-70'>
									<FormattedValue value={single[1].from} format={single[1].format} siblings={item.snapshot} customerId={item.customer_id} />
								</span>
								<span>→</span>
								<FormattedValue value={single[1].to} format={single[1].format} siblings={item.snapshot} customerId={item.customer_id} />
							</span>
						))}
					{entries.length > 1 && <span>{t('row.fieldsChanged', { count: entries.length })}</span>}
					{item.request_id && !compact && <span>· {item.source}</span>}
				</span>
			</span>
			<span className='text-content-muted text-xs tabular-nums whitespace-nowrap'>{timeOf(item.occurred_at)}</span>
		</button>
	);
};

export default ActivityRow;
