import React from "react";
import { SearchIcon } from "lucide-react";
import { useGetAccounts } from "@/features/accounts/hooks/useGetAccounts";
import { Input } from "@/components/ui/Input";
import { EllipsisLoader } from "@/components/ui/Loader";
import { useDefaultAccounts } from "@/lib/hooks/useDefaultAccounts";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { AccountCard } from "./components/AccountCard";
import { ACCOUNT_PAGE_SIZE, MAX_REFETCH_ATTEMPTS } from "@/constants/config";
import { DefaultAccountCard } from "./components/DefaultAccountCard";
import { Link } from "react-router-dom";
import { NAVIGATION_ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { removeDefaultReceiver, removeDefaultSender, removeUnlockedAccount } from "@/lib/storage";
import { useAccountSSE } from "@/features/accounts/hooks/useAccountSSE";
import { getCache, invalidateCache, invalidateCacheByPrefix, updateEachCacheEntry } from "@/cache/queryCache";
import { InputProgressBar } from "@/components/ui/InputProgressBar";
import { QUERY_KEY_PREFIX, QUERY_KEYS } from "@/cache/queryKeys";
import { SSE_KEYS } from "@/api/constants/sseKeys";
import { type AccountResponse, type SSEResponse } from "@/features/accounts/types/account";

export function AccountListPage() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [accounts, setAccounts] = React.useState<AccountResponse[] | null>(null);
  const debouncedSearch = useDebounce(search);

  const { accountList, isLoading, error, refetchAttemptsState } = useGetAccounts(page, debouncedSearch);

  const totalPages = accountList ? Math.ceil(accountList.total / ACCOUNT_PAGE_SIZE) : 1;

  const { sender, receiver, setSender, setReceiver, removeSenderAndReceiver } = useDefaultAccounts();

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1); // reset to page 1 on new search
  }

  function handleAccountExpired(accountNumber: number) {
    removeSenderAndReceiver(accountNumber);
    removeUnlockedAccount(accountNumber);
    invalidateCache(QUERY_KEYS.ACCOUNT_LIST(page, search));
    setAccounts((prev) => prev ? prev.filter((acc) => acc.accountNumber !== accountNumber) : prev);
  }

  function handleAccountSSERefetch(data: SSEResponse) {
    if (data.type === SSE_KEYS.ACCOUNT_EXPIRED) {
      handleAccountExpired(data.accountNumber);
    }
  }

  function handleAccountRefilled(updated: AccountResponse) {
    if (sender?.accountNumber === updated.accountNumber) {
        setSender({ ...sender, balance: updated.balance });
    }

    if (receiver?.accountNumber === updated.accountNumber) {
        setReceiver({ ...receiver, balance: updated.balance });
    }
    setAccounts((prev) =>
      prev ? prev.map((acc) => (acc.accountNumber === updated.accountNumber ? updated : acc)) : prev
    );

    getCache<{ items: AccountResponse[] }>(
      QUERY_KEYS.ACCOUNT_LIST(page, debouncedSearch)
    ).then((res) => {
      if (!res || !res.items) return;

      updateEachCacheEntry<{items: AccountResponse[]}>(
        QUERY_KEY_PREFIX.ACCOUNT_LIST, 
        (cache) => (
          {...cache, 
            items: cache.items.map((acc) => (acc.accountNumber === updated.accountNumber ? updated: acc))
          }
      ))
    });
  }

  useAccountSSE(handleAccountSSERefetch);

  React.useEffect(() => {
    if(!accountList) return;

    setAccounts(accountList.items);

    const now = Date.now();
    const expiredOnes = accountList.items.filter(
      (acc) => acc.expiresAt && new Date(acc.expiresAt).getTime() <= now && acc.isActive
    );

    expiredOnes.forEach((acc) => handleAccountExpired(acc.accountNumber));
  }, [accountList])

  React.useEffect(() => {
    if(page !== 1 && accounts?.length === 0) {
      setPage(page - 1);
      invalidateCache(QUERY_KEYS.ACCOUNT_LIST(page, search));
    }

  }, [page, accounts])

  return (
    <div className="mx-auto px-2 md:px-6 max-w-6xl w-full py-4 md:py-16">
      <div className="flex gap-12 items-start">

        {/* Sidebar — desktop only */}
        <div className="hidden lg:flex flex-col gap-3 w-xs shrink-0 sticky top-20">
          <DefaultAccountCard
            label="Sender"
            account={sender}
            onRemove={() => {
              removeDefaultSender();
              setSender(null);
            }}
          />
          <DefaultAccountCard
            label="Receiver"
            account={receiver}
            onRemove={() => {
              removeDefaultReceiver();
              setReceiver(null);
            }}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-6">

          {/* Mobile summary */}
          <div className="flex gap-3 lg:hidden">
          <DefaultAccountCard
            label="Sender"
            account={sender}
            onRemove={() => {
              removeDefaultSender();
              setSender(null);
            }}
          />
          <DefaultAccountCard
            label="Receiver"
            account={receiver}
            onRemove={() => {
              removeDefaultReceiver();
              setReceiver(null);
            }}
          />
          </div>

          <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-lg text-foreground text-center md:text-start">Bank Accounts</h1>
              <p className="text-xs text-text-muted mt-1 text-center md:text-start">
                Manage default sender and receiver accounts. Click an account to verify with PIN.
              </p>
            </div>
            <Link
              to={NAVIGATION_ROUTES.CREATE_ACCOUNT}
              className="shrink-0 mx-auto md:mx-0"
              viewTransition
            >
              <Button size="sm" variant="secondary">Create New Account</Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Input
              leftIcon={<SearchIcon size={14} className="text-text-muted pointer-events-none mb-1" />}
              id="account-search"
              type="text"
              placeholder="Search by name or account number..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8 bg-surface"
            />
            <InputProgressBar active={isLoading && !!accountList} />
          </div>

          {/* List */}
          {isLoading && !accounts ? (
            <EllipsisLoader value="Loading accounts" />
          ) : error ? (
            refetchAttemptsState !== MAX_REFETCH_ATTEMPTS ? (
              <p className="text-sm text-text-muted text-center">
              Connection issue - retrying ({refetchAttemptsState}/{MAX_REFETCH_ATTEMPTS})
              </p>
            ) : (
              <p className="text-sm text-red-400 text-center">
                Failed to load accounts after {MAX_REFETCH_ATTEMPTS} attempts.
              </p>
            )
          ) : accounts?.length === 0 ? (
            <p className="text-sm text-text-muted text-center">No accounts found.</p>
          ) : (
            <div className="space-y-2 xl:min-h-75">
              {accounts?.map((account) => (
                <AccountCard
                  key={account.accountNumber}
                  account={account}
                  onSetSender={setSender}
                  onSetReceiver={setReceiver}
                  onDelete={() => {
                    invalidateCacheByPrefix(QUERY_KEY_PREFIX.ACCOUNT_LIST);
                    handleAccountExpired(account.accountNumber);
                  }}
                  onRefill={handleAccountRefilled}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
      </div>
    </div>
  );
}
