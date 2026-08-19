import { BaseSingleEndpointUseCase } from '@/lib/sdk/usecase';
import { AuthenticatedRequestModel } from '@/lib/sdk/usecase-models';
import { injectable } from 'inversify';

import { OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import {
    OpenDataDIDInputPort,
    type OpenDataDIDOutputPort,
} from '@/lib/core/port/primary/opendata-did-ports';
import type OpenDataGatewayOutputPort from '@/lib/core/port/secondary/opendata-gateway-output-port';
import {
    OpenDataDIDError,
    OpenDataDIDRequest,
    OpenDataDIDResponse,
} from '@/lib/core/usecase-models/opendata-did-usecase-models';

@injectable()
class OpenDataDIDUseCase
    extends BaseSingleEndpointUseCase<
        AuthenticatedRequestModel<OpenDataDIDRequest>,
        OpenDataDIDResponse,
        OpenDataDIDError,
        OpenDataDIDDTO
    >
    implements OpenDataDIDInputPort
{
    constructor(
        protected readonly presenter: OpenDataDIDOutputPort,
        private readonly gateway: OpenDataGatewayOutputPort,
    ) {
        super(presenter);
    }

    validateRequestModel(
        requestModel: AuthenticatedRequestModel<OpenDataDIDRequest>,
    ): OpenDataDIDError | undefined {
        if (!requestModel.scope) {
            return {
                error: 'INVALID_REQUEST',
                message: 'Scope is required',
            } as OpenDataDIDError;
        }

        if (!requestModel.did) {
            return {
                error: 'INVALID_REQUEST',
                message: 'DID is required',
            } as OpenDataDIDError;
        }

        if (!requestModel.rucioAuthToken) {
            return {
                error: 'INVALID_AUTH',
                message: 'Auth token is required',
            } as OpenDataDIDError;
        }

        return undefined;
    }

    async makeGatewayRequest(
        requestModel: AuthenticatedRequestModel<OpenDataDIDRequest>,
    ): Promise<OpenDataDIDDTO> {
        return this.gateway.getOpenDataDID(
            requestModel.rucioAuthToken,
            requestModel.scope,
            requestModel.did,
        );
    }

    handleGatewayError(error: OpenDataDIDDTO): OpenDataDIDError {
        return {
            status: 'error',
            error: error.errorMessage,
        } as OpenDataDIDError;
    }

    processDTO(
        dto: OpenDataDIDDTO,
    ): {
        data: OpenDataDIDResponse | OpenDataDIDError;
        status: 'success' | 'error';
    } {
        return {
            data: {
                status: 'success',
                scope: dto.scope,
                name: dto.name,
                state: dto.state,
                doi: dto.doi,
                record_id: dto.record_id,
                meta: dto.meta,
            },
            status: 'success',
        };
    }
}

export default OpenDataDIDUseCase;