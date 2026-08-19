'use client';

import { useQuery } from '@tanstack/react-query';
import { DetailsDIDView } from '@/component-library/pages/DID/details/views/DetailsDIDView';

export const DetailsDIDOpenData: DetailsDIDView = ({ scope, name }) => {
    const queryOpenData = async () => {
        const url =
            '/api/feature/get-opendata-did?' +
            new URLSearchParams({
                scope,
                name,
            });

        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to load OpenData metadata: ${res.statusText}`);
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
        return <div className="p-4">Loading OpenData metadata...</div>;
    }

    if (error) {
        return (
            <div className="p-4">
                Failed to load OpenData metadata.
            </div>
        );
    }

    const meta = data?.meta;

    return (
        <div className="p-4 overflow-auto">
            <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(meta, null, 2)}
            </pre>
        </div>
    );
};