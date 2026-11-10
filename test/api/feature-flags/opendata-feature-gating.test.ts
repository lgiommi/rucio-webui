import { NextRequest } from 'next/server';

import { withFeature } from '@/lib/infrastructure/adapters/with-feature';
import { requireFeature } from '@/lib/infrastructure/feature-flags/require-feature';
import CONTROLLERS from '@/lib/infrastructure/ioc/ioc-symbols-controllers';

// jsdom does not always provide Response.json.
if (typeof (global.Response as { json?: unknown }).json !== 'function') {
    (
        global.Response as unknown as {
            json: (data: unknown, init?: ResponseInit) => Response;
        }
    ).json = (data, init) =>
        new Response(JSON.stringify(data), {
            ...init,
            headers: {
                'content-type': 'application/json',
            },
        });
}

jest.mock('@/component-library/pages/DID/list/ListOpenDataDIDs', () => ({
    ListOpenDataDIDs: () => null,
}));

jest.mock('@/lib/infrastructure/feature-flags/require-feature', () => ({
    requireFeature: jest.fn().mockResolvedValue(undefined),
}));

describe('OpenData feature gating', () => {
    const originalValue = process.env.FEATURE_OPENDATA;

    const controllers = [CONTROLLERS.OPENDATA_DID, CONTROLLERS.LIST_OPENDATA_DIDS];

    afterEach(() => {
        if (originalValue === undefined) {
            delete process.env.FEATURE_OPENDATA;
        } else {
            process.env.FEATURE_OPENDATA = originalValue;
        }

        jest.clearAllMocks();
    });

    it.each(controllers)('returns 404 when OpenData is disabled by default', async controller => {
        delete process.env.FEATURE_OPENDATA;

        const handler = jest.fn(async () => new Response('ok', { status: 200 }));

        const wrapped = withFeature(controller, handler);
        const response = await wrapped(new NextRequest('http://localhost/api/feature/test'));

        expect(response.status).toBe(404);
        expect(handler).not.toHaveBeenCalled();
    });

    it.each(controllers)('executes the handler when OpenData is enabled', async controller => {
        process.env.FEATURE_OPENDATA = 'true';

        const handler = jest.fn(async () => new Response('ok', { status: 200 }));

        const wrapped = withFeature(controller, handler);
        const response = await wrapped(new NextRequest('http://localhost/api/feature/test'));

        expect(response.status).toBe(200);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    describe('page', () => {
        it('requires the opendata feature', async () => {
            const { default: Page } = await import('@/app/(rucio)/opendata/dids/page');

            await Page();

            expect(requireFeature).toHaveBeenCalledTimes(1);
            expect(requireFeature).toHaveBeenCalledWith('opendata');
        });
    });
});
