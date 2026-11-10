import type { RefObject } from 'react';
import { render } from '@testing-library/react';
import type { AgGridReact } from 'ag-grid-react';

import { RegularTable } from '@/component-library/features/table/RegularTable/RegularTable';

jest.mock('next-themes', () => ({
    useTheme: () => ({ resolvedTheme: 'light' }),
}));

jest.mock('ag-grid-react', () => ({
    AgGridReact: () => <div data-testid="ag-grid" />,
}));

describe('RegularTable pagination panel', () => {
    const tableRef = {
        current: null,
    } as RefObject<AgGridReact | null>;

    it('shows pagination by default', () => {
        const { container } = render(<RegularTable tableRef={tableRef} />);

        expect(container).toHaveTextContent('Page 0 of 0');
    });

    it('hides pagination when explicitly disabled', () => {
        const { container } = render(<RegularTable tableRef={tableRef} showPaginationPanel={false} />);

        expect(container).not.toHaveTextContent('Page 0 of 0');
    });
});
