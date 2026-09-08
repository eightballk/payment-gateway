import { useQuery } from "@/api/hooks/useQuery";
import { BACKEND_ENDPOINTS } from "@/constants/endpoints";
import type { AccountListResponse } from "../types/account";
import { ACCOUNT_PAGE_SIZE } from "@/constants/config";
import { QUERY_KEYS } from "@/cache/queryKeys";

export function useGetAccounts(page: number, search: string) {
	const params = new URLSearchParams();
	if (search) params.set("search", search);
	params.set("page", String(page));
	params.set("limit", String(ACCOUNT_PAGE_SIZE));

	const queryKey = QUERY_KEYS.ACCOUNT_LIST(page, search);

	const { data, errorStatus, error, isLoading, refetchAttemptsState } = useQuery<AccountListResponse>({
		url: `${BACKEND_ENDPOINTS.ACCOUNT_ENDPOINT}?${params.toString()}`,
		queryKey,
	});

	return { accountList: data, error, isLoading, errorStatus, refetchAttemptsState };
}
