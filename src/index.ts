import express from 'express';
import {lan_server_url, server_port} from './config';
import {Curl} from "node-libcurl";
import {parse} from 'papaparse';

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

// start the Express server
app.listen(server_port, () => {
    console.log(`server started at http://localhost:${server_port}`);
});
