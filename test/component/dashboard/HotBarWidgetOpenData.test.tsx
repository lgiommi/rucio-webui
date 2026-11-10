import { render, screen } from '@testing-library/react';

import { FeatureProvider } from '@/component-library/features/feature-flags/FeatureProvider';
import { HotBarWidget } from '@/component-library/pages/Dashboard/widgets/HotBarWidget';
import { formatCardType, getTypeBadgeStyles } from '@/component-library/pages/Dashboard/widgets/HotBarCardUtils';

import type { FeatureFlagMap } from '@/lib/core/entity/feature-config';
import { HotBarCardType } from '@/lib/core/entity/hotbar';

jest.mock('@/lib/infrastructure/hooks/useToast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/component-library/pages/Dashboard/widgets/HotBarCard', () => ({
    HotBarCard: ({ card }: { card: { title: string } }) => <div>{card.title}</div>,
}));

jest.mock('@/component-library/pages/Dashboard/widgets/AddEditCardDialog', () => ({
    AddEditCardDialog: () => null,
}));

const cards = [
    {
        id: '1',
        title: 'Standard DID',
        url: '/did/demo/file.root',
        type: HotBarCardType.DID,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: '2',
        title: 'OpenData DIDs',
        url: '/opendata/dids?state=public',
        type: HotBarCardType.OPENDATA_DID_LIST,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

function renderHotBar(openDataEnabled: boolean) {
    return render(
        <FeatureProvider features={{ opendata: openDataEnabled } as FeatureFlagMap}>
            <HotBarWidget />
        </FeatureProvider>,
    );
}

describe('HotBar OpenData feature gating', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('rucio_hotbar_cards', JSON.stringify(cards));
    });

    it('hides OpenData bookmarks when the feature is disabled', async () => {
        renderHotBar(false);

        expect(await screen.findByText('Standard DID')).toBeInTheDocument();

        expect(screen.queryByText('OpenData DIDs')).not.toBeInTheDocument();

        expect(JSON.parse(localStorage.getItem('rucio_hotbar_cards') ?? '[]')).toHaveLength(2);
    });

    it('shows OpenData bookmarks when the feature is enabled', async () => {
        renderHotBar(true);

        expect(await screen.findByText('Standard DID')).toBeInTheDocument();

        expect(screen.getByText('OpenData DIDs')).toBeInTheDocument();
    });

    it('uses the same label and badge styling for OpenData', () => {
        expect(formatCardType(HotBarCardType.OPENDATA_DID_LIST)).toBe('OpenData DID List');

        expect(getTypeBadgeStyles(HotBarCardType.OPENDATA_DID_LIST)).toContain('bg-base-info-100');
    });
});
