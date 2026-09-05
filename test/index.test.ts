import request from 'supertest';
import {Curl} from './stubs/node-libcurl';
import {app} from '../src/index';
import {lanServerHost} from './stubs/config';

/**
 * The CSV the LAN server exports. Row 2 carries the meter PIDs; every row
 * after it is one measurement, as name / unit / value columns.
 */
const csv = [
    'K\'ELECTRIC LAN server export;;;',
    'Device;;;',
    'PID;;5I8P1265;5I8P9999',
    'Voltage L1;V;230,5;231,0',
    'Current L1;A;12,75;9,50',
    'Factory Alarm Status 1;;0;0',
    'Active Energy Total;kWh;104857,25;99,00'
].join('\n');

const probe = (target: string, respond: (curl: Curl) => void) => {
    Curl.reset();
    Curl.respond = respond;
    return request(app).get('/probe').query({target});
};

const ok = (body: string, statusCode = 200) => (curl: Curl) => curl.handlers.end(statusCode, body);

describe('GET /probe', () => {
    it('fetches the CSV export from the configured LAN server, following redirects', async () => {
        await probe('5I8P1265', ok(csv));

        expect(Curl.instances).toHaveLength(1);
        expect(Curl.instances[0].opts.URL).toBe(lanServerHost + '/export.csv?lang=english');
        expect(Curl.instances[0].opts.FOLLOWLOCATION).toBe(true);
    });

    it('renders the measurements as Prometheus gauges', async () => {
        const res = await probe('5I8P1265', ok(csv));

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.text).toContain('# TYPE modbus_em_http_status_code gauge\nmodbus_em_http_status_code 200');
        expect(res.text).toContain('# HELP modbus_em_voltage_l1 Voltage L1 V');
        expect(res.text).toContain('# TYPE modbus_em_voltage_l1 gauge');
        expect(res.text).toContain('\nmodbus_em_voltage_l1 230.5');
        expect(res.text).toContain('\nmodbus_em_current_l1 12.75');
        expect(res.text).toContain('\nmodbus_em_active_energy_total 104857.25');
        expect(res.text.endsWith('modbus_em_success 1\n')).toBe(true);
    });

    it('sanitises a measurement name into a metric name', async () => {
        const res = await probe('5I8P1265', ok(csv));

        // spaces and punctuation collapse to single underscores, lower-cased
        expect(res.text).toContain('modbus_em_active_energy_total');
        const sampleNames = res.text.split('\n')
            .filter(line => line && !line.startsWith('#'))
            .map(line => line.split(' ')[0]);
        expect(sampleNames.length).toBeGreaterThan(0);
        sampleNames.forEach(name => expect(name).toMatch(/^[a-z0-9_]+$/));
    });

    it('converts a decimal comma into a decimal point', async () => {
        const res = await probe('5I8P1265', ok(csv));

        expect(res.text).not.toMatch(/modbus_em_voltage_l1 230,5/);
        expect(res.text).toContain('modbus_em_voltage_l1 230.5');
    });

    it('omits factory alarm status rows', async () => {
        const res = await probe('5I8P1265', ok(csv));

        expect(res.text).not.toContain('modbus_em_factory_alarm_status');
    });

    it('answers 404 when the requested target is not in the export', async () => {
        const res = await probe('NOT_A_METER', ok(csv));

        expect(res.status).toBe(404);
    });

    it('never answers at all when the upstream probe fails', async () => {
        // Documents a real defect: on a non-200 the handler builds the
        // "modbus_em_success 0" body but never calls res.send, so the client is
        // left hanging until it times out. Scraping this endpoint while the LAN
        // server is unhealthy therefore stalls the scrape rather than reporting 0.
        Curl.reset();
        Curl.respond = ok('', 500);

        await expect(
            request(app).get('/probe').query({target: '5I8P1265'}).timeout(300)
        ).rejects.toThrow();
    });

    it('closes the curl handle on a transport error', async () => {
        Curl.reset();
        Curl.respond = curl => {
            curl.handlers.error();
            // nothing is written to the response, so end it here to release the request
            curl.handlers.end(200, csv);
        };

        await request(app).get('/probe').query({target: '5I8P1265'});

        expect(Curl.instances[0].closed).toBe(true);
    });

    it('always reads the first meter column, whichever target is asked for', async () => {
        // Documents current behaviour: targetIndex is used only to decide 200 vs 404,
        // never to select the column, so a second meter reports the first meter's values.
        const first = await probe('5I8P1265', ok(csv));
        const second = await probe('5I8P9999', ok(csv));

        expect(second.status).toBe(200);
        expect(second.text).toBe(first.text);
        expect(second.text).toContain('modbus_em_voltage_l1 230.5'); // not 231.0
    });
});
