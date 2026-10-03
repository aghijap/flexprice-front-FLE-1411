import { FC } from 'react';
import { ActivityItem } from '@/types/dto/ActivityLog';

interface Props {
	id: string;
	onClose: () => void;
	customerId?: string;
	loaded: ActivityItem[];
}

// Stub; replaced in Task 4.
const ActivityDetailSheet: FC<Props> = () => null;

export default ActivityDetailSheet;
