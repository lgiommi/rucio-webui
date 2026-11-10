'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, SelectionChangedEvent, ValueGetterParams } from 'ag-grid-community';

import { HiFilter, HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi2';

import { Button } from '@/component-library/atoms/form/button';
import { Input } from '@/component-library/atoms/form/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/component-library/atoms/form/select';

import { SearchButton } from '@/component-library/features/search/SearchButton';
import { RegularTable } from '@/component-library/features/table/RegularTable/RegularTable';
import { ListDIDMeta } from '@/component-library/pages/DID/list/meta/ListDIDMeta';

import type { DIDMetaViewModel } from '@/lib/infrastructure/data/view-model/did';
import { QUERY_KEYS } from '@/lib/infrastructure/query/query-keys';
import { Field } from '@/component-library/atoms/misc/Field';

type OpenDataDIDListItem = {
    scope: string;
    name: string;
    state?: string;
    created_at?: string;
    updated_at?: string;
};

type ListOpenDataDIDsResponse = {
    status: 'success' | 'error';
    message?: string;
    errorType?: string;
    total: number;
    offset: number;
    dids: OpenDataDIDListItem[];
};

type GetOpenDataDIDResponse = {
    status: 'success' | 'error';
    message?: string;
    errorType?: string;
    scope: string;
    name: string;
    state?: string;
};

type OpenDataSearch =
    | {
          kind: 'list';
          offset: number;
          limit: number;
          state: string;
      }
    | {
          kind: 'single';
          scope: string;
          name: string;
          state: string;
          limit: number;
      };

type OpenDataSearchResult = {
    dids: OpenDataDIDListItem[];
    total: number;
    offset: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const EMPTY_DIDS: OpenDataDIDListItem[] = [];

const VALID_STATES = ['draft', 'public', 'suspended'] as const;

/**
 * Read applied filters from the URL.
 *
 * Invalid pagination values fall back to safe defaults.
 * A single-DID query is selected only when scope and name are both set.
 */
function parseOpenDataSearch(params: URLSearchParams): OpenDataSearch {
    const requestedLimit = Number(params.get('limit') ?? DEFAULT_LIMIT);
    const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= MAX_LIMIT ? requestedLimit : DEFAULT_LIMIT;

    const requestedState = (params.get('state') ?? '').trim().toLowerCase();
    const state = VALID_STATES.some(value => value === requestedState) ? requestedState : '';

    const scope = (params.get('scope') ?? '').trim();
    const name = (params.get('name') ?? '').trim();

    if (scope && name) {
        return {
            kind: 'single',
            scope,
            name,
            state,
            limit,
        };
    }

    const requestedOffset = Number(params.get('offset') ?? 0);
    const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;

    return {
        kind: 'list',
        offset,
        limit,
        state,
    };
}

/**
 * Build a shareable URL without discarding unrelated query parameters.
 */
function buildOpenDataSearchUrl(pathname: string, currentQuery: string, search: OpenDataSearch): string {
    const params = new URLSearchParams(currentQuery);

    for (const key of ['scope', 'name', 'state', 'limit', 'offset']) {
        params.delete(key);
    }

    if (search.kind === 'single') {
        params.set('scope', search.scope);
        params.set('name', search.name);
    } else if (search.offset > 0) {
        params.set('offset', String(search.offset));
    }

    if (search.state) {
        params.set('state', search.state);
    }

    if (search.limit !== DEFAULT_LIMIT) {
        params.set('limit', String(search.limit));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}

function getOpenDataErrorMessage(response: { errorType?: string } | null, single: boolean): string {
    switch (response?.errorType) {
        case 'FEATURE_UNSUPPORTED':
            return 'OpenData is not supported by this Rucio deployment.';
        case 'NOT_FOUND':
            return single ? 'The requested OpenData DID was not found.' : 'No OpenData DIDs were found.';
        case 'CONFIGURATION_ERROR':
            return 'OpenData is not configured correctly on the server.';
        case 'INVALID_AUTH':
            return 'The request could not be authenticated.';
        case 'INVALID_REQUEST':
            return 'The OpenData request is invalid.';
        default:
            return single ? 'Unable to retrieve the requested OpenData DID.' : 'Unable to retrieve OpenData DIDs.';
    }
}

class OpenDataRequestError extends Error {
    constructor(message: string, readonly errorType?: string) {
        super(message);
        this.name = 'OpenDataRequestError';
    }
}

async function fetchOpenDataDIDs(search: OpenDataSearch, signal: AbortSignal): Promise<OpenDataSearchResult> {
    if (search.kind === 'single') {
        const params = new URLSearchParams({
            scope: search.scope,
            name: search.name,
            files: '0',
            meta: '0',
        });

        const response = await fetch(`/api/feature/get-opendata-did?${params.toString()}`, { signal });

        const data = (await response.json().catch(() => null)) as GetOpenDataDIDResponse | null;

        if (!response.ok || !data || data.status !== 'success') {
            throw new OpenDataRequestError(getOpenDataErrorMessage(data, true), data?.errorType);
        }

        const matchesState = !search.state || data.state?.toLowerCase() === search.state.toLowerCase();

        const dids: OpenDataDIDListItem[] = matchesState
            ? [
                  {
                      scope: data.scope,
                      name: data.name,
                      state: data.state,
                  },
              ]
            : [];

        return {
            dids,
            total: dids.length,
            offset: 0,
        };
    }

    const params = new URLSearchParams({
        limit: String(search.limit),
        offset: String(search.offset),
    });

    if (search.state) {
        params.set('state', search.state);
    }

    const response = await fetch(`/api/feature/list-opendata-dids?${params.toString()}`, { signal });

    const data = (await response.json().catch(() => null)) as ListOpenDataDIDsResponse | null;

    if (!response.ok || !data || data.status !== 'success') {
        throw new OpenDataRequestError(getOpenDataErrorMessage(data, false), data?.errorType);
    }

    return {
        dids: data.dids,
        total: data.total,
        offset: data.offset,
    };
}

const OpenDataFilterField = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="flex flex-col grow">
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
        </label>
        {children}
    </div>
);

export const ListOpenDataDIDs = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const searchParamsString = searchParams?.toString() ?? '';

    /*
     * The URL is the source of truth for applied filters.
     * This also supports refresh, shared links and browser Back/Forward.
     */
    const appliedSearch = useMemo(() => parseOpenDataSearch(new URLSearchParams(searchParamsString)), [searchParamsString]);

    /*
     * Draft fields are separate from applied filters.
     * Requests are not sent while the user is editing the form.
     */
    const [scope, setScope] = useState(appliedSearch.kind === 'single' ? appliedSearch.scope : '');
    const [name, setName] = useState(appliedSearch.kind === 'single' ? appliedSearch.name : '');
    const [state, setState] = useState(appliedSearch.state);
    const [limit, setLimit] = useState(String(appliedSearch.limit));

    const [isFilterExpanded, setIsFilterExpanded] = useState(Boolean(appliedSearch.state) || appliedSearch.limit !== DEFAULT_LIMIT);

    const [error, setError] = useState<string | null>(null);

    const [selectedDID, setSelectedDID] = useState<OpenDataDIDListItem | null>(null);
    const [meta, setMeta] = useState<DIDMetaViewModel>();
    const [isMetaLoading, setIsMetaLoading] = useState(false);
    const [hasMetaError, setHasMetaError] = useState(false);

    const tableRef = useRef<AgGridReact<OpenDataDIDListItem>>(null);

    const resultsQuery = useQuery<OpenDataSearchResult, Error>({
        queryKey: [...QUERY_KEYS.OPENDATA_DIDS, appliedSearch],
        queryFn: ({ signal }) => fetchOpenDataDIDs(appliedSearch, signal),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const dids = resultsQuery.data?.dids ?? EMPTY_DIDS;
    const total = resultsQuery.data?.total ?? 0;
    const offset = resultsQuery.data?.offset ?? (appliedSearch.kind === 'list' ? appliedSearch.offset : 0);
    const appliedLimit = appliedSearch.limit;
    const isLoading = resultsQuery.isFetching;

    const isUnsupported = resultsQuery.error instanceof OpenDataRequestError && resultsQuery.error.errorType === 'FEATURE_UNSUPPORTED';

    /*
     * Restore the form when navigating with browser Back/Forward
     * or opening a shared link.
     */
    useEffect(() => {
        setScope(appliedSearch.kind === 'single' ? appliedSearch.scope : '');
        setName(appliedSearch.kind === 'single' ? appliedSearch.name : '');
        setState(appliedSearch.state);
        setLimit(String(appliedSearch.limit));
        setError(null);
        setSelectedDID(null);
        tableRef.current?.api.deselectAll();

        if (appliedSearch.state || appliedSearch.limit !== DEFAULT_LIMIT) {
            setIsFilterExpanded(true);
        }
    }, [appliedSearch]);

    const [columnDefs] = useState<ColDef<OpenDataDIDListItem>[]>([
        {
            headerName: 'Identifier',
            valueGetter: (params: ValueGetterParams<OpenDataDIDListItem>) => {
                if (!params.data) {
                    return '';
                }
                return `${params.data.scope}:${params.data.name}`;
            },
            cellRenderer: (params: ICellRendererParams<OpenDataDIDListItem>) => {
                if (!params.data) {
                    return null;
                }

                const { scope, name } = params.data;

                return (
                    <Link
                        href={`/did/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`}
                        className="text-blue-700 dark:text-blue-300 underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
                        onClick={event => event.stopPropagation()}
                    >
                        {scope}:{name}
                    </Link>
                );
            },
            flex: 1,
            minWidth: 250,
            filter: false,
        },
        {
            headerName: 'State',
            field: 'state',
            minWidth: 140,
            maxWidth: 200,
            filter: false,
        },
    ]);

    const onSelectionChanged = (event: SelectionChangedEvent<OpenDataDIDListItem>) => {
        const selectedRows = event.api.getSelectedRows();

        if (selectedRows.length === 1) {
            setSelectedDID(selectedRows[0]);
        } else {
            setSelectedDID(null);
        }
    };

    /*
     * Reuse the existing Rucio DID metadata panel.
     * Abort the request when the selected DID changes.
     */
    useEffect(() => {
        setMeta(undefined);

        if (selectedDID === null) {
            setHasMetaError(false);
            setIsMetaLoading(false);
            return;
        }

        const abortController = new AbortController();

        const loadMeta = async () => {
            setIsMetaLoading(true);
            setHasMetaError(false);

            try {
                const params = new URLSearchParams({
                    scope: selectedDID.scope,
                    name: selectedDID.name,
                });

                const response = await fetch(`/api/feature/get-did-meta?${params.toString()}`, { signal: abortController.signal });

                if (!response.ok) {
                    throw new Error('Unable to retrieve DID metadata.');
                }

                const data = (await response.json()) as DIDMetaViewModel;

                if (!abortController.signal.aborted) {
                    setMeta(data);
                }
            } catch {
                if (abortController.signal.aborted) {
                    return;
                }

                setMeta(undefined);
                setHasMetaError(true);
            } finally {
                if (!abortController.signal.aborted) {
                    setIsMetaLoading(false);
                }
            }
        };

        void loadMeta();

        return () => {
            abortController.abort();
        };
    }, [selectedDID]);

    const navigateToSearch = (nextSearch: OpenDataSearch) => {
        const target = buildOpenDataSearchUrl(pathname ?? '/opendata/dids', searchParamsString, nextSearch);
        const current = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;

        setSelectedDID(null);
        tableRef.current?.api.deselectAll();

        if (target === current) {
            // Refresh even when the same filters are submitted again.
            void resultsQuery.refetch();
            return;
        }

        router.push(target, { scroll: false });
    };

    const applyFilters = () => {
        const requestedScope = scope.trim();
        const requestedName = name.trim();
        const requestedState = state.trim();

        const hasScope = requestedScope.length > 0;
        const hasName = requestedName.length > 0;

        if (hasScope !== hasName) {
            setError('Scope and name must be provided together.');
            return;
        }

        const requestedLimit = Number(limit);

        if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > MAX_LIMIT) {
            setError(`Limit must be an integer between 1 and ${MAX_LIMIT}.`);
            return;
        }

        setError(null);

        const nextSearch: OpenDataSearch =
            hasScope && hasName
                ? {
                      kind: 'single',
                      scope: requestedScope,
                      name: requestedName,
                      state: requestedState,
                      limit: requestedLimit,
                  }
                : {
                      kind: 'list',
                      offset: 0,
                      limit: requestedLimit,
                      state: requestedState,
                  };

        navigateToSearch(nextSearch);
    };

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        applyFilters();
    };

    const onStop = (event: FormEvent) => {
        event.preventDefault();

        void queryClient.cancelQueries({
            queryKey: [...QUERY_KEYS.OPENDATA_DIDS, appliedSearch],
            exact: true,
        });
    };

    const hasPreviousPage = appliedSearch.kind === 'list' && offset > 0;
    const hasNextPage = appliedSearch.kind === 'list' && offset + dids.length < total;

    const totalPages = total === 0 ? 0 : Math.ceil(total / appliedLimit);
    const currentPage = total === 0 ? 0 : Math.floor(offset / appliedLimit) + 1;

    const changePage = (nextOffset: number) => {
        if (appliedSearch.kind !== 'list' || isLoading) {
            return;
        }

        navigateToSearch({
            ...appliedSearch,
            offset: nextOffset,
        });
    };

    const previousPage = () => {
        if (!hasPreviousPage || isLoading) {
            return;
        }
        changePage(Math.max(0, offset - appliedLimit));
    };

    const nextPage = () => {
        if (!hasNextPage || isLoading) {
            return;
        }
        changePage(offset + appliedLimit);
    };

    const goToFirstPage = () => {
        if (!hasPreviousPage || isLoading) {
            return;
        }
        changePage(0);
    };

    const goToLastPage = () => {
        if (!hasNextPage || isLoading || total === 0) {
            return;
        }

        const lastOffset = Math.floor((total - 1) / appliedLimit) * appliedLimit;

        changePage(lastOffset);
    };

    const paginationButtonClasses = [
        'text-lg',
        'px-1',
        'text-neutral-800',
        'dark:text-neutral-100',
        'disabled:text-neutral-400',
        'disabled:dark:text-neutral-500',
    ].join(' ');

    return (
        <div className="flex flex-col space-y-6 w-full">
            {/* Search Panel */}
            <div className="rounded-lg bg-neutral-0 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
                <div className="flex flex-col space-y-4 w-full">
                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-start gap-y-4 md:gap-x-2">
                        <div className="order-1 flex flex-col md:flex-1 min-w-0 sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0">
                            <div className="w-full flex flex-row space-x-2 items-center">
                                <Input
                                    aria-label="Scope"
                                    placeholder="scope"
                                    className="max-w-[250px]"
                                    value={scope}
                                    onChange={event => setScope(event.target.value)}
                                    onEnterKey={onSearch}
                                />

                                <span className="text-neutral-900 dark:text-neutral-100 font-bold">:</span>

                                <Input
                                    aria-label="Name"
                                    placeholder="name"
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                    onEnterKey={onSearch}
                                />

                                <Button
                                    className="px-3"
                                    variant="neutral"
                                    onClick={() => setIsFilterExpanded(previous => !previous)}
                                    aria-expanded={isFilterExpanded}
                                    aria-label="Toggle filters"
                                >
                                    <HiFilter />

                                    {isFilterExpanded ? <HiChevronUp className="ml-1" /> : <HiChevronDown className="ml-1" />}
                                </Button>
                            </div>
                        </div>

                        {/* OpenData Filters */}
                        {isFilterExpanded && (
                            <div className="order-2 md:order-3 md:basis-full rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <OpenDataFilterField id="opendata-state" label="State">
                                        <Select value={state || 'all'} onValueChange={value => setState(value === 'all' ? '' : value)}>
                                            <SelectTrigger id="opendata-state" className="w-full">
                                                <SelectValue placeholder="All states" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All states</SelectItem>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="public">Public</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </OpenDataFilterField>

                                    <OpenDataFilterField id="opendata-limit" label="Limit">
                                        <Input
                                            id="opendata-limit"
                                            type="number"
                                            min={1}
                                            max={MAX_LIMIT}
                                            step={1}
                                            value={limit}
                                            onChange={event => setLimit(event.target.value)}
                                            onEnterKey={onSearch}
                                            placeholder="Maximum number of DIDs returned"
                                            className="w-full"
                                        />
                                    </OpenDataFilterField>
                                </div>
                            </div>
                        )}

                        <SearchButton className="order-3 md:order-2 sm:w-full md:w-48" isRunning={isLoading} onStop={onStop} onSearch={onSearch} />
                    </div>
                </div>
            </div>

            {/* Validation/API error */}
            {(error || (resultsQuery.isError && !isUnsupported)) && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300"
                >
                    {error ?? (resultsQuery.error instanceof Error ? resultsQuery.error.message : 'Unable to retrieve OpenData DIDs.')}
                </div>
            )}

            {!error && isUnsupported && (
                <Field variant="subtle" fullWidth role="status">
                    OpenData is not supported by this Rucio deployment.
                </Field>
            )}

            {/* Results */}
            <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-20rem)]">
                <div className="lg:flex-1 rounded-lg bg-neutral-0 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden h-[60vh] lg:h-full">
                    <div className="flex flex-col h-full">
                        {/* AG Grid displays the current server-side page.
                            RegularTable's client-side pager is disabled. */}
                        <div className="flex-1 min-h-0">
                            <RegularTable
                                tableRef={tableRef}
                                rowData={dids}
                                columnDefs={columnDefs}
                                showPaginationPanel={false}
                                rowSelection={{
                                    mode: 'singleRow',
                                    enableClickSelection: true,
                                }}
                                onSelectionChanged={onSelectionChanged}
                                paginationPageSize={Math.max(dids.length, 1)}
                                getRowId={params => `${params.data.scope}:${params.data.name}`}
                            />
                        </div>

                        {/* Server-side pagination */}
                        <div className="flex items-center justify-center text-neutral-800 dark:text-neutral-100 py-2 !m-0 bg-neutral-200 dark:bg-neutral-700 border border-solid border-neutral-900/10 dark:border-neutral-100/10 rounded-b-md">
                            <div className="flex justify-center items-center">
                                <button
                                    type="button"
                                    aria-label="First page"
                                    disabled={!hasPreviousPage || isLoading}
                                    onClick={goToFirstPage}
                                    className={paginationButtonClasses}
                                >
                                    <HiOutlineChevronDoubleLeft />
                                </button>

                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={!hasPreviousPage || isLoading}
                                    onClick={previousPage}
                                    className={paginationButtonClasses}
                                >
                                    <HiOutlineChevronLeft />
                                </button>

                                <span className="px-3" aria-live="polite">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={!hasNextPage || isLoading}
                                    onClick={nextPage}
                                    className={paginationButtonClasses}
                                >
                                    <HiOutlineChevronRight />
                                </button>

                                <button
                                    type="button"
                                    aria-label="Last page"
                                    disabled={!hasNextPage || isLoading}
                                    onClick={goToLastPage}
                                    className={paginationButtonClasses}
                                >
                                    <HiOutlineChevronDoubleRight />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Standard Rucio DID metadata panel */}
                <div className="w-full lg:w-96 shrink-0 lg:h-full">
                    <ListDIDMeta meta={meta} isLoading={isMetaLoading} hasError={hasMetaError} />
                </div>
            </div>
        </div>
    );
};
