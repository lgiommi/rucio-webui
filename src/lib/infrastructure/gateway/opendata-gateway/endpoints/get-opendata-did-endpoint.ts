import { OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import { BaseEndpoint } from '@/lib/sdk/gateway-endpoints';
import { HTTPRequest } from '@/lib/sdk/http';

export default class GetOpenDataDIDEndpoint extends BaseEndpoint<OpenDataDIDDTO> {
    constructor(
        private rucioAuthToken: string,
        private scope: string,
        private name: string,
    ) {
        super();
    }

    async initialize(): Promise<void> {
        await super.initialize();

        this.url =
            `${this.rucioHost}/opendata/dids/` +
            `${encodeURIComponent(this.scope)}/` +
            `${encodeURIComponent(this.name)}?meta=1&files=0`;

        const request: HTTPRequest = {
            method: 'GET',
            url: this.url,
            headers: {
                'X-Rucio-Auth-Token': this.rucioAuthToken,
                'Content-Type': 'application/json',
            },
            body: null,
            params: undefined,
        };

        this.request = request;
        this.initialized = true;
    }

    reportErrors(
        statusCode: number,
        response: Response,
    ): Promise<OpenDataDIDDTO | undefined> {
        return Promise.resolve(undefined);
    }

    createDTO(data: any): OpenDataDIDDTO {
        data = data as {
            scope: string;
            name: string;
            state?: string;
            doi?: string | null;
            record_id?: number | null;
            meta?: Record<string, unknown>;
        };

        const dto: OpenDataDIDDTO = {
            status: 'success',
            scope: data.scope,
            name: data.name,
            state: data.state,
            doi: data.doi,
            record_id: data.record_id,
            meta: data.meta ?? {},
        };

        return dto;
    }
}