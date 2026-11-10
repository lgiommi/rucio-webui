import { BaseErrorResponseModel, BaseResponseModel } from '@/lib/sdk/usecase-models';
import type { OpenDataDIDState, OpenDataErrorType } from '@/lib/core/entity/opendata';
import type { OpenDataFilesSummaryDTO } from '@/lib/core/dto/opendata-dto';

export interface OpenDataDIDFileResponse {
    scope: string;
    name: string;
    download_urls: string[];
    bytes?: number | null;
    adler32?: string | null;
    uris?: string[];
}

export interface OpenDataDIDRequest {
    did: string;
    scope: string;
    includeFiles?: boolean;
    includeMeta?: boolean;
    includeDownloadUrls?: boolean;
}

export interface OpenDataDIDResponse extends BaseResponseModel {
    scope: string;
    name: string;
    state?: OpenDataDIDState;
    files_summary?: OpenDataFilesSummaryDTO;
    doi?: string | string[] | null;
    record_id?: number | string | Array<number | string> | null;
    files: OpenDataDIDFileResponse[];
    meta: Record<string, unknown>;
}

export interface OpenDataDIDError extends BaseErrorResponseModel {
    error: OpenDataErrorType;
}
