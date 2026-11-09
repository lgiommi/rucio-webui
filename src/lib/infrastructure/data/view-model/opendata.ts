import type { BaseViewModel } from '@/lib/sdk/view-models';
import type { OpenDataErrorType } from '@/lib/core/entity/opendata';
import type { OpenDataDIDResponse } from '@/lib/core/usecase-models/opendata-did-usecase-models';
import type { ListOpenDataDIDsResponse } from '@/lib/core/usecase-models/list-opendata-dids-usecase-models';

export interface OpenDataDIDViewModel extends BaseViewModel {
    errorType?: OpenDataErrorType;
    scope: string;
    name: string;
    state?: OpenDataDIDResponse['state'];
    doi?: string | string[] | null;
    record_id?: number | string | Array<number | string> | null;
    files: OpenDataDIDResponse['files'];
    files_summary?: OpenDataDIDResponse['files_summary'];
    meta: Record<string, unknown>;
}

export interface ListOpenDataDIDsViewModel extends BaseViewModel {
    errorType?: OpenDataErrorType;
    total: number;
    offset: number;
    dids: ListOpenDataDIDsResponse['dids'];
}
