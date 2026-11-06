import { BaseErrorResponseModel, BaseResponseModel } from '@/lib/sdk/usecase-models';
import type { OpenDataDIDState, OpenDataDIDStateFilter, OpenDataErrorType } from '@/lib/core/entity/opendata';

export interface ListOpenDataDIDsRequest {
    limit?: number;
    offset?: number;
    state?: OpenDataDIDStateFilter;
}

export interface OpenDataDIDListItem {
    scope: string;
    name: string;
    state?: OpenDataDIDState;
    created_at?: string;
    updated_at?: string;
}

export interface ListOpenDataDIDsResponse extends BaseResponseModel {
    total: number;
    offset: number;
    dids: OpenDataDIDListItem[];
}

export interface ListOpenDataDIDsError extends BaseErrorResponseModel {
    error: OpenDataErrorType;
}
