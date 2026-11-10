'use client';

import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import { Button } from '@/component-library/atoms/form/button';
import { Field } from '@/component-library/atoms/misc/Field';
import { LoadingSpinner } from '@/component-library/atoms/loading/LoadingSpinner';
import { CopyableField } from '@/component-library/features/fields/CopyableField';
import { WarningField } from '@/component-library/features/fields/WarningField';
import { JSONViewer } from '@/component-library/features/json';
import { KeyValueRow } from '@/component-library/features/key-value/KeyValueRow';
import { RegularTable } from '@/component-library/features/table/RegularTable/RegularTable';
import { formatFileSize } from '@/component-library/features/utils/text-formatters';
import { normalizeOpenDataIdentifiers } from '@/lib/core/entity/opendata';
import type { OpenDataErrorType } from '@/lib/core/entity/opendata';
import type { OpenDataDIDFileResponse } from '@/lib/core/usecase-models/opendata-did-usecase-models';
import type { OpenDataDIDViewModel } from '@/lib/infrastructure/data/view-model/opendata';
import { QUERY_KEYS } from '@/lib/infrastructure/query/query-keys';

class OpenDataRequestError extends Error {
    constructor(readonly type: OpenDataErrorType) {
        super(type);
        this.name = 'OpenDataRequestError';
    }
}

/**
 * Read the typed presenter response without exposing raw server errors
 * or internal Rucio URLs to the user.
 */
async function fetchOpenData(endpoint: string, scope: string, name: string): Promise<OpenDataDIDViewModel> {
    const params = new URLSearchParams({ scope, name });
    const response = await fetch(`${endpoint}?${params.toString()}`);

    const body = (await response.json().catch(() => null)) as Partial<OpenDataDIDViewModel> | null;

    if (!response.ok || body?.status !== 'success') {
        throw new OpenDataRequestError(body?.errorType ?? 'UNKNOWN_ERROR');
    }

    return body as OpenDataDIDViewModel;
}

function getErrorMessage(error: unknown, operation: 'metadata' | 'downloads'): string {
    const type = error instanceof OpenDataRequestError ? error.type : 'UNKNOWN_ERROR';

    switch (type) {
        case 'FEATURE_UNSUPPORTED':
            return 'OpenData is not supported by this Rucio deployment.';

        case 'NOT_FOUND':
            return 'The requested OpenData DID was not found.';

        case 'CONFIGURATION_ERROR':
            return 'OpenData is not configured correctly on the server.';

        case 'DOWNLOAD_UNAVAILABLE':
            return 'Download URLs are currently unavailable for this DID.';

        case 'INVALID_AUTH':
            return 'The request could not be authenticated.';

        case 'INVALID_REQUEST':
            return 'The OpenData request is invalid.';

        default:
            return operation === 'downloads'
                ? 'Unable to retrieve download URLs at the moment.'
                : 'Unable to retrieve OpenData metadata at the moment.';
    }
}

/**
 * Prefer HTTPS, then HTTP. Other protocols are not directly
 * downloadable through a browser link.
 */
function getPreferredDownloadUrl(urls: string[]): string | undefined {
    let httpUrl: string | undefined;

    for (const url of urls) {
        try {
            const parsed = new URL(url);

            if (parsed.protocol === 'https:') {
                return url;
            }

            if (parsed.protocol === 'http:' && !httpUrl) {
                httpUrl = url;
            }
        } catch {
            // Ignore invalid URLs.
        }
    }

    return httpUrl;
}

export type DetailsDIDOpenDataProps = {
    scope: string;
    name: string;
    isActive?: boolean;
};

export const DetailsDIDOpenData = ({ scope, name, isActive }: DetailsDIDOpenDataProps) => {
    const tableRef = useRef<AgGridReact<OpenDataDIDFileResponse>>(null);

    /*
     * Metadata and file information. No download URL request here.
     */
    const metadataQuery = useQuery<OpenDataDIDViewModel, OpenDataRequestError>({
        queryKey: [...QUERY_KEYS.OPENDATA_DID, scope, name],
        queryFn: () => fetchOpenData('/api/feature/get-opendata-did', scope, name),
        enabled: isActive === true,
        retry: false,
        refetchOnWindowFocus: false,
    });

    /*
     * Download URLs are retrieved independently.
     * A download failure must not hide metadata.
     */
    const downloadQuery = useQuery<OpenDataDIDViewModel, OpenDataRequestError>({
        queryKey: [...QUERY_KEYS.OPENDATA_DOWNLOAD_URLS, scope, name],
        queryFn: () => fetchOpenData('/api/feature/get-opendata-download-urls', scope, name),
        enabled: isActive === true && metadataQuery.data?.status === 'success' && (metadataQuery.data?.files.length ?? 0) > 0,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const downloadFiles = downloadQuery.data?.files;

    /*
     * Match metadata files to downloadable files by DID.
     * Do not rely on the ordering of the two API responses.
     */
    const downloadUrlsByDID = useMemo(() => {
        const result = new Map<string, string[]>();

        for (const file of downloadFiles ?? []) {
            result.set(`${file.scope}:${file.name}`, file.download_urls ?? []);
        }

        return result;
    }, [downloadFiles]);

    const isDownloadLoading = downloadQuery.isPending && downloadQuery.isFetching;

    const columns = useMemo<ColDef<OpenDataDIDFileResponse>[]>(
        () => [
            {
                headerName: 'File',
                valueGetter: params => (params.data ? `${params.data.scope}:${params.data.name}` : ''),
                minWidth: 250,
                flex: 2,
                filter: true,
                sortable: true,
            },
            {
                headerName: 'Size',
                field: 'bytes',
                minWidth: 130,
                valueFormatter: params => (params.value == null ? '—' : formatFileSize(params.value)),
                sortable: true,
                filter: 'agNumberColumnFilter',
            },
            {
                headerName: 'Adler32',
                field: 'adler32',
                minWidth: 150,
                valueFormatter: params => params.value ?? '—',
            },
            {
                headerName: 'Download',
                minWidth: 160,
                sortable: false,
                filter: false,
                cellRenderer: (params: ICellRendererParams<OpenDataDIDFileResponse>) => {
                    const file = params.data;

                    if (!file) {
                        return null;
                    }

                    const urls = downloadUrlsByDID.get(`${file.scope}:${file.name}`) ?? [];
                    const url = getPreferredDownloadUrl(urls);

                    return (
                        <Button
                            type="button"
                            size="sm"
                            variant="neutral"
                            disabled={!url}
                            loading={isDownloadLoading}
                            aria-label={`Download ${file.name}`}
                            onClick={() => {
                                if (url) {
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                }
                            }}
                        >
                            Download
                        </Button>
                    );
                },
            },
        ],
        [downloadUrlsByDID, isDownloadLoading],
    );

    if (!isActive) {
        return <></>;
    }

    if (metadataQuery.isPending) {
        return (
            <div className="flex items-center gap-3 p-4">
                <LoadingSpinner />
                <span>Loading OpenData metadata...</span>
            </div>
        );
    }

    if (metadataQuery.isError) {
        const message = getErrorMessage(metadataQuery.error, 'metadata');

        const isInformational = metadataQuery.error.type === 'FEATURE_UNSUPPORTED' || metadataQuery.error.type === 'NOT_FOUND';

        return (
            <div className="p-4">
                {isInformational ? (
                    <Field variant="subtle" fullWidth role="status">
                        {message}
                    </Field>
                ) : (
                    <div role="alert">
                        <WarningField>{message}</WarningField>
                    </div>
                )}
            </div>
        );
    }

    const data = metadataQuery.data;
    const files = data.files ?? [];

    // Support both single identifiers and arrays returned by Rucio.
    const dois = normalizeOpenDataIdentifiers(data.doi);
    const recordIds = normalizeOpenDataIdentifiers(data.record_id);

    return (
        <div className="flex flex-col gap-6 p-4 min-w-0 overflow-auto">
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">OpenData metadata</h2>

                <div>
                    <KeyValueRow name="DID">
                        <CopyableField text={`${data.scope}:${data.name}`} />
                    </KeyValueRow>

                    {data.state && (
                        <KeyValueRow name="State">
                            <Field>{data.state}</Field>
                        </KeyValueRow>
                    )}

                    {dois.length > 0 && (
                        <KeyValueRow name="DOI">
                            <div className="flex flex-col gap-1">
                                {dois.map((doi, index) => (
                                    <a
                                        key={`${doi}-${index}`}
                                        href={`https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, '/')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-fit break-all text-blue-600 underline dark:text-blue-400"
                                    >
                                        {doi}
                                    </a>
                                ))}
                            </div>
                        </KeyValueRow>
                    )}

                    {recordIds.length > 0 && (
                        <KeyValueRow name="Record ID">
                            <div className="flex flex-col gap-1">
                                {recordIds.map((recordId, index) => (
                                    <Field key={`${recordId}-${index}`}>{recordId}</Field>
                                ))}
                            </div>
                        </KeyValueRow>
                    )}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Files</h2>

                {data.files_summary && (
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-600 dark:text-neutral-300">
                        <span>Total files: {data.files_summary.length}</span>
                        <span>Total size: {formatFileSize(data.files_summary.bytes)}</span>
                    </div>
                )}

                {downloadQuery.isError && files.length > 0 && (
                    <div role="alert">
                        <WarningField>
                            {getErrorMessage(downloadQuery.error, 'downloads')} Metadata remains available, but downloads cannot be started.
                        </WarningField>
                    </div>
                )}

                {files.length === 0 ? (
                    <Field variant="subtle" fullWidth>
                        No files available.
                    </Field>
                ) : (
                    <div className="h-[28rem] min-w-0">
                        <RegularTable
                            tableRef={tableRef}
                            rowData={files}
                            columnDefs={columns}
                            paginationPageSize={50}
                            getRowId={params => `${params.data.scope}:${params.data.name}`}
                        />
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Metadata JSON</h2>

                <JSONViewer value={JSON.stringify(data.meta ?? {}, null, 2)} />
            </section>
        </div>
    );
};
