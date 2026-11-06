import type { BaseDTO } from '@/lib/sdk/dto';
import type { OpenDataErrorType } from '@/lib/core/entity/opendata';

export function mapOpenDataErrorType(dto: BaseDTO): OpenDataErrorType {
    switch (dto.errorType) {
        case 'opendata_not_found':
            return 'NOT_FOUND';

        case 'opendata_unsupported':
            return 'FEATURE_UNSUPPORTED';

        case 'opendata_download_unavailable':
            return 'DOWNLOAD_UNAVAILABLE';

        case 'opendata_configuration_error':
            return 'CONFIGURATION_ERROR';
    }

    switch (dto.errorCode) {
        case 400:
            return 'INVALID_REQUEST';

        case 401:
        case 403:
            return 'INVALID_AUTH';

        default:
            return 'UNKNOWN_ERROR';
    }
}
