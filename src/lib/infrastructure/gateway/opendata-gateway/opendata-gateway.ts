import { ListOpenDataDIDsDTO, OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import OpenDataGatewayOutputPort from '@/lib/core/port/secondary/opendata-gateway-output-port';
import GetOpenDataDIDEndpoint from '@/lib/infrastructure/gateway/opendata-gateway/endpoints/get-opendata-did-endpoint';
import ListOpenDataDIDsEndpoint from '@/lib/infrastructure/gateway/opendata-gateway/endpoints/list-opendata-dids-endpoint';
import { injectable } from 'inversify';
import type { OpenDataDIDQueryOptions } from '@/lib/core/port/secondary/opendata-gateway-output-port';
import type { OpenDataDIDStateFilter } from '@/lib/core/entity/opendata';

@injectable()
export default class RucioOpenDataGateway implements OpenDataGatewayOutputPort {
    private classifyOpenDataError<T extends OpenDataDIDDTO | ListOpenDataDIDsDTO>(dto: T): T {
        if (dto.status !== 'error') {
            return dto;
        }

        let errorType = 'opendata_error';

        switch (dto.errorClass) {
            case 'OpenDataDataIdentifierNotFound':
                errorType = 'opendata_not_found';
                break;

            case 'ReplicaNotFound':
            case 'ResourceTemporaryUnavailable':
                errorType = 'opendata_download_unavailable';
                break;

            case 'NoSectionError':
                errorType = 'opendata_configuration_error';
                break;

            default:
                if (dto.errorCode === 404 && !dto.errorClass) {
                    errorType = 'opendata_unsupported';
                }
                break;
        }

        return {
            ...dto,
            errorType,
        };
    }

    async getOpenDataDID(rucioAuthToken: string, scope: string, name: string, options: OpenDataDIDQueryOptions = {}): Promise<OpenDataDIDDTO> {
        try {
            const endpoint = new GetOpenDataDIDEndpoint(rucioAuthToken, scope, name, options);

            const dto: OpenDataDIDDTO = await endpoint.fetch();

            return this.classifyOpenDataError(dto);
        } catch (error) {
            const errorDTO: OpenDataDIDDTO = {
                status: 'error',
                scope,
                name,
                files: [],
                meta: {},
                errorName: 'Unknown Error',
                errorType: 'opendata_error',
                errorCode: 500,
                errorMessage: error?.toString(),
            };

            return Promise.resolve(errorDTO);
        }
    }

    async listOpenDataDIDs(rucioAuthToken: string, limit?: number, offset?: number, state?: OpenDataDIDStateFilter): Promise<ListOpenDataDIDsDTO> {
        try {
            const endpoint = new ListOpenDataDIDsEndpoint(rucioAuthToken, limit, offset, state);

            const dto = await endpoint.fetch();

            return this.classifyOpenDataError(dto);
        } catch (error) {
            return {
                status: 'error',
                total: 0,
                offset: offset ?? 0,
                dids: [],
                errorName: 'Unknown Error',
                errorType: 'opendata_error',
                errorCode: 500,
                errorMessage: error?.toString(),
            };
        }
    }
}
