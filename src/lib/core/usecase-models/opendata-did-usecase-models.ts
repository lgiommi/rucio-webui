import { BaseErrorResponseModel, BaseResponseModel } from '@/lib/sdk/usecase-models';

export interface OpenDataDIDRequest {
    did: string;
    scope: string;
}

export interface OpenDataDIDResponse extends BaseResponseModel {
    scope: string;
    name: string;
    state?: string;
    doi?: string | null;
    record_id?: number | null;
    meta: Record<string, unknown>;
}

export interface OpenDataDIDError extends BaseErrorResponseModel {
    error: 'UNKNOWN_ERROR' | 'INVALID_REQUEST' | 'INVALID_AUTH' | 'NOT_FOUND';
}
