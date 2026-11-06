import OpenDataDIDPresenter from '@/lib/infrastructure/presenter/opendata-did-presenter';
import ListOpenDataDIDsPresenter from '@/lib/infrastructure/presenter/list-opendata-dids-presenter';

describe('OpenData presenters', () => {
    describe('OpenDataDIDPresenter', () => {
        const presenter = new OpenDataDIDPresenter();

        it('preserves files_summary and file metadata', () => {
            const response = presenter.convertResponseModelToViewModel({
                status: 'success',
                scope: 'test',
                name: 'dataset',
                state: 'PUBLIC',
                doi: null,
                record_id: null,
                meta: {},
                files: [
                    {
                        scope: 'test',
                        name: 'file.root',
                        bytes: 1024,
                        adler32: '12345678',
                        download_urls: [],
                    },
                ],
                files_summary: {
                    length: 1,
                    bytes: 1024,
                },
            });

            expect(response.status).toBe(200);
            expect(response.viewModel.files_summary?.bytes).toBe(1024);
            expect(response.viewModel.files[0].bytes).toBe(1024);
            expect(response.viewModel.files[0].adler32).toBe('12345678');
        });

        it('exposes typed errors', () => {
            const result = presenter.convertErrorModelToViewModel({
                status: 'error',
                code: 404,
                name: 'Not Found',
                error: 'NOT_FOUND',
                message: 'DID not found',
            });

            expect(result.status).toBe(404);
            expect(result.viewModel.errorType).toBe('NOT_FOUND');
        });

        it('exposes download failures independently', () => {
            const result = presenter.convertErrorModelToViewModel({
                status: 'error',
                code: 503,
                name: 'Download Unavailable',
                error: 'DOWNLOAD_UNAVAILABLE',
                message: 'Download URLs unavailable',
            });

            expect(result.status).toBe(503);
            expect(result.viewModel.errorType).toBe('DOWNLOAD_UNAVAILABLE');
        });
    });

    describe('ListOpenDataDIDsPresenter', () => {
        const presenter = new ListOpenDataDIDsPresenter();

        it('exposes unsupported OpenData errors', () => {
            const result = presenter.convertErrorModelToViewModel({
                status: 'error',
                code: 404,
                name: 'Unsupported',
                error: 'FEATURE_UNSUPPORTED',
                message: 'OpenData not supported',
            });

            expect(result.status).toBe(404);
            expect(result.viewModel.errorType).toBe('FEATURE_UNSUPPORTED');
        });
    });
});
