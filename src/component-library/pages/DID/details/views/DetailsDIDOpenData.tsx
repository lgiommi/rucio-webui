'use client';

import { useQuery } from '@tanstack/react-query';
import { DetailsDIDView } from '@/component-library/pages/DID/details/views/DetailsDIDView';

type OpenDataResponse = {
    status: 'success' | 'error';
    scope: string;
    name: string;
    state?: string;
    doi?: string | null;
    record_id?: number | null;
    meta?: Record<string, unknown>;
    message?: string;
};

export const DetailsDIDOpenData: DetailsDIDView = ({ scope, name }) => {
    const queryOpenData = async (): Promise<OpenDataResponse> => {
        const url =
            '/api/feature/get-opendata-did?' +
            new URLSearchParams({
                scope,
                name,
            });

        const res = await fetch(url);

        if (!res.ok) {
            const body = await res.text();

            throw new Error(
                `Failed to load OpenData metadata: ${res.status} ${res.statusText} - ${body}`,
            );
        }

        return res.json();
    };

    const {
        data,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['opendata', scope, name],
        queryFn: queryOpenData,
        refetchOnWindowFocus: false,
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="p-4">
                Loading OpenData metadata...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                {error instanceof Error
                    ? error.message
                    : 'Failed to load OpenData metadata.'}
            </div>
        );
    }

    const meta = data?.meta ?? {};

    const getString = (key: string): string | undefined => {
        const value = meta[key];

        return typeof value === 'string'
            ? value
            : undefined;
    };

    const getNumber = (key: string): number | undefined => {
        const value = meta[key];

        return typeof value === 'number'
            ? value
            : undefined;
    };

    const title = getString('title');
    const experiment = getString('experiment');
    const collaboration = getString('collaboration');
    const type = getString('type');
    const publisher = getString('publisher');
    const accelerator = getString('accelerator');
    const runPeriod = getString('run_period');
    const abstract = getString('abstract');

    const datePublished =
        getString('date_published') ??
        getString('publication_date');

    const metadataDOI = getString('doi');

    const doi =
        data?.doi ??
        metadataDOI;

    const metadataRecordId =
        getNumber('recid') ??
        getNumber('record_id');

    const recordId =
        data?.record_id ??
        metadataRecordId;

    const collisionInformation = meta.collision_information;
    const usage = meta.usage;
    const methodology = meta.methodology;
    const distribution = meta.distribution;

    const renderComplexValue = (value: unknown) => {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === 'string') {
            return (
                <p className="whitespace-pre-wrap">
                    {value}
                </p>
            );
        }

        return (
            <pre className="whitespace-pre-wrap break-words overflow-auto">
                {JSON.stringify(value, null, 2)}
            </pre>
        );
    };

    return (
        <div className="p-4 overflow-auto space-y-8">
            {/* Main OpenData information */}
            <section>
                <h2 className="text-lg font-semibold mb-4">
                    OpenData metadata
                </h2>

                <div className="space-y-3">
                    <div>
                        <span className="font-semibold">
                            DID:{' '}
                        </span>

                        <span>
                            {scope}:{name}
                        </span>
                    </div>

                    {title && (
                        <div>
                            <span className="font-semibold">
                                Title:{' '}
                            </span>

                            <span>
                                {title}
                            </span>
                        </div>
                    )}

                    {experiment && (
                        <div>
                            <span className="font-semibold">
                                Experiment:{' '}
                            </span>

                            <span>
                                {experiment}
                            </span>
                        </div>
                    )}

                    {collaboration && (
                        <div>
                            <span className="font-semibold">
                                Collaboration:{' '}
                            </span>

                            <span>
                                {collaboration}
                            </span>
                        </div>
                    )}

                    {type && (
                        <div>
                            <span className="font-semibold">
                                Type:{' '}
                            </span>

                            <span>
                                {type}
                            </span>
                        </div>
                    )}

                    {accelerator && (
                        <div>
                            <span className="font-semibold">
                                Accelerator:{' '}
                            </span>

                            <span>
                                {accelerator}
                            </span>
                        </div>
                    )}

                    {runPeriod && (
                        <div>
                            <span className="font-semibold">
                                Run period:{' '}
                            </span>

                            <span>
                                {runPeriod}
                            </span>
                        </div>
                    )}

                    {publisher && (
                        <div>
                            <span className="font-semibold">
                                Publisher:{' '}
                            </span>

                            <span>
                                {publisher}
                            </span>
                        </div>
                    )}

                    {datePublished && (
                        <div>
                            <span className="font-semibold">
                                Published:{' '}
                            </span>

                            <span>
                                {datePublished}
                            </span>
                        </div>
                    )}

                    {data?.state && (
                        <div>
                            <span className="font-semibold">
                                State:{' '}
                            </span>

                            <span>
                                {data.state}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* External identifiers */}
            {(doi || recordId !== undefined) && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        External identifiers
                    </h2>

                    <div className="space-y-3">
                        {doi && (
                            <div>
                                <span className="font-semibold">
                                    DOI:{' '}
                                </span>

                                <a
                                    href={`https://doi.org/${doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    {doi}
                                </a>
                            </div>
                        )}

                        {recordId !== undefined &&
                            recordId !== null && (
                                <div>
                                    <span className="font-semibold">
                                        CERN Open Data record:{' '}
                                    </span>

                                    <a
                                        href={`https://opendata.cern.ch/record/${recordId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        {recordId}
                                    </a>
                                </div>
                            )}
                    </div>
                </section>
            )}

            {/* Abstract */}
            {abstract && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        Abstract
                    </h2>

                    <p className="whitespace-pre-wrap">
                        {abstract}
                    </p>
                </section>
            )}

            {/* Collision information */}
            {collisionInformation !== undefined && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        Collision information
                    </h2>

                    <div className="rounded border p-4">
                        {renderComplexValue(collisionInformation)}
                    </div>
                </section>
            )}

            {/* Usage */}
            {usage !== undefined && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        Usage
                    </h2>

                    <div className="rounded border p-4">
                        {renderComplexValue(usage)}
                    </div>
                </section>
            )}

            {/* Methodology */}
            {methodology !== undefined && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        Methodology
                    </h2>

                    <div className="rounded border p-4">
                        {renderComplexValue(methodology)}
                    </div>
                </section>
            )}

            {/* Distribution */}
            {distribution !== undefined && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">
                        Distribution
                    </h2>

                    <div className="rounded border p-4">
                        {renderComplexValue(distribution)}
                    </div>
                </section>
            )}

            {/* Complete metadata */}
            <section>
                <h2 className="text-lg font-semibold mb-4">
                    Raw JSON
                </h2>

                <pre className="whitespace-pre-wrap break-words overflow-auto rounded border p-4">
                    {JSON.stringify(meta, null, 2)}
                </pre>
            </section>
        </div>
    );
};