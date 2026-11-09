import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DetailsDIDOpenData } from '@/component-library/pages/DID/details/views/DetailsDIDOpenData';
import type { OpenDataDIDViewModel } from '@/lib/infrastructure/data/view-model/opendata';

jest.mock('@/component-library/features/json', () => ({
    JSONViewer: ({ value }: { value: string }) => <pre data-testid="metadata-json">{value}</pre>,
}));

jest.mock('@/component-library/features/table/RegularTable/RegularTable', () => ({
    RegularTable: ({
        rowData,
        columnDefs,
    }: {
        rowData: Array<{ scope: string; name: string }>;
        columnDefs: Array<{
            headerName?: string;
            cellRenderer?: (params: { data: { scope: string; name: string } }) => ReactNode;
        }>;
    }) => {
        const downloadColumn = columnDefs.find(column => column.headerName === 'Download');

        return (
            <div data-testid="files-table">
                {rowData.map(file => (
                    <div key={`${file.scope}:${file.name}`}>
                        <span>{file.name}</span>
                        {downloadColumn?.cellRenderer?.({ data: file })}
                    </div>
                ))}
            </div>
        );
    },
}));

const metadata: OpenDataDIDViewModel = {
    status: 'success',
    scope: 'demo',
    name: 'file.root',
    state: 'PUBLIC',
    doi: '10.1234/example',
    record_id: 42,
    files_summary: {
        length: 1,
        bytes: 1024,
    },
    files: [
        {
            scope: 'demo',
            name: 'file.root',
            bytes: 1024,
            adler32: 'abcdef12',
            download_urls: [],
        },
    ],
    meta: {
        community_field: {
            custom_value: 'example',
        },
    },
};

function renderTab(isActive = true) {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={client}>
            <DetailsDIDOpenData scope="demo" name="file.root" isActive={isActive} />
        </QueryClientProvider>,
    );
}

describe('DetailsDIDOpenData', () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    it('loads metadata and download URLs from separate endpoints', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(metadata));

        fetchMock.mockResponseOnce(
            JSON.stringify({
                ...metadata,
                files: [
                    {
                        ...metadata.files[0],
                        download_urls: ['https://storage.example.org/file.root'],
                    },
                ],
            }),
        );

        renderTab();

        expect(await screen.findByText('OpenData metadata')).toBeInTheDocument();

        const button = await screen.findByRole('button', {
            name: 'Download file.root',
        });

        await waitFor(() => expect(button).toBeEnabled());

        expect(fetchMock).toHaveBeenCalledTimes(2);

        const metadataUrl = String(fetchMock.mock.calls[0][0]);
        const downloadUrl = String(fetchMock.mock.calls[1][0]);

        expect(metadataUrl).toContain('/api/feature/get-opendata-did?');
        expect(downloadUrl).toContain('/api/feature/get-opendata-download-urls?');

        expect(metadataUrl).toContain('scope=demo');
        expect(metadataUrl).toContain('name=file.root');

        expect(screen.getByTestId('files-table')).toHaveTextContent('file.root');

        expect(screen.getByTestId('metadata-json')).toHaveTextContent('"community_field"');

        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

        try {
            fireEvent.click(button);

            expect(openSpy).toHaveBeenCalledWith('https://storage.example.org/file.root', '_blank', 'noopener,noreferrer');
        } finally {
            openSpy.mockRestore();
        }
    });

    it('supports arbitrary metadata and null DOI/record ID', async () => {
        const noIdentifiers = {
            ...metadata,
            doi: null,
            record_id: null,
        };

        fetchMock.mockResponseOnce(JSON.stringify(noIdentifiers));
        fetchMock.mockResponseOnce(JSON.stringify(noIdentifiers));

        renderTab();

        expect(await screen.findByTestId('metadata-json')).toHaveTextContent('"custom_value"');

        expect(screen.queryByText('DOI')).not.toBeInTheDocument();
        expect(screen.queryByText('Record ID')).not.toBeInTheDocument();

        const button = await screen.findByRole('button', {
            name: 'Download file.root',
        });

        expect(button).toBeDisabled();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('preserves metadata when download URLs are unavailable', async () => {
        fetchMock.mockResponseOnce(JSON.stringify(metadata));

        fetchMock.mockResponseOnce(
            JSON.stringify({
                status: 'error',
                errorType: 'DOWNLOAD_UNAVAILABLE',
                message: 'Private storage URL https://internal.example/token',
            }),
            { status: 503 },
        );

        renderTab();

        expect(await screen.findByText('OpenData metadata')).toBeInTheDocument();

        expect(await screen.findByText(/Download URLs are currently unavailable/i)).toBeInTheDocument();

        expect(screen.getByTestId('files-table')).toHaveTextContent('file.root');

        expect(screen.getByTestId('metadata-json')).toHaveTextContent('"community_field"');

        expect(
            screen.getByRole('button', {
                name: 'Download file.root',
            }),
        ).toBeDisabled();

        expect(screen.queryByText(/internal.example/)).not.toBeInTheDocument();
    });

    it('displays a readable message when OpenData is unsupported', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify({
                status: 'error',
                errorType: 'FEATURE_UNSUPPORTED',
                message: 'Internal server details',
            }),
            { status: 404 },
        );

        renderTab();

        expect(await screen.findByText(/OpenData is not supported by this Rucio deployment/i)).toBeInTheDocument();

        expect(screen.queryByText('Internal server details')).not.toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not expose an HTML error response', async () => {
        fetchMock.mockResponseOnce('<html>Private internal server URL</html>', {
            status: 404,
            headers: { 'content-type': 'text/html' },
        });

        renderTab();

        expect(await screen.findByText(/Unable to retrieve OpenData metadata/i)).toBeInTheDocument();

        expect(screen.queryByText(/Private internal server URL/)).not.toBeInTheDocument();
    });

    it('does not fetch anything when inactive', () => {
        renderTab(false);

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
