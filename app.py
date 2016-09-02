import os
import json
import signal
import socketio
from twisted.internet import reactor
from twisted.web.static import File
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource
from pymodbus.client.sync import ModbusUdpClient, ModbusTcpClient


# Allow to set HTTP server port in environment
PORT = os.getenv('PORT', 5000)


#
# Setup configuration
#
config = {
    'modbusProto': 'UDP',
    'modbusPort': 512,
    'ipStart': [192, 168, 1, 177],
    'nDevices': 1,
    'registers': {
        0: {'type': 'hreg', 'format': 'dec', 'bits':  8, 'label': 'IP address (1-2)'},
        1: {'type': 'hreg', 'format': 'dec', 'bits':  8, 'label': 'IP address (3-4)'},
        2: {'type': 'coil', 'format': 'cmdbtn',          'label': 'Apply'},
        3: {'type': 'coil', 'format': 'cmdbtn',          'label': 'Save to EEPROM'},
        4: {'type': 'coil', 'format': 'cmdbtn',          'label': 'Load from EEPROM'},
    }
}
if os.path.exists('config.json'):
    with open('config.json') as f:
        config.update(json.load(f))

#
# Setup socket.io routes
#
sio = socketio.Server(logger=True, async_mode='threading')

@sio.on('connect')
def connect(sid, environ):
    sio.emit('status', {'connected': True}, room=sid)
    getConfig(sid)

@sio.on('read')
def read(sid, data):
    readWorker(data['ip'], data['type'], data['offset'], data.get('count', 1))
def readWorker(ip, typ, offset, count):
    c = getModbusClient(ip)

    if typ == 'hreg':
        rq = c.read_holding_registers(offset, count)
    elif typ == 'coil':
        rq = c.read_coil(offset, count)
    else:
        raise "Unknown read data type requested: %s"%typ

    if not rq:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: no response'})
    elif rq.function_code < 0x80:
        sio.emit('readResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': rq.registers})
    else:
        sio.emit('readResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: 0x%x'%rq.function_code})

@sio.on('write')
def write(sid, data):
    writeWorker(data['ip'], data['type'], data['offset'], data['value'])
def writeWorker(ip, typ, offset, value):
    c = getModbusClient(ip)

    if typ == 'hreg':
        rq = c.write_registers(offset, value)
    elif typ == 'coil':
        rq = c.write_coils(offset, value)
    else:
        raise "Unknown write data type requested: %s"%typ

    if not rq:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: no response'})
    elif rq.function_code < 0x80:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': value})
    else:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: 0x%x'%rq.function_code})

@sio.on('getConfig')
def getConfig(sid, data = None):
    sio.emit('config', config, room=sid)

@sio.on('updateConfig')
def updateConfig(sid, data):
    config.update(data)
    with open('config.json', 'w') as f:
        json.dump(config, f, indent=2)
    sio.emit('config', config)


# Return modbus client for the selected protocol
def getModbusClient(ip, proto = config.get('modbusProto'), port = config.get('modbusPort')):
    host = '.'.join(map(str, ip))
    if proto == 'UDP':
        return ModbusUdpClient(host, port=port, timeout=0.2) # timeout important since it's sync :(
    elif proto == 'TCP':
        c = ModbusClient(host, port=port)
        c.connect()
        return c
    else:
        raise "Unknown Modbus protocol: %s"%proto


#
# Setup and run webserver
#
def main():
    # first make sure we can use ctrl-c
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, signal_handler)

    # static files
    prefix = os.path.dirname(__file__)
    root = File(prefix.join('static'))

    # add socket.io as wsgi app
    #   allows combining socketio with twisted so we can use async with pymodbus
    wsApp = sio.handle_request
    wsResource = WSGIResource(reactor, reactor.getThreadPool(), wsApp)
    root.putChild('socket.io', wsResource)

    # go
    site = Site(root)
    reactor.listenTCP(PORT, site)
    reactor.run()

def signal_handler(*args):
    print("Killed by user")
    reactor.stop()

if __name__ == '__main__':
    main()
