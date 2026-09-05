// Generates src/config.ts from two prompts. Uses node:readline rather than a
// package so the setup step adds no dependencies of its own.
const readline = require('readline/promises');
const {stdin, stdout} = require('process');
const fs = require('fs');
const path = require('path');

const VALID_IP = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
const VALID_HOSTNAME = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

const configPath = path.join(__dirname, 'src', 'config.ts');

async function main() {
    console.log('Welcome to the configuration of the K\'ELECTRIC LAN server Modbus/TCP data concentrator Prometheus exporter.');

    const rl = readline.createInterface({input: stdin, output: stdout});
    try {
        if (fs.existsSync(configPath)) {
            const overwrite = await rl.question('Do you want to overwrite the config present in src/config.ts [y/N]? ');
            if (!/^[yY]$/.test(overwrite.trim())) {
                return;
            }
        }

        let host = '';
        while (!host) {
            const answer = (await rl.question('Please enter the host name or ip of the device: ')).trim();
            if (VALID_IP.test(answer) || VALID_HOSTNAME.test(answer)) {
                host = answer;
            } else {
                console.log('invalid value');
            }
        }

        fs.writeFileSync(configPath,
            'export const serverPort=9689;\n' +
            `export const lanServerHost ='http://${host}';\n`);
    } finally {
        rl.close();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
