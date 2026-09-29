type OpenDataDownloadMenuProps = {
    urls: string[];
};

type DownloadLink = {
    url: string;
    protocol: string;
    hostname?: string;
    port?: string;
};

const parseDownloadLink = (url: string): DownloadLink => {
    try {
        const parsed = new URL(url);

        return {
            url,
            protocol: parsed.protocol.replace(/:$/, '').toUpperCase(),
            hostname: parsed.hostname || undefined,
            port: parsed.port || undefined,
        };
    } catch {
        const separatorIndex = url.indexOf('://');

        return {
            url,
            protocol: separatorIndex > 0 ? url.slice(0, separatorIndex).toUpperCase() : 'DOWNLOAD',
        };
    }
};

export const OpenDataDownloadMenu = ({ urls }: OpenDataDownloadMenuProps) => {
    const links = urls
        .map(parseDownloadLink)
        .filter(link => link.protocol === 'HTTP' || link.protocol === 'HTTPS')
        .sort((a, b) => {
            if (a.protocol === b.protocol) {
                return 0;
            }

            return a.protocol === 'HTTPS' ? -1 : 1;
        });

    if (links.length === 0) {
        return <span className="text-sm text-neutral-500 dark:text-neutral-400">Unavailable</span>;
    }

    const shouldShowPort = (link: DownloadLink): boolean => {
        if (!link.hostname || !link.port) {
            return false;
        }

        return links.some(
            other => other !== link && other.protocol === link.protocol && other.hostname === link.hostname && other.port !== link.port,
        );
    };

    return (
        <details className="relative inline-block">
            <summary className="cursor-pointer list-none rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 [&::-webkit-details-marker]:hidden">
                Download <span aria-hidden="true">▾</span>
            </summary>

            <div className="absolute right-0 z-20 mt-1 min-w-48 overflow-hidden rounded-md border border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {links.map((link, index) => (
                    <a
                        key={`${link.url}-${index}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block whitespace-nowrap px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        Download — {link.protocol.toLowerCase()}://
                        {link.hostname}
                        {shouldShowPort(link) ? `:${link.port}` : ''}
                    </a>
                ))}
            </div>
        </details>
    );
};
