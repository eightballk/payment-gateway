import { getCache, invalidateCache, type QueryKeyType, setCache } from "@/cache/queryCache";
import { INITIAL_FETCH_TIME_MS, MAX_REFETCH_ATTEMPTS } from "@/constants/config";
import React from "react";
import { API, ApiError } from "@/api/config/config";
import type { Endpoint } from "@/api/config/types";

interface QueryOptions {
	url: Endpoint;
	id?: string;
	queryKey: QueryKeyType;
	config?: {
		headers: {
			[key: string]: string;
		};
	};
}
/**
 * Hook to fetch the data.
 * Uses caching implementation as per the requirement of this project.
 *
 * @param url - API endpoint to hit or fetch the data from.
 * @param queryKey - A unique key for different `url` that was hit.
 * @param id - ID to fetch specific data if needed - optional.
 * @param config - Custom header config options while fetching - optional.
 * Stores data based on the provided `url` and makes caching more efficient.
 */
export function useQuery<TResult>({ url, id, queryKey, config }: QueryOptions) {
	const [data, setData] = React.useState<TResult | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [errorStatus, setErrorStatus] = React.useState<number | null>(null);
	const [refetchAttemptsState, setRefetchAttemptsState] = React.useState<number>(0);

	const refetchTimeRef = React.useRef(INITIAL_FETCH_TIME_MS);
	const refetchAttemptsRef = React.useRef(0);

	const queryString = id ? `${queryKey}-${id}` : queryKey;

	async function fetchData(): Promise<void> {
		setIsLoading(true);

		try {
			const cachedData = await getCache<TResult>(queryString);
			if (cachedData) return setData(cachedData);

			const res = API<any, TResult>({ method: "GET", endpoint: url, headers: config?.headers, id });
			setCache<TResult>(queryString, res);
			const result = await res;

			setData(result);
			setError(null);
		} catch (err: unknown) {
			if (err instanceof ApiError) {
				if (err.status >= 500) retryFetching();
				setError(err.message);
				setErrorStatus(err.status);
			} else {
				/* No ApiError means the request never got a response at all
				 * network down, DNS failure, CORS, etc. Treat as retryable too. */
				retryFetching();
				setError("An unknown error occured. Please try again later.");
			}
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Refetch the data by running the `fetchData` function recursively.
	 * Only refetch when there is an error while fetching the data initially.
	 *
	 * Refetches until it reaches the max attempts, assigned in `MAX_REFETCH_ATTEMPTS` variable.
	 */
	function retryFetching() {
		invalidateCache(queryString);
		refetchAttemptsRef.current++;

		if (refetchAttemptsRef.current <= MAX_REFETCH_ATTEMPTS) {
			refetchTimeRef.current += refetchTimeRef.current;
			setRefetchAttemptsState(refetchAttemptsRef.current);
			setTimeout(fetchData, refetchTimeRef.current);
		} else {
			setIsLoading(false);
		}
	}

	React.useEffect(() => {
		if (!url) return;

		fetchData();
	}, [url]);
	return { data, error, errorStatus, isLoading, refetchAttemptsState, refetch: fetchData };
}
