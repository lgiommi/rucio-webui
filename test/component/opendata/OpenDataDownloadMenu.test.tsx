import { render, screen } from '@testing-library/react';

import { OpenDataDownloadMenu } from '@/component-library/pages/DID/details/views/OpenDataDownloadMenu';

describe('OpenDataDownloadMenu', () => {
    it('shows only HTTP and HTTPS endpoints and sorts HTTPS first', () => {
        const { container } = render(
            <OpenDataDownloadMenu
                urls={[
                    'dav://eospilot.cern.ch:8444/path/file.root',
                    'http://eospublic.cern.ch:8444/path/file.root',
                    'davs://eosatlas.cern.ch:8444/path/file.root',
                    'https://eospilot.cern.ch:8444/path/file.root',
                    'https://eosatlas.cern.ch:8444/path/file.root',
                ]}
            />,
        );

        const links = Array.from(container.querySelectorAll('a'));

        expect(links).toHaveLength(3);

        expect(links[0].textContent).toContain('Download — https://eospilot.cern.ch');
        expect(links[1].textContent).toContain('Download — https://eosatlas.cern.ch');
        expect(links[2].textContent).toContain('Download — http://eospublic.cern.ch');

        expect(container.textContent).not.toContain('dav://');
        expect(container.textContent).not.toContain('davs://');
    });

    it('keeps the port in the href but hides it from the label', () => {
        const { container } = render(
            <OpenDataDownloadMenu urls={['https://eospilot.cern.ch:8444/path/file.root', 'https://eosatlas.cern.ch:8444/path/file.root']} />,
        );

        const links = Array.from(container.querySelectorAll('a'));

        expect(links[0].textContent).toContain('Download — https://eospilot.cern.ch');
        expect(links[0].textContent).not.toContain(':8444');

        expect(links[0].getAttribute('href')).toBe('https://eospilot.cern.ch:8444/path/file.root');
    });

    it('shows ports when the same endpoint uses different ports', () => {
        const { container } = render(
            <OpenDataDownloadMenu urls={['https://eospilot.cern.ch:8444/path/file.root', 'https://eospilot.cern.ch:9443/path/file.root']} />,
        );

        const links = Array.from(container.querySelectorAll('a'));

        expect(links).toHaveLength(2);

        expect(links[0].textContent).toContain('Download — https://eospilot.cern.ch:8444');
        expect(links[1].textContent).toContain('Download — https://eospilot.cern.ch:9443');
    });

    it('shows Unavailable when only DAV endpoints are available', () => {
        render(<OpenDataDownloadMenu urls={['dav://eospilot.cern.ch:8444/path/file.root', 'davs://eospilot.cern.ch:8444/path/file.root']} />);

        expect(screen.getByText('Unavailable')).toBeTruthy();
    });

    it('shows Unavailable when no URLs are available', () => {
        render(<OpenDataDownloadMenu urls={[]} />);

        expect(screen.getByText('Unavailable')).toBeTruthy();
    });
});
