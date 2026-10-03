import { FC, Fragment, ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Chip, CopyIdButton, Loader, Sheet } from '@/components/atoms';
import ActivityApi from '@/api/ActivityApi';
import { getHttpStatus } from '@/core/axios/types';
import { formatDateTimeWithSecondsAndTimezone } from '@/utils/common/format_date';
import { ActivityItem } from '@/types/dto/ActivityLog';
import ActorBadge from './ActorBadge';
import ChangesTable from './ChangesTable';
import { EntityRef, FormattedValue } from './formatters';
import ActivityList from './ActivityList';
import { verbOf } from './ActivityRow';
import { summaryOf } from './summary';

interface Props {
	id: string;
	open: boolean;
	onClose: () => void;
	customerId?: string;
	loaded?: ActivityItem[];
}

const CHIP_VARIANT = { created: 'success', updated: 'default', deleted: 'failed', other: 'info' } as const;

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
	<section className='grid gap-2'>
		<h5 className='text-[11px] font-semibold uppercase tracking-wide text-content-muted'>{title}</h5>
		{children}
	</section>
);

const KeyValueGrid: FC<{ children: ReactNode }> = ({ children }) => (
	<div className='grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 items-center'>{children}</div>
);

// The shared axios client rejects with an Error carrying `.status`; raw axios errors carry `response.status`.
const isNotFound = (e: unknown) => getHttpStatus(e) === 404 || (e as { response?: { status?: number } } | null)?.response?.status === 404;

const snapshotText = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));

const ActivityDetailSheet: FC<Props> = ({ id, open, onClose, customerId, loaded }) => {
	const { t } = useTranslation('activity');
	const [currentId, setCurrentId] = useState(id);
	const [prevId, setPrevId] = useState(id);
	// Follow the outer `?activity=` param when it changes while the sheet is open.
	if (id !== prevId) {
		setPrevId(id);
		setCurrentId(id);
	}

	const preloaded = loaded?.find((it) => it.id === currentId);
	const { data, error, isLoading } = useQuery({
		queryKey: ['activity', 'item', currentId],
		queryFn: () => ActivityApi.get(currentId),
		enabled: open && !preloaded && !!currentId,
		retry: false,
	});
	const item = preloaded ?? data;
	const ctxCustomer = customerId ?? item?.customer_id;

	const renderBody = (it: ActivityItem) => {
		const verb = verbOf(it.action);
		const summary = summaryOf(it, t);
		const hasChanges = !!it.changes && Object.keys(it.changes).length > 0;
		const metadata = Object.entries(it.metadata ?? {}).filter(([k]) => k !== 'degraded');
		const degraded = it.metadata?.degraded?.value;

		return (
			<div className='grid gap-5 text-sm pt-4'>
				<header className='grid gap-2'>
					<div className='flex flex-wrap items-center gap-2'>
						<Chip label={it.action.slice(it.action.lastIndexOf('.') + 1).replace(/_/g, ' ')} variant={CHIP_VARIANT[verb]} />
						<EntityRef type={it.entity_type} id={it.entity_id} customerId={ctxCustomer} />
					</div>
					<h4 className='text-[15px] font-semibold leading-snug text-content'>{summary}</h4>
				</header>

				<Section title={t('sheet.who', { defaultValue: 'Who' })}>
					<KeyValueGrid>
						<span className='text-content-muted'>{t('sheet.actor', { defaultValue: 'Actor' })}</span>
						<span className='inline-flex flex-wrap items-center gap-1'>
							<ActorBadge actor={it.actor} />
							{it.actor.user_id && (
								<span className='inline-flex items-center gap-1 text-content-muted'>
									· {t('sheet.ownedBy', { defaultValue: 'owned by' })} <EntityRef type='user' id={it.actor.user_id} />
								</span>
							)}
						</span>
						<span className='text-content-muted'>{t('sheet.source', { defaultValue: 'Source' })}</span>
						<span className='capitalize'>{it.source.replace(/_/g, ' ')}</span>
					</KeyValueGrid>
				</Section>

				<Section title={t('sheet.when', { defaultValue: 'When' })}>
					<KeyValueGrid>
						<span className='text-content-muted'>{t('sheet.occurred', { defaultValue: 'Occurred at' })}</span>
						<span className='tabular-nums'>{formatDateTimeWithSecondsAndTimezone(it.occurred_at)}</span>
						{it.request_id && (
							<>
								<span className='text-content-muted'>{t('sheet.request', { defaultValue: 'Request ID' })}</span>
								<span className='inline-flex items-center gap-1'>
									<code className='text-xs bg-surface-faint px-1 rounded'>{it.request_id}</code>
									<CopyIdButton id={it.request_id} />
								</span>
							</>
						)}
					</KeyValueGrid>
				</Section>

				<Section title={t('sheet.whatChanged', { defaultValue: 'What changed' })}>
					{hasChanges && it.changes && <ChangesTable changes={it.changes} siblings={it.snapshot} customerId={ctxCustomer} />}
					{verb === 'created' && it.snapshot && (
						<KeyValueGrid>
							{Object.entries(it.snapshot).map(([k, v]) => (
								<Fragment key={k}>
									<span className='text-content-muted'>{k.replace(/_/g, ' ')}</span>
									<span className='break-all'>{snapshotText(v)}</span>
								</Fragment>
							))}
						</KeyValueGrid>
					)}
					{verb === 'deleted' && (
						<span className='text-content-muted'>{t('sheet.recordDeleted', { defaultValue: 'The record was deleted.' })}</span>
					)}
					{verb === 'updated' && !hasChanges && (
						<span className='text-content-muted'>
							{t('sheet.notCaptured', {
								reason: degraded === undefined ? '' : String(degraded),
								defaultValue: 'Field-level changes were not captured for this event.',
							})}
						</span>
					)}
					{verb === 'other' && !hasChanges && <span className='text-content-muted'>—</span>}
				</Section>

				<Section title={t('sheet.context', { defaultValue: 'Context' })}>
					<KeyValueGrid>
						{it.customer_id && (
							<>
								<span className='text-content-muted'>{t('sheet.customer', { defaultValue: 'Customer' })}</span>
								<span>
									<EntityRef type='customer' id={it.customer_id} />
								</span>
							</>
						)}
						{metadata.map(([k, m]) => (
							<Fragment key={k}>
								<span className='text-content-muted'>{m.label || k.replace(/_/g, ' ')}</span>
								<span>
									<FormattedValue value={m.value} format={m.format} siblings={it.snapshot} customerId={ctxCustomer} />
								</span>
							</Fragment>
						))}
					</KeyValueGrid>
				</Section>

				{it.request_id && (
					<Section title={t('sheet.related', { defaultValue: 'Related changes in this request' })}>
						{/* `inline`: own query key, no URL param handling, no nested sheet. Clicking swaps the sheet's item. */}
						<ActivityList
							scope={{ kind: 'request', requestId: it.request_id }}
							inline
							compact
							pageSize={25}
							onOpen={setCurrentId}
							customerId={ctxCustomer}
							emptyMessage={t('sheet.noRelated', { defaultValue: 'No other changes in this request.' })}
						/>
					</Section>
				)}
			</div>
		);
	};

	return (
		<Sheet isOpen={open} onOpenChange={(o) => !o && onClose()} size='lg' title={t('sheet.title', { defaultValue: 'Activity details' })}>
			{open && (
				<>
					{!item && isLoading && <Loader />}
					{!item && error && (
						<div className='text-sm text-content-muted pt-4'>
							{isNotFound(error)
								? t('sheet.beyondRetention', {
										defaultValue: 'This activity could not be found. It may be older than the retention window.',
									})
								: t('list.error')}
						</div>
					)}
					{item && renderBody(item)}
				</>
			)}
		</Sheet>
	);
};

export default ActivityDetailSheet;
