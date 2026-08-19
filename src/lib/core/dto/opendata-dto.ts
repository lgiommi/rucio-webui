export interface OpenDataDIDDTO {
    status: 'success' | 'error';

    scope: string;
    name: string;

    state?: string;
    doi?: string | null;
    record_id?: number | null;

    meta: Record<string, unknown>;

    errorName?: string;
    errorType?: string;
    errorCode?: number;
    errorMessage?: string;
}