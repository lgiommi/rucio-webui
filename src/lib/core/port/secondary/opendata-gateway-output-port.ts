import { ListOpenDataDIDsDTO, OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import type { OpenDataDIDStateFilter } from '@/lib/core/entity/opendata';

export interface OpenDataDIDQueryOptions {
    includeFiles?: boolean;
    includeMeta?: boolean;
    includeDownloadUrls?: boolean;
}

export default interface OpenDataGatewayOutputPort {
    getOpenDataDID(rucioAuthToken: string, scope: string, name: string, options?: OpenDataDIDQueryOptions): Promise<OpenDataDIDDTO>;

    listOpenDataDIDs(rucioAuthToken: string, limit?: number, offset?: number, state?: OpenDataDIDStateFilter): Promise<ListOpenDataDIDsDTO>;
}
