import { AxiosClient } from '@/core/axios/verbs';
import type { FxRate } from '@/models/FxRate';
import type { CreateFxRateRequest, FxRateFilter, ListFxRatesResponse, UpdateFxRateRequest } from '@/types/dto/FxRate';

class FxRateApi {
	private static baseUrl = '/forex';

	public static async createFxRate(data: CreateFxRateRequest) {
		return AxiosClient.post<FxRate, CreateFxRateRequest>(this.baseUrl, data);
	}

	public static async queryFxRates(filter: FxRateFilter) {
		return AxiosClient.post<ListFxRatesResponse, FxRateFilter>(`${this.baseUrl}/query`, filter);
	}

	public static async getFxRate(id: string) {
		return AxiosClient.get<FxRate>(`${this.baseUrl}/${id}`);
	}

	public static async updateFxRate(id: string, data: UpdateFxRateRequest) {
		return AxiosClient.put<FxRate, UpdateFxRateRequest>(`${this.baseUrl}/${id}`, data);
	}

	/** Customer and subscription overrides only; the backend archives the row. */
	public static async deleteFxRate(id: string): Promise<void> {
		await AxiosClient.delete(`${this.baseUrl}/${id}`);
	}
}

export default FxRateApi;
