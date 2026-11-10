import { useState, type PropsWithChildren } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { DetailsDIDOpenData } from './DetailsDIDOpenData';
import type { OpenDataDIDViewModel } from '@/lib/infrastructure/data/view-model/opendata';

const sampleFile = {
    scope: 'demo',
    name: 'example.root',
    bytes: 1024,
    adler32: 'abcdef12',
    download_urls: [],
};

const sampleMetadata: OpenDataDIDViewModel = {
    status: 'success',
    scope: 'demo',
    name: 'example.root',
    state: 'PUBLIC',
    doi: ['10.1234/example1', '10.1234/example2'],
    record_id: [28001, 28002],
    files: [sampleFile],
    files_summary: {
        length: 1,
        bytes: 1024,
    },
    meta: {
        community: 'Example community',
        description: 'Schema-independent metadata',
    },
};

const emptyMetadata: OpenDataDIDViewModel = {
    ...sampleMetadata,
    doi: null,
    record_id: null,
    files: [],
    files_summary: {
        length: 0,
        bytes: 0,
    },
    meta: {},
};

const metadataHandler = (data: OpenDataDIDViewModel) => http.get('/api/feature/get-opendata-did', () => HttpResponse.json(data));

const downloadHandler = (data: OpenDataDIDViewModel) => http.get('/api/feature/get-opendata-download-urls', () => HttpResponse.json(data));

function StoryQueryProvider({ children }: PropsWithChildren) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: false,
                        refetchOnWindowFocus: false,
                        gcTime: 0,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const meta = {
    title: 'Features/OpenData/DID Details',
    component: DetailsDIDOpenData,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            story: {
                inline: false,
                iframeHeight: '550px',
            },
        },
    },
    args: {
        scope: 'demo',
        name: 'example.root',
        isActive: true,
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
} satisfies Meta<typeof DetailsDIDOpenData>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HappyPath: Story = {
    parameters: {
        msw: {
            handlers: [
                metadataHandler(sampleMetadata),
                downloadHandler({
                    ...sampleMetadata,
                    files: [
                        {
                            ...sampleFile,
                            download_urls: ['https://storage.example.org/example.root'],
                        },
                    ],
                }),
            ],
        },
    },
};

export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [metadataHandler(emptyMetadata)],
        },
    },
};

export const Error: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get('/api/feature/get-opendata-did', () =>
                    HttpResponse.json(
                        {
                            status: 'error',
                            errorType: 'CONFIGURATION_ERROR',
                        },
                        { status: 503 },
                    ),
                ),
            ],
        },
    },
};

export const DownloadUnavailable: Story = {
    parameters: {
        msw: {
            handlers: [
                metadataHandler(sampleMetadata),
                http.get('/api/feature/get-opendata-download-urls', () =>
                    HttpResponse.json(
                        {
                            status: 'error',
                            errorType: 'DOWNLOAD_UNAVAILABLE',
                        },
                        { status: 503 },
                    ),
                ),
            ],
        },
    },
};
