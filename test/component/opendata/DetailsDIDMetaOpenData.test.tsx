import { render, screen } from '@testing-library/react';

import { FeatureProvider } from '@/component-library/features/feature-flags/FeatureProvider';
import { DetailsDIDMeta } from '@/component-library/pages/DID/details/DetailsDIDMeta';
import type { FeatureFlagMap } from '@/lib/core/entity/feature-config';
import { DIDAvailability, DIDType } from '@/lib/core/entity/rucio';
import type { DIDMetaViewModel } from '@/lib/infrastructure/data/view-model/did';

jest.mock('@/component-library/features/ami/AMITagsRow', () => ({
    AMITagsRow: () => null,
}));

jest.mock('@/component-library/features/panda/PandaTaskRow', () => ({
    PandaTaskRow: () => null,
}));

const meta = {
    status: 'success',
    scope: 'demo',
    name: 'file.root',
    did_type: DIDType.FILE,
    account: 'root',
    availability: DIDAvailability.AVAILABLE,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    is_open: false,
    monotonic: false,
    obsolete: false,
    hidden: false,
    suppressed: false,
    purge_replicas: false,
    is_opendata: true,
} as DIDMetaViewModel;

function renderMetadata(openDataEnabled: boolean) {
    return render(
        <FeatureProvider features={{ opendata: openDataEnabled } as FeatureFlagMap}>
            <DetailsDIDMeta meta={meta} />
        </FeatureProvider>,
    );
}

describe('DetailsDIDMeta OpenData feature flag', () => {
    it('hides the OpenData row when the feature is disabled', () => {
        renderMetadata(false);

        expect(screen.queryByText('OpenData')).not.toBeInTheDocument();
        expect(screen.getByText('Account')).toBeInTheDocument();
    });

    it('shows the OpenData row when the feature is enabled', () => {
        renderMetadata(true);

        expect(screen.getByText('OpenData')).toBeInTheDocument();
    });
});
