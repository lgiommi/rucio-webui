import type { NextApiResponse } from 'next';
import type { BaseController } from '@/lib/sdk/controller';
import type { OpenDataDIDRequest } from '@/lib/core/usecase-models/opendata-did-usecase-models';
import type { OpenDataDIDControllerParameters } from '@/lib/infrastructure/controller/opendata-did-controller';

import appContainer from '@/lib/infrastructure/ioc/container-config';
import CONTROLLERS from '@/lib/infrastructure/ioc/ioc-symbols-controllers';
import { createHttpMocks } from 'test/fixtures/http-fixtures';
import MockRucioServerFactory, { MockEndpoint } from 'test/fixtures/rucio-server';

describe('OpenData DID controller integration', () => {
    beforeEach(() => {
        fetchMock.doMock();
    });

    afterEach(() => {
        fetchMock.dontMock();
    });

    async function execute(
        endpoint: MockEndpoint,
        options: {
            includeFiles?: boolean;
            includeMeta?: boolean;
            includeDownloadUrls?: boolean;
        } = {},
    ) {
        MockRucioServerFactory.createMockRucioServer(true, [endpoint]);

        const { res } = await createHttpMocks('/api/feature/get-opendata-did', 'GET', {});

        const controller = appContainer.get<BaseController<OpenDataDIDControllerParameters, OpenDataDIDRequest>>(CONTROLLERS.OPENDATA_DID);

        await controller.execute({
            name: 'dataset',
            scope: 'test',
            rucioAuthToken: MockRucioServerFactory.VALID_RUCIO_TOKEN,
            response: res as unknown as NextApiResponse,
            ...options,
        });

        return {
            status: res._getStatusCode(),
            body: JSON.parse(res._getData()),
        };
    }

    function mockEndpoint(status: number, body: unknown, contentType = 'application/json'): MockEndpoint {
        return {
            url: `${MockRucioServerFactory.RUCIO_HOST}/opendata/dids/test/dataset`,
            method: 'GET',
            includes: '/opendata/dids/test/dataset?',
            response: {
                status,
                headers: { 'Content-Type': contentType },
                body: typeof body === 'string' ? body : JSON.stringify(body),
            },
        };
    }

    it('returns DID details without requesting download URLs', async () => {
        const endpoint = mockEndpoint(200, {
            scope: 'test',
            name: 'dataset',
            state: 'PUBLIC',
            meta: { experiment: 'ATLAS' },
            files_summary: { length: 1, bytes: 1024 },
            files: [
                {
                    scope: 'test',
                    name: 'file.root',
                    bytes: 1024,
                    adler32: '12345678',
                },
            ],
        });

        endpoint.requestValidator = async request => {
            const url = new URL(request.url);

            return url.searchParams.get('meta') === '1' && url.searchParams.get('files') === '1' && url.searchParams.get('download_urls') !== '1';
        };

        const result = await execute(endpoint);

        expect(result.status).toBe(200);
        expect(result.body.status).toBe('success');
        expect(result.body.files_summary.bytes).toBe(1024);
        expect(result.body.files[0].adler32).toBe('12345678');
    });

    it('returns NOT_FOUND for an OpenData DID not found', async () => {
        const result = await execute(
            mockEndpoint(404, {
                ExceptionClass: 'OpenDataDataIdentifierNotFound',
                ExceptionMessage: 'DID not found',
            }),
        );

        expect(result.status).toBe(404);
        expect(result.body.status).toBe('error');
        expect(result.body.errorType).toBe('NOT_FOUND');
    });

    it('returns FEATURE_UNSUPPORTED for an unclassified HTML 404', async () => {
        const result = await execute(mockEndpoint(404, '<html>Not Found</html>', 'text/html'));

        expect(result.status).toBe(404);
        expect(result.body.errorType).toBe('FEATURE_UNSUPPORTED');
    });

    it('returns DOWNLOAD_UNAVAILABLE for missing replicas', async () => {
        const result = await execute(
            mockEndpoint(404, {
                ExceptionClass: 'ReplicaNotFound',
                ExceptionMessage: 'No suitable replica found',
            }),
            {
                includeFiles: true,
                includeMeta: false,
                includeDownloadUrls: true,
            },
        );

        expect(result.status).toBe(404);
        expect(result.body.errorType).toBe('DOWNLOAD_UNAVAILABLE');
    });

    it.each([
        [500, 'OpenDataError'],
        [503, 'ResourceTemporaryUnavailable'],
        [503, undefined],
    ] as const)('returns DOWNLOAD_UNAVAILABLE for HTTP %i with ExceptionClass %s', async (status, errorClass) => {
        const endpoint = mockEndpoint(status, {
            ...(errorClass && { ExceptionClass: errorClass }),
            ExceptionMessage: 'Download URL generation failed',
        });

        endpoint.requestValidator = async request => {
            const params = new URL(request.url).searchParams;

            return params.get('meta') === '0' && params.get('files') === '1' && params.get('download_urls') === '1';
        };

        const result = await execute(endpoint, {
            includeFiles: true,
            includeMeta: false,
            includeDownloadUrls: true,
        });

        expect(result.status).toBe(status);
        expect(result.body.status).toBe('error');
        expect(result.body.errorType).toBe('DOWNLOAD_UNAVAILABLE');
    });

    it('returns CONFIGURATION_ERROR for missing OpenData configuration', async () => {
        const result = await execute(
            mockEndpoint(400, {
                ExceptionClass: 'NoSectionError',
                ExceptionMessage: 'No section: opendata',
            }),
        );

        expect(result.status).toBe(400);
        expect(result.body.errorType).toBe('CONFIGURATION_ERROR');
    });

    it('supports a lightweight DID request', async () => {
        const endpoint = mockEndpoint(200, {
            scope: 'test',
            name: 'dataset',
            state: 'PUBLIC',
        });

        endpoint.requestValidator = async request => {
            const url = new URL(request.url);

            return url.searchParams.get('meta') === '0' && url.searchParams.get('files') === '0' && url.searchParams.get('download_urls') !== '1';
        };

        const result = await execute(endpoint, {
            includeFiles: false,
            includeMeta: false,
            includeDownloadUrls: false,
        });

        expect(result.status).toBe(200);
        expect(result.body.files).toEqual([]);
    });

    it('keeps DID metadata available when download URLs cannot be retrieved', async () => {
        const detailsEndpoint = mockEndpoint(200, {
            scope: 'test',
            name: 'dataset',
            state: 'PUBLIC',
            meta: { experiment: 'ATLAS' },
            files_summary: {
                length: 1,
                bytes: 1024,
            },
            files: [
                {
                    scope: 'test',
                    name: 'file.root',
                    bytes: 1024,
                    adler32: '12345678',
                },
            ],
        });

        detailsEndpoint.requestValidator = async request => {
            const params = new URL(request.url).searchParams;

            return params.get('meta') === '1' && params.get('files') === '1' && params.get('download_urls') !== '1';
        };

        // First request: metadata and files must be available.
        const details = await execute(detailsEndpoint, {
            includeFiles: true,
            includeMeta: true,
            includeDownloadUrls: false,
        });

        expect(details.status).toBe(200);
        expect(details.body.status).toBe('success');
        expect(details.body.meta).toEqual({ experiment: 'ATLAS' });
        expect(details.body.files).toHaveLength(1);
        expect(details.body.files[0].download_urls ?? []).toHaveLength(0);
        expect(details.body.files_summary.bytes).toBe(1024);

        // Configure a separate mock response for the download request.
        fetchMock.resetMocks();
        fetchMock.doMock();

        const downloadsEndpoint = mockEndpoint(404, {
            ExceptionClass: 'ReplicaNotFound',
            ExceptionMessage: 'No suitable replica found',
        });

        downloadsEndpoint.requestValidator = async request => {
            const params = new URL(request.url).searchParams;

            return params.get('meta') === '0' && params.get('files') === '1' && params.get('download_urls') === '1';
        };

        const downloads = await execute(downloadsEndpoint, {
            includeFiles: true,
            includeMeta: false,
            includeDownloadUrls: true,
        });

        // The download failure must be classified independently.
        expect(downloads.status).toBe(404);
        expect(downloads.body.status).toBe('error');
        expect(downloads.body.errorType).toBe('DOWNLOAD_UNAVAILABLE');

        // The earlier metadata response must remain valid.
        expect(details.status).toBe(200);
        expect(details.body.meta).toEqual({ experiment: 'ATLAS' });
        expect(details.body.files).toHaveLength(1);
    });

    it('does not classify metadata HTTP 500 errors as download failures', async () => {
        const result = await execute(
            mockEndpoint(500, {
                ExceptionClass: 'OpenDataError',
                ExceptionMessage: 'Internal OpenData error',
            }),
            {
                includeFiles: true,
                includeMeta: true,
                includeDownloadUrls: false,
            },
        );

        expect(result.status).toBe(500);
        expect(result.body.status).toBe('error');
        expect(result.body.errorType).toBe('UNKNOWN_ERROR');
    });
});
