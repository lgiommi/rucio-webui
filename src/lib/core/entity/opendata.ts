export const OPEN_DATA_DID_STATES = ['DRAFT', 'PUBLIC', 'SUSPENDED'] as const;

export type OpenDataDIDState = (typeof OPEN_DATA_DID_STATES)[number];

export type OpenDataDIDStateFilter = Lowercase<OpenDataDIDState>;

export type OpenDataErrorType =
    | 'UNKNOWN_ERROR'
    | 'INVALID_REQUEST'
    | 'INVALID_AUTH'
    | 'NOT_FOUND'
    | 'FEATURE_UNSUPPORTED'
    | 'DOWNLOAD_UNAVAILABLE'
    | 'CONFIGURATION_ERROR';

export function isValidOpenDataDIDStateFilter(value: unknown): value is OpenDataDIDStateFilter {
    return value === 'draft' || value === 'public' || value === 'suspended';
}

export function normalizeOpenDataDIDState(value: unknown): OpenDataDIDState | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const state = value.toUpperCase();

    if (state === 'DRAFT' || state === 'PUBLIC' || state === 'SUSPENDED') {
        return state;
    }

    return undefined;
}

/**
 * Normalize scalar or multiple OpenData identifiers into strings.
 * Supports both the current and future Rucio API response formats.
 */
export function normalizeOpenDataIdentifiers(
    value: string | number | Array<string | number> | null | undefined,
): string[] {
    const values = Array.isArray(value) ? value : value == null ? [] : [value];

    return values.map(item => String(item).trim()).filter(Boolean);
}
