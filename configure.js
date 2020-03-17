var Prompt = require('prompt-input');
var fs = require('fs');
var path = require('path');

var promptConfig = new Prompt({
    name: 'overwrite',
    message: 'Do you want to overwrite the config present in src/config.ts [y/N]?',
    validate: function (str) {
        if (!str || /(y|n|Y|N|\w)/.test(str)) {
            return true;
        } else {
            return 'invalid value';
        }
    }
});

var promptHost = new Prompt({
    name: 'host',
    message: 'Please enter the host name or ip of the device',
    validate: function (str) {
        let ValidIpAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        let ValidHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

        if (str && (ValidIpAddressRegex.test(str) || ValidHostnameRegex.test(str))) {
            return true;
        } else {
            return 'invalid value';
        }
    }
});

console.log('Welcome to the configuration of the K\'ELECTRIC LAN server Modbus/TCP data concentrator Prometheus exporter.');

function doPromptHost() {
    promptHost.ask((answer) => {
        fs.writeFileSync(path.join(__dirname, 'src', 'config.ts'),
            `export const serverPort=9689;\n` +
            `export const lanServerHost ='http://${answer}';`);
    });
}

if (fs.existsSync(path.join(__dirname, 'src', 'config.ts'))) {
    promptConfig.ask(
        (answer) => {
            if (answer && /^([yY])$/
                .test(answer)) {
                doPromptHost();
            }
        })
} else {
    doPromptHost();
}

