import * as http from 'http';
import {AddressInfo} from 'net';

/**
 * Post-upgrade only. node-libcurl 2.0.3 had no loadable prebuilt binary here, so
 * this cannot run against the baseline and is not part of the before/after
 * comparison. It exists because the rest of the suite stubs node-libcurl, which
 * would otherwise leave the 2.x -> 5.x jump entirely unverified: it pins the
 * exact API surface src/index.ts relies on.
 */
// resolved by absolute path so jest's moduleNameMapper stub is bypassed
const {Curl} = jest.requireActual(require.resolve('node-libcurl', {paths: [process.cwd()]}));

describe('node-libcurl, as src/index.ts uses it', () => {
    let server: http.Server;
    let url: string;
    let redirected = false;

    beforeAll(done => {
        server = http.createServer((req, res) => {
            if (req.url && req.url.startsWith('/moved')) {
                res.writeHead(302, {Location: '/export.csv?lang=english'});
                res.end();
                return;
            }
            if (req.url && req.url.startsWith('/export.csv')) {
                redirected = true;
                res.writeHead(200, {'Content-Type': 'text/csv'});
                res.end('PID;;5I8P1265\nVoltage L1;V;230,5\n');
                return;
            }
            res.writeHead(500);
            res.end('upstream broken');
        });
        server.listen(0, '127.0.0.1', () => {
            url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
            done();
        });
    });

    afterAll(done => {
        server.close(() => done());
    });

    it('delivers status code and body to the end handler', done => {
        const curl = new Curl();
        curl.setOpt('URL', url + '/export.csv?lang=english');
        curl.setOpt('FOLLOWLOCATION', true);
        curl.on('end', (statusCode: number, data: any) => {
            expect(statusCode).toBe(200);
            expect(data.toString()).toContain('Voltage L1;V;230,5');
            curl.close();
            done();
        });
        curl.on('error', (err: Error) => {
            curl.close();
            done(err);
        });
        curl.perform();
    });

    it('follows a redirect when FOLLOWLOCATION is set', done => {
        redirected = false;
        const curl = new Curl();
        curl.setOpt('URL', url + '/moved');
        curl.setOpt('FOLLOWLOCATION', true);
        curl.on('end', (statusCode: number) => {
            expect(statusCode).toBe(200);
            expect(redirected).toBe(true);
            curl.close();
            done();
        });
        curl.on('error', (err: Error) => {
            curl.close();
            done(err);
        });
        curl.perform();
    });

    it('reports a non-200 status through the end handler, not the error handler', done => {
        const curl = new Curl();
        curl.setOpt('URL', url + '/nope');
        curl.on('end', (statusCode: number) => {
            expect(statusCode).toBe(500);
            curl.close();
            done();
        });
        curl.on('error', (err: Error) => {
            curl.close();
            done(err);
        });
        curl.perform();
    });
});
