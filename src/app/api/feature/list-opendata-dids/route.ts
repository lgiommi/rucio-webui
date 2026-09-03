import 'reflect-metadata';
import { NextRequest, NextResponse } from 'next/server';
import appContainer from '@/lib/infrastructure/ioc/container-config';
import CONTROLLERS from '@/lib/infrastructure/ioc/ioc-symbols-controllers';
import { BaseController } from '@/lib/sdk/controller';
import {
    executeAuthenticatedController,
    parseQueryParams,
} from '@/lib/infrastructure/adapters/app-router-controller-adapter';
import { ListOpenDataDIDsControllerParameters } from '@/lib/infrastructure/controller/list-opendata-dids-controller';

/**
 * GET /api/feature/list-opendata-dids
 * Query params: limit, offset, state
 */
export async function GET(request: NextRequest) {
    try {
        const params = parseQueryParams(request);

        const limit =
            typeof params.limit === 'string'
                ? params.limit
                : undefined;
        const offset =
            typeof params.offset === 'string'
                ? params.offset
                : undefined;
        const state =
            typeof params.state === 'string'
                ? params.state
                : undefined;

        const controller =
            appContainer.get<
                BaseController<ListOpenDataDIDsControllerParameters, void>
            >(CONTROLLERS.LIST_OPENDATA_DIDS);

        return executeAuthenticatedController(controller, {
            limit,
            offset,
            state,
        });
    } catch (error) {
        console.error('Error in list-opendata-dids:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}