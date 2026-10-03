import type { TFunction } from 'i18next';
import { ActivityItem, AnnotatedChange } from '@/types/dto/ActivityLog';
import { shortId } from './entityRegistry';
import { snapshotRows } from './snapshot';

/** Entity text for a title: the label, or the short id when the label is missing or is the raw id. */
export const entityTitle = (it: Pick<ActivityItem, 'entity_id' | 'entity_label' | 'display'>): string => {
	const label = it.display.parts.entity || it.entity_label;
	return !label || label === it.entity_id ? shortId(it.entity_id) : label;
};

/** The backend falls back to the actor type when it has no label; show the translated type instead. */
export const actorName = (it: Pick<ActivityItem, 'actor' | 'display'>, t: TFunction): string => {
	const fromParts = it.display.parts.actor;
	if (fromParts && fromParts !== it.actor.type) return fromParts;
	return it.actor.label || t(`actor.${it.actor.type}`, { defaultValue: it.actor.type.replace(/_/g, ' ') });
};

export const summaryOf = (it: ActivityItem, t: TFunction): string => {
	const p = it.display.parts;
	const entityType = t(`entity.${p.entity_type}`, { defaultValue: p.entity_type.replace(/_/g, ' ') });
	const actor = actorName(it, t);
	const entity = entityTitle(it);
	return t(`verb.${p.verb}`, {
		actor,
		entity,
		entityType,
		defaultValue: `${actor} ${p.verb.replace(/_/g, ' ')} ${entityType} ${entity}`,
	});
};

export type RowDetail =
	| { kind: 'diff'; label: string; change: AnnotatedChange }
	| { kind: 'changed'; label: string }
	| { kind: 'redacted'; label: string }
	| { kind: 'fields'; labels: string[]; more: number }
	| { kind: 'created'; count: number }
	| { kind: 'deleted' }
	| { kind: 'notCaptured' };

const MAX_INLINE = 40;
const MAX_FIELDS = 3;

/** Short plain values read fine inline; blobs and long text would swamp the row. */
const isInlineValue = (v: unknown): boolean => {
	if (v === null || v === undefined) return true;
	if (typeof v === 'number' || typeof v === 'boolean') return true;
	if (typeof v !== 'string') return false;
	return v.length <= MAX_INLINE && !v.startsWith('{') && !v.startsWith('[');
};

/** The one-line "what happened" under a row's title, chosen by shape so every row reads the same way. */
export const rowDetail = (it: Pick<ActivityItem, 'action' | 'changes' | 'snapshot'>): RowDetail | null => {
	const entries = Object.entries(it.changes ?? {});
	if (entries.length === 1) {
		const [key, ch] = entries[0];
		const label = ch.label || key;
		if (ch.redacted) return { kind: 'redacted', label };
		return isInlineValue(ch.from) && isInlineValue(ch.to) ? { kind: 'diff', label, change: ch } : { kind: 'changed', label };
	}
	if (entries.length > 1) {
		const labels = entries.map(([key, ch]) => ch.label || key);
		return { kind: 'fields', labels: labels.slice(0, MAX_FIELDS), more: Math.max(0, labels.length - MAX_FIELDS) };
	}
	const verb = it.action.slice(it.action.lastIndexOf('.') + 1);
	if (verb === 'created') {
		const count = snapshotRows(it.snapshot).length;
		return count > 0 ? { kind: 'created', count } : null;
	}
	if (verb === 'deleted') return { kind: 'deleted' };
	if (verb === 'updated') return { kind: 'notCaptured' };
	return null;
};
