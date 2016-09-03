import socketio

import modbus
from config import config

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
    ip, typ, offset, count = data['ip'], data['type'], data['offset'], data.get('count', 1)
    d = modbus.read(ip, typ, offset, count)
    d.addCallback(lambda v: sio.emit('readResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': v}))
    d.addErrback(lambda e: modbusErrback(e, ip, typ, offset))

@sio.on('write')
def write(sid, data):
    ip, typ, offset, values = data['ip'], data['type'], data['offset'], data['value']
    d = modbus.write(ip, typ, offset, values)
    d.addCallback(lambda _: sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': values}))
    d.addErrback(lambda e: modbusErrback(e, ip, typ, offset))

@sio.on('getConfig')
def getConfig(sid, data = None):
    sio.emit('config', config.data, room=sid)

@sio.on('updateConfig')
def updateConfig(sid, data):
    config.update(data)
    config.save()
    sio.emit('config', config.data)


def modbusErrback(e, ip, typ, offset):
    if isinstance(e.value, modbus.ModbusError):
        # pass modbus errors to the client - stuff can happen
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': str(e.value)})
    else:
        # show other errors in server log
        return e
