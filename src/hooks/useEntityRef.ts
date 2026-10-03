import { useQuery } from '@tanstack/react-query';
import { getEntityDef, shortId } from '@/components/molecules/Activity/entityRegistry';

const useEntityRef = (type: string, id: string) =>
	useQuery({
		queryKey: ['activity-ref', type, id],
		queryFn: async () => {
			const def = getEntityDef(type);
			if (!def) return { label: shortId(id), exists: false };
			try {
				return await def.resolve(id);
			} catch {
				return { label: shortId(id), exists: false };
			}
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!type && !!id,
	});

export default useEntityRef;
