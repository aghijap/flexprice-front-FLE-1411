/** Entity types offered in the filter: the v1 set, each with known actions (the API needs entity_type + entity_id together). */
export const ACTIVITY_ENTITY_TYPES = [
	'customer',
	'subscription',
	'invoice',
	'wallet',
	'wallet_transaction',
	'entitlement_grant',
	'plan',
	'price',
	'payment',
] as const;

export const ACTIVITY_ACTIONS = [
	'customer.created',
	'customer.updated',
	'customer.deleted',
	'subscription.created',
	'subscription.updated',
	'subscription.paused',
	'subscription.resumed',
	'subscription.cancelled',
	'subscription.plan_changed',
	'invoice.created',
	'invoice.updated',
	'invoice.finalized',
	'invoice.voided',
	'invoice.paid',
	'wallet.created',
	'wallet.updated',
	'wallet_transaction.created',
	'entitlement_grant.created',
	'plan.created',
	'plan.updated',
	'plan.prices_synced',
	'price.created',
	'price.updated',
	'price.archived',
	'payment.created',
	'payment.updated',
] as const;

export const ACTIVITY_ACTOR_TYPES = ['user', 'api_key', 'system', 'customer_portal'] as const;
