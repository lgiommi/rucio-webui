import { ListOpenDataDIDsError, ListOpenDataDIDsResponse } from '@/lib/core/usecase-models/list-opendata-dids-usecase-models';
import { BasePresenter } from '@/lib/sdk/presenter';
import type { ListOpenDataDIDsViewModel } from '@/lib/infrastructure/data/view-model/opendata';

export default class ListOpenDataDIDsPresenter extends BasePresenter<ListOpenDataDIDsResponse, ListOpenDataDIDsError, ListOpenDataDIDsViewModel> {
    convertResponseModelToViewModel(responseModel: ListOpenDataDIDsResponse): {
        viewModel: ListOpenDataDIDsViewModel;
        status: number;
    } {
        const viewModel: ListOpenDataDIDsViewModel = {
            status: 'success',
            total: responseModel.total,
            offset: responseModel.offset,
            dids: responseModel.dids,
        };

        return {
            status: 200,
            viewModel,
        };
    }

    convertErrorModelToViewModel(errorModel: ListOpenDataDIDsError): {
        viewModel: ListOpenDataDIDsViewModel;
        status: number;
    } {
        const status = errorModel.code ?? (errorModel.error === 'INVALID_AUTH' ? 401 : errorModel.error === 'INVALID_REQUEST' ? 400 : 500);

        const message = errorModel.message ? errorModel.message.toString() : errorModel.error;

        const viewModel: ListOpenDataDIDsViewModel = {
            status: 'error',
            errorType: errorModel.error,
            message,
            total: 0,
            offset: 0,
            dids: [],
        };

        return {
            status,
            viewModel,
        };
    }
}
