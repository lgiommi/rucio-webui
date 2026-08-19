import { OpenDataDIDDTO } from '@/lib/core/dto/opendata-dto';

export default interface OpenDataGatewayOutputPort {
    getOpenDataDID(
        rucioAuthToken: string,
        scope: string,
        name: string,
    ): Promise<OpenDataDIDDTO>;
}