import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DetailsDIDOpenData } from '@/component-library/pages/DID/details/views/DetailsDIDOpenData';

// Keep these tests focused on identifier rendering.
jest.mock('@/component-library/features/json', () => ({
    JSONViewer: () => null,
}));

jest.mock('@/component-library/features/fields/CopyableField', () => ({
    CopyableField: ({ text }: { text: string }) => <span>{text}</span>,
}));

type Identifiers = {
    doi: string | string[] | null;
    record_id: number | string | Array<number | string> | null;
};

const originalFetch = global.fetch;

function renderOpenDataDID(identifiers: Identifiers) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            status: 'success',
            scope: 'lugiommi',
            name: 'sgn.root',
            state: 'PUBLIC',
            files: [],
            meta: {},
            ...identifiers,
        }),
    });

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <DetailsDIDOpenData scope="lugiommi" name="sgn.root" isActive={true} />
        </QueryClientProvider>,
    );
}

afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
});

describe('DetailsDIDOpenData identifiers', () => {
    it('renders a single DOI and Record ID', async () => {
        renderOpenDataDID({
            doi: '10.1234/example',
            record_id: 28001,
        });

        expect(await screen.findByText('10.1234/example')).toBeInTheDocument();

        expect(screen.getByText('28001')).toBeInTheDocument();
        expect(screen.getByText('DOI')).toBeInTheDocument();
        expect(screen.getByText('Record ID')).toBeInTheDocument();
    });

    it('renders multiple DOIs and Record IDs separately', async () => {
        renderOpenDataDID({
            doi: ['10.1234/example1', '10.1234/example2'],
            record_id: [28001, 28002],
        });

        expect(await screen.findByText('10.1234/example1')).toBeInTheDocument();

        expect(screen.getByText('10.1234/example2')).toBeInTheDocument();

        expect(screen.getByText('28001')).toBeInTheDocument();
        expect(screen.getByText('28002')).toBeInTheDocument();

        // Each identifier must be rendered individually.
        expect(screen.queryByText('10.1234/example1,10.1234/example2')).not.toBeInTheDocument();

        expect(screen.queryByText('28001,28002')).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: '10.1234/example1' })).toHaveAttribute('href', 'https://doi.org/10.1234/example1');
    });

    it('hides empty identifiers', async () => {
        renderOpenDataDID({
            doi: null,
            record_id: [],
        });

        expect(await screen.findByText('OpenData metadata')).toBeInTheDocument();

        expect(screen.queryByText('DOI')).not.toBeInTheDocument();
        expect(screen.queryByText('Record ID')).not.toBeInTheDocument();
    });
});
