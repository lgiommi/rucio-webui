import { useState, type PropsWithChildren } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { ListOpenDataDIDs } from './ListOpenDataDIDs';
import { DIDAvailability, DIDType } from '@/lib/core/entity/rucio';

type OpenDataListItem = {
    scope: string;
    name: string;
    state: string;
};

const sampleDIDs: OpenDataListItem[] = [
    { scope: 'demo', name: 'example.root', state: 'PUBLIC' },
    { scope: 'demo', name: 'simulation.root', state: 'PUBLIC' },
    { scope: 'research', name: 'draft-dataset', state: 'DRAFT' },
];

const listHandler = (dids: OpenDataListItem[], total = dids.length, offset = 0) =>
    http.get('/api/feature/list-opendata-dids', () =>
        HttpResponse.json({
            status: 'success',
            total,
            offset,
            dids,
        }),
    );

// Selecting a row loads the standard DID metadata panel.
const didMetadataHandler = http.get('/api/feature/get-did-meta', ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json({
        status: 'success',
        scope: params.get('scope') ?? 'demo',
        name: params.get('name') ?? 'example.root',
        account: 'demo',
        did_type: DIDType.FILE,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-10T10:00:00Z',
        availability: DIDAvailability.AVAILABLE,
        obsolete: false,
        hidden: false,
        suppressed: false,
        purge_replicas: false,
        monotonic: false,
        is_open: null,
        adler32: 'abcdef12',
        md5: null,
        guid: null,
        bytes: 1024,
        is_opendata: true,
    });
});

function StoryQueryProvider({ children }: PropsWithChildren) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const meta = {
    title: 'Features/OpenData/DID List',
    component: ListOpenDataDIDs,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            story: {
                inline: false,
                iframeHeight: '650px',
            },
        },
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: '/opendata/dids',
                query: {},
            },
        },
    },
    decorators: [
        (Story, context) => (
            <StoryQueryProvider key={context.id}>
                <div className="p-6">
                    <Story />
                </div>
            </StoryQueryProvider>
        ),
    ],
} satisfies Meta<typeof ListOpenDataDIDs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HappyPath: Story = {
    parameters: {
        msw: {
            handlers: [listHandler(sampleDIDs), didMetadataHandler],
        },
    },
};

export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [listHandler([])],
        },
    },
};

export const ErrorState: Story = {
    name: 'Error',
    parameters: {
        msw: {
            handlers: [
                http.get('/api/feature/list-opendata-dids', () =>
                    HttpResponse.json(
                        {
                            status: 'error',
                            errorType: 'CONFIGURATION_ERROR',
                            message: 'Internal storage configuration details',
                        },
                        { status: 503 },
                    ),
                ),
            ],
        },
    },
};

export const Unsupported: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('/api/feature/list-opendata-dids', () =>
                    HttpResponse.json(
                        {
                            status: 'error',
                            errorType: 'FEATURE_UNSUPPORTED',
                        },
                        { status: 501 },
                    ),
                ),
            ],
        },
    },
};

export const FilteredPage: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/opendata/dids',
                query: { state: 'public', limit: '2', offset: '2' },
            },
        },
        msw: {
            handlers: [
                listHandler(
                    [
                        { scope: 'demo', name: 'example-3.root', state: 'PUBLIC' },
                        { scope: 'demo', name: 'example-4.root', state: 'PUBLIC' },
                    ],
                    5,
                    2,
                ),
                didMetadataHandler,
            ],
        },
    },
};

export const ExactDID: Story = {
    parameters: {
        nextjs: {
            navigation: {
                pathname: '/opendata/dids',
                query: { scope: 'demo', name: 'example.root' },
            },
        },
        msw: {
            handlers: [
                http.get('/api/feature/get-opendata-did', () =>
                    HttpResponse.json({
                        status: 'success',
                        scope: 'demo',
                        name: 'example.root',
                        state: 'PUBLIC',
                    }),
                ),
                didMetadataHandler,
            ],
        },
    },
};
