import type { OpenDataDIDState } from '@/lib/core/entity/opendata';

export interface OpenDataDIDFileDTO {
    scope: string;
    name: string;
    bytes?: number | null;
    adler32?: string | null;
    uris?: string[];
    download_urls: string[];
}

export interface OpenDataFilesSummaryDTO {
    length: number;
    bytes: number;
    extensions?: string[];
    replicas_missing?: number;
    request_cache_hit?: boolean;
    request_time_elapsed_millis?: number;
}

export interface OpenDataDIDListItemDTO {
    scope: string;
    name: string;
    state?: OpenDataDIDState;
    created_at?: string;
    updated_at?: string;
}

export interface ListOpenDataDIDsDTO {
    status: 'success' | 'error';
    total: number;
    offset: number;
    dids: OpenDataDIDListItemDTO[];

    errorName?: string;
    errorType?: string;
    errorCode?: number;
    errorMessage?: string;
    errorClass?: string;
}

export interface OpenDataDIDDTO {
    status: 'success' | 'error';
    scope: string;
    name: string;

    state?: OpenDataDIDState;
    doi?: string | null;
    record_id?: number | null;
    files: OpenDataDIDFileDTO[];
    files_summary?: OpenDataFilesSummaryDTO;
    meta: Record<string, unknown>;

    errorName?: string;
    errorType?: string;
    errorCode?: number;
    errorMessage?: string;
    errorClass?: string;
}
