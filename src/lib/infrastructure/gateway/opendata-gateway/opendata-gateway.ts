import { OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';
import OpenDataGatewayOutputPort from '@/lib/core/port/secondary/opendata-gateway-output-port';
import GetOpenDataDIDEndpoint from '@/lib/infrastructure/gateway/opendata-gateway/endpoints/get-opendata-did-endpoint';
import { injectable } from 'inversify';

@injectable()
export default class RucioOpenDataGateway implements OpenDataGatewayOutputPort {
    async getOpenDataDID(
        rucioAuthToken: string,
        scope: string,
        name: string,
    ): Promise<OpenDataDIDDTO> {
        try {
            const endpoint = new GetOpenDataDIDEndpoint(
                rucioAuthToken,
                scope,
                name,
            );

            const dto: OpenDataDIDDTO = await endpoint.fetch();

            return Promise.resolve(dto);
        } catch (error) {
            const errorDTO: OpenDataDIDDTO = {
                status: 'error',
                scope,
                name,
                meta: {},
                errorName: 'Unknown Error',
                errorType: 'gateway_endpoint_error',
                errorCode: 500,
                errorMessage: error?.toString(),
            };

            return Promise.resolve(errorDTO);
        }
    }
}