import os
import json
import signal
import socketio
from twisted.internet import reactor, protocol, error
from twisted.web.static import File
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource
from pymodbus.client.async import ModbusClientProtocol, ModbusUdpClientProtocol


# Allow to set HTTP server port in environment
PORT = os.getenv('PORT', 5000)


#
# Initialize configuration
#
config = {
    'modbusProto': 'UDP',   # NetSwarm uses UDP by default (to use broadcast)
    'modbusPort': 512,      # default Modbus port
    'modbusTimeout': 3,     # short timeout to see when there's no response
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
    rd = getModbusClient(data['ip'])
    rd.addCallback(readCallback, data)
    rd.addErrback(lambda r: modbusErrbackConnection('read', r, data))

def readCallback(client, data):
    typ, offset, count = data['type'], data['offset'], data.get('count', 1)

    if typ == 'hreg':
        rq = client.read_holding_registers(offset, count)
        getRes = lambda r: r.registers
    elif typ == 'coil':
        rq = client.read_coils(offset, count)
        getRes = lambda r: r.bits
    else:
        sio.emit('readResponse', {'ip': data['ip'], 'type': typ, 'error': 'Unknown read data type requested: %s'%typ})
        client.transport.loseConnection()
        return

    rq.addCallback(lambda r: modbusCallback('read', r, data, getRes(r)))
    rq.addErrback(lambda r: modbusErrbackResponse('read', r, data))
    rq.addBoth(lambda r: client.transport.loseConnection())

@sio.on('write')
def write(sid, data):
    rd = getModbusClient(data['ip'])
    rd.addCallback(writeCallback, data)
    rd.addErrback(lambda r: modbusErrbackConnection('write', r, data))

def writeCallback(client, data):
    typ, offset, value = data['type'], data['offset'], data['value']

    if typ == 'hreg':
        rq = client.write_registers(offset, value)
    if typ == 'coil':
        rq = client.write_coils(offset, value)
    else:
        sio.emit('writeResponse', {'ip': data['ip'], 'type': typ, 'error': 'Unknown write data type requested: %s'%typ})
        client.transport.loseConnection()
        return

    rq.addCallback(lambda r: modbusCallback('write', r, data, value))
    rq.addErrback(lambda r: modbusErrbackResponse('write', r, data))
    rq.addBoth(lambda r: client.transport.loseConnection())

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
def getModbusClient(ip):
    host = '.'.join(map(str, ip))
    proto = config.get('modbusProto')
    port = int(config.get('modbusPort'))
    timeout = int(config.get('modbusTimeout'))
    if proto == 'UDP':
        creator = None
    elif proto == 'TCP':
        creator = protocol.ClientCreator(reactor, ModbusClientProtocol)
        return creator.connectTCP(host, port, timeout=timeout)
    else:
        # @todo emit error over websocket instead
        raise "Unknown Modbus protocol: %s"%proto

# Callback for modbus read/write requests
def modbusCallback(s, r, data, value):
    ip, typ, offset = data['ip'], data['type'], data['offset']
    if r.function_code < 0x80:
        sio.emit(s + 'Response', {'ip': ip, 'type': typ, 'offset': offset, 'value': value})
    else:
        sio.emit(s + 'Response', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: 0x%x'%r.function_code})

# Errback for modbus read/write requests
def modbusErrbackResponse(s, r, data):
    if isinstance(r, error.TimeoutError):
        ip, typ, offset = data['ip'], data['type'], data['offset']
        sio.emit(s + 'Response', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'No response'})
    else:
        sio.emit(s + 'Response', {'ip': ip, 'type': typ, 'offset': offset, 'error': str(s)})
        return r

# Errback for opening modbus connection
def modbusErrbackConnection(s, r, data):
    sio.emit(s + 'Response', {'ip': data['ip'], 'error': 'Could not open Modbus connection: %s'%s})
    return r


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
