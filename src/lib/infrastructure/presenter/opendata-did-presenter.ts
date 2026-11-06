import { OpenDataDIDError, OpenDataDIDResponse } from '@/lib/core/usecase-models/opendata-did-usecase-models';
import { BasePresenter } from '@/lib/sdk/presenter';
import type { OpenDataDIDViewModel } from '@/lib/infrastructure/data/view-model/opendata';

export default class OpenDataDIDPresenter extends BasePresenter<OpenDataDIDResponse, OpenDataDIDError, OpenDataDIDViewModel> {
    convertResponseModelToViewModel(responseModel: OpenDataDIDResponse): {
        viewModel: OpenDataDIDViewModel;
        status: number;
    } {
        const viewModel: OpenDataDIDViewModel = {
            status: 'success',
            scope: responseModel.scope,
            name: responseModel.name,
            state: responseModel.state,
            doi: responseModel.doi,
            record_id: responseModel.record_id,
            files: responseModel.files,
            files_summary: responseModel.files_summary,
            meta: responseModel.meta,
        };

        return {
            status: 200,
            viewModel,
        };
    }

    convertErrorModelToViewModel(errorModel: OpenDataDIDError): {
        viewModel: OpenDataDIDViewModel;
        status: number;
    } {
        const status = errorModel.code ?? 500;
        const message = errorModel.message ? errorModel.message.toString() : errorModel.error;

        const viewModel: OpenDataDIDViewModel = {
            status: 'error',
            errorType: errorModel.error,
            message,
            scope: '',
            name: '',
            state: undefined,
            doi: null,
            record_id: null,
            files: [],
            meta: {},
        };

        return {
            status,
            viewModel,
        };
    }
}
