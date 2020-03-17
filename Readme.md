# lan-server-modbus - a Prometheus exporter for K'ELECTRIC LAN server Modbus/TCP data concentrator

K'ELECTRIC offers a LAN server Modbus/TCP data concentrator device to read the values of their digital electric meters. More information on those devices can be found here: https://www.k-electric-gmbh.de/en/products/digital-electric-meter/digital-current-meter.html

The lan-server-modbus Prometheus exporter is a straight forward approach to provide the data in neat Gauge values.

Please feel free to provide input or issues to this project.

##Prerequisites
In order to run lan-server-modbus you need Node.js installed on your system.

##Installation
The Installation is simple as can be. 
```
npm i
```

##Configuration
The configuration of your LAN server will be asked upon installation. You can change the configuration everythime by 
```
npm run configure
``` 

##Running
To start the server run. 

```
node path/to/lan-server-modbus
```

or

```
npx path/to/lan-server-modbus
```

(You might want to run this as a service)

##Getting the values
The exporter provides the values per installed digital current meter as follows

```
http://{YourExporterServer}:9689/probe?target={IdOfCurrentMeter}

e.g. http://localhost:9689/probe?target=5I8P1265
```
