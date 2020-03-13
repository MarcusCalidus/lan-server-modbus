import express from 'express';
import {lan_server_url, server_port} from './config';
import {Curl} from "node-libcurl";
import {parse} from 'papaparse';
import * as PromClient from 'prom-client';

const app = express();

// define a route handler for the default home page
app.get('/', (req, res) => {
    res.statusCode = 200;
    res.send('Hello world!');
});

app.get('/metrics/raw', (req, res) => {
    const curl = new Curl();

    curl.setOpt('URL', lan_server_url);
    curl.setOpt('FOLLOWLOCATION', true);

    curl.on('end', function (statusCode, data, headers) {
        res.statusCode = (headers[0] as any).result.code;
        res.send(data);
    });

    curl.on('error', curl.close.bind(curl));
    curl.perform();
});

app.get('/metrics/parsed', (req, res) => {
    const curl = new Curl();

    curl.setOpt('URL', lan_server_url);
    curl.setOpt('FOLLOWLOCATION', true);

    curl.on('end', function (statusCode, data, headers) {
        res.statusCode = (headers[0] as any).result.code;
        res.setHeader('Content-Type', 'application/json')
        const arrayData = parse(
            data.toString(),
            {
                delimiter: ';',
                skipEmptyLines: true
            }).data;
        res.send(arrayData);
    });

    curl.on('error', curl.close.bind(curl));
    curl.perform();
});

app.get('/probe', (req, res) => {
    // create new Curl Object
    const curl = new Curl();

    // set Curl options
    curl.setOpt('URL', lan_server_url);
    curl.setOpt('FOLLOWLOCATION', true);

    // on Curl end result handle csv data in result
    curl.on(
        'end',
        (statusCode, data, headers) => {
        if (statusCode !== 200) {
            // send any non success directly to client
            res.sendStatus(statusCode)
        } else {
            // convert csv to array
            let arrayData = parse(
                data.toString(),
                {
                    delimiter: ';',
                    skipEmptyLines: true
                }).data;

            // find index of electricity meter.
            // PID of meter is taken from query parameter target e.g. /probe?target=5I8P1265
            const targetIndex = (arrayData[2] as string[]).findIndex( (s) => s.trim() === req.query.target );
            if (targetIndex < 0) {
                // target not found? tell the client!
                res.sendStatus(404)
            } else {
                // everything seems fine
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/plain');

                let result: string[] = [];

                arrayData.forEach(
                    (record, index) => {
                        /*switch (record[0].trim()) {
                            case 'Frequenz':
                                result.push('# HELP electricity_meter_frequency Frequency in ' + record[1]);
                                result.push('# TYPE electricity_meter_frequency gauge');
                                result.push('electricity_meter_frequency ' +
                                    parseFloat((record[targetIndex] as string)
                                        .replace(',','.')))
                                    .toFixed(2);
                                break;
                            default: break;

                        }*/

                        if (index > 2) {
                            let varName = record[0].trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                            result.push('# HELP ' + varName + record[0] + record[1]);
                            result.push('# TYPE ' + varName + record[0] + ' gauge');
                            result.push(varName + ' ' + record[2].replace(',', '.').trim());
                        }
                    }
                );

                res.send(result.join('\n'));
            }
        }
    });

    // Bei Curl Fehler, Verbindung trennen
    curl.on('error', curl.close.bind(curl));
    // Curl Request ausführen
    curl.perform();
});

// start the Express server
app.listen(server_port, () => {
    console.log(`server started at http://localhost:${server_port}`);
});
