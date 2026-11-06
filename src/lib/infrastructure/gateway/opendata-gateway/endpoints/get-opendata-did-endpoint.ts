import { OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import { BaseEndpoint } from '@/lib/sdk/gateway-endpoints';
import { HTTPRequest } from '@/lib/sdk/http';
import type { OpenDataDIDQueryOptions } from '@/lib/core/port/secondary/opendata-gateway-output-port';
import { normalizeOpenDataDIDState } from '@/lib/core/entity/opendata';
import type { OpenDataFilesSummaryDTO } from '@/lib/core/dto/opendata-dto';

export default class GetOpenDataDIDEndpoint extends BaseEndpoint<OpenDataDIDDTO> {
    constructor(private rucioAuthToken: string, private scope: string, private name: string, private options: OpenDataDIDQueryOptions = {}) {
        super();
    }

    async initialize(): Promise<void> {
        await super.initialize();

        const params = new URLSearchParams({
            meta: this.options.includeMeta === false ? '0' : '1',
            files: this.options.includeFiles === false ? '0' : '1',
        });

        if (this.options.includeDownloadUrls === true) {
            params.set('download_urls', '1');
        }

        this.url =
            `${this.rucioHost}/opendata/dids/` + `${encodeURIComponent(this.scope)}/` + `${encodeURIComponent(this.name)}?${params.toString()}`;

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

    reportErrors(statusCode: number, response: Response): Promise<OpenDataDIDDTO | undefined> {
        return Promise.resolve(undefined);
    }

    createDTO(data: object | string): OpenDataDIDDTO {
        const response = data as {
            scope: string;
            name: string;
            state?: string;
            doi?: string | null;
            record_id?: number | null;
            meta?: Record<string, unknown>;
            files_summary?: OpenDataFilesSummaryDTO;
            files?: Array<{
                scope: string;
                name: string;
                bytes?: number | null;
                adler32?: string | null;
                uris?: string[];
                download_urls?: string[];
            }>;
        };

        return {
            status: 'success',
            scope: response.scope,
            name: response.name,
            state: normalizeOpenDataDIDState(response.state),
            doi: response.doi,
            record_id: response.record_id,
            meta: response.meta ?? {},
            files_summary: response.files_summary,
            files: (response.files ?? []).map(file => ({
                scope: file.scope,
                name: file.name,
                bytes: file.bytes,
                adler32: file.adler32,
                uris: file.uris,
                download_urls: file.download_urls ?? [],
            })),
        };
    }
}
