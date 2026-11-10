import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ListOpenDataDIDs } from '@/component-library/pages/DID/list/ListOpenDataDIDs';

let mockQueryString = '';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/opendata/dids',
    useSearchParams: () => new URLSearchParams(mockQueryString),
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

// Render the table rows without depending on AG Grid internals.
jest.mock('@/component-library/features/table/RegularTable/RegularTable', () => ({
    RegularTable: ({
        rowData,
        columnDefs,
        showPaginationPanel,
    }: {
        rowData: Array<{ scope: string; name: string }>;
        columnDefs: Array<{
            headerName?: string;
            filter?: boolean;
            cellRenderer?: (params: { data: { scope: string; name: string } }) => ReactNode;
        }>;
        showPaginationPanel?: boolean;
    }) => {
        const identifierColumn = columnDefs.find(column => column.headerName === 'Identifier');
        const stateColumn = columnDefs.find(column => column.headerName === 'State');

        return (
            <div
                data-testid="opendata-table"
                data-show-pagination={String(showPaginationPanel)}
                data-identifier-filter={String(identifierColumn?.filter)}
                data-state-filter={String(stateColumn?.filter)}
            >
                {rowData.map(row => (
                    <div key={`${row.scope}:${row.name}`}>{identifierColumn?.cellRenderer?.({ data: row }) ?? `${row.scope}:${row.name}`}</div>
                ))}
            </div>
        );
    },
}));

jest.mock('@/component-library/pages/DID/list/meta/ListDIDMeta', () => ({
    ListDIDMeta: () => <div data-testid="metadata-panel" />,
}));

// Use a native select in component tests.
jest.mock('@/component-library/atoms/form/select', () => ({
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
        <select aria-label="State" value={value} onChange={event => onValueChange(event.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

jest.mock('@/component-library/features/search/SearchButton', () => ({
    SearchButton: ({
        isRunning,
        onSearch,
        onStop,
    }: {
        isRunning: boolean;
        onSearch: (event: React.MouseEvent<HTMLButtonElement>) => void;
        onStop: (event: React.MouseEvent<HTMLButtonElement>) => void;
    }) => (
        <button type="button" onClick={isRunning ? onStop : onSearch}>
            {isRunning ? 'Stop' : 'Search'}
        </button>
    ),
}));

function listResponse(offset = 0, limit = 50) {
    return {
        status: 'success',
        total: 5,
        offset,
        dids: Array.from({ length: Math.min(limit, Math.max(0, 5 - offset)) }, (_, index) => ({
            scope: 'demo',
            name: `file-${offset + index}.root`,
            state: 'PUBLIC',
        })),
    };
}

function mockSuccessfulRequests() {
    fetchMock.mockResponse(async request => {
        const url = new URL(request.url, 'http://localhost');

        if (url.pathname.endsWith('/get-opendata-did')) {
            return JSON.stringify({
                status: 'success',
                scope: url.searchParams.get('scope'),
                name: url.searchParams.get('name'),
                state: 'PUBLIC',
            });
        }

        const limit = Number(url.searchParams.get('limit') ?? 50);
        const offset = Number(url.searchParams.get('offset') ?? 0);

        return JSON.stringify(listResponse(offset, limit));
    });
}

function renderList() {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

    const renderComponent = () => (
        <QueryClientProvider client={client}>
            <ListOpenDataDIDs />
        </QueryClientProvider>
    );

    const view = render(renderComponent());

    return {
        ...view,
        navigate(query: string) {
            mockQueryString = query;
            view.rerender(renderComponent());
        },
    };
}

describe('ListOpenDataDIDs', () => {
    beforeEach(() => {
        fetchMock.resetMocks();
        mockPush.mockReset();
        mockQueryString = '';
        mockSuccessfulRequests();
    });

    it('loads the initial page and renders DID links', async () => {
        renderList();

        const link = await screen.findByRole('link', {
            name: 'demo:file-0.root',
        });

        expect(link).toHaveAttribute('href', '/did/demo/file-0.root');

        const table = screen.getByTestId('opendata-table');

        expect(table).toHaveAttribute('data-show-pagination', 'false');
        expect(table).toHaveAttribute('data-identifier-filter', 'false');
        expect(table).toHaveAttribute('data-state-filter', 'false');

        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/feature/list-opendata-dids?limit=50&offset=0',
            expect.objectContaining({
                signal: expect.anything(),
            }),
        );
    });

    it('reads filters and pagination from the URL', async () => {
        mockQueryString = 'state=public&limit=2&offset=2';

        renderList();

        expect(
            await screen.findByRole('link', {
                name: 'demo:file-2.root',
            }),
        ).toBeInTheDocument();

        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=2&offset=2&state=public'), expect.anything());
    });

    it('applies state and limit filters to the URL', async () => {
        renderList();

        await screen.findByRole('button', { name: 'Search' });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Toggle filters',
            }),
        );

        fireEvent.change(screen.getByRole('combobox', { name: 'State' }), { target: { value: 'public' } });

        fireEvent.change(screen.getByRole('spinbutton', { name: 'Limit' }), { target: { value: '2' } });

        // Editing draft filters must not navigate yet.
        expect(mockPush).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(mockPush).toHaveBeenCalledWith('/opendata/dids?state=public&limit=2', { scroll: false });
    });

    it('changes page through the URL and restores previous pages', async () => {
        mockQueryString = 'limit=2';

        const view = renderList();

        expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

        expect(mockPush).toHaveBeenCalledWith('/opendata/dids?offset=2&limit=2', { scroll: false });

        view.navigate('offset=2&limit=2');

        expect(
            await screen.findByRole('link', {
                name: 'demo:file-2.root',
            }),
        ).toBeInTheDocument();

        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

        expect(mockPush).toHaveBeenCalledWith('/opendata/dids?limit=2', { scroll: false });

        // Simulate browser Back/Forward navigation.
        view.navigate('limit=2');

        expect(
            await screen.findByRole('link', {
                name: 'demo:file-0.root',
            }),
        ).toBeInTheDocument();

        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('uses the lightweight endpoint for an exact DID search', async () => {
        mockQueryString = 'scope=demo&name=file-0.root';

        renderList();

        expect(
            await screen.findByRole('link', {
                name: 'demo:file-0.root',
            }),
        ).toBeInTheDocument();

        expect(fetchMock).toHaveBeenCalledWith('/api/feature/get-opendata-did?scope=demo&name=file-0.root&files=0&meta=0', expect.anything());

        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    it('rejects incomplete scope/name searches', async () => {
        renderList();

        await screen.findByRole('button', { name: 'Search' });

        fireEvent.change(screen.getByRole('textbox', { name: 'Scope' }), { target: { value: 'demo' } });

        fireEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(screen.getByRole('alert')).toHaveTextContent('Scope and name must be provided together.');

        expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not expose internal API error details', async () => {
        fetchMock.resetMocks();

        fetchMock.mockResponseOnce(
            JSON.stringify({
                status: 'error',
                errorType: 'CONFIGURATION_ERROR',
                message: 'Internal storage configuration details',
            }),
            { status: 503 },
        );

        renderList();

        expect(await screen.findByRole('alert')).toHaveTextContent('OpenData is not configured correctly');

        expect(screen.queryByText(/Internal storage configuration details/)).not.toBeInTheDocument();
    });

    it('shows an informational state when OpenData is unsupported', async () => {
        fetchMock.resetMocks();

        fetchMock.mockResponseOnce(
            JSON.stringify({
                status: 'error',
                errorType: 'FEATURE_UNSUPPORTED',
                message: 'Internal server details',
            }),
            { status: 501 },
        );

        renderList();

        expect(await screen.findByRole('status')).toHaveTextContent('OpenData is not supported by this Rucio deployment.');

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByText('Internal server details')).not.toBeInTheDocument();
        expect(screen.queryByTestId('opendata-table')).not.toBeInTheDocument();
        expect(screen.queryByText('Page 0 of 0')).not.toBeInTheDocument();
        expect(screen.queryByTestId('metadata-panel')).not.toBeInTheDocument();
    });

    it('does not replace newer results with an older response', async () => {
        fetchMock.resetMocks();

        let resolveFirst!: (response: Response) => void;

        fetchMock.mockImplementationOnce(
            () =>
                new Promise<Response>(resolve => {
                    resolveFirst = resolve;
                }),
        );

        fetchMock.mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify(listResponse(2, 2)))));

        mockQueryString = 'limit=2';
        const view = renderList();

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        const initialSignal = fetchMock.mock.calls[0][1]?.signal;

        view.navigate('offset=2&limit=2');

        expect(
            await screen.findByRole('link', {
                name: 'demo:file-2.root',
            }),
        ).toBeInTheDocument();

        expect(initialSignal?.aborted).toBe(true);

        await act(async () => {
            resolveFirst(new Response(JSON.stringify(listResponse(0, 2))));
        });

        expect(
            screen.queryByRole('link', {
                name: 'demo:file-0.root',
            }),
        ).not.toBeInTheDocument();

        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });
});
