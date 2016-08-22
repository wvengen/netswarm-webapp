import os
import socketio
import eventlet
import eventlet.wsgi
from flask import Flask, render_template
from pymodbus.client.sync import ModbusUdpClient, ModbusTcpClient

PORT = os.getenv('PORT', 5000)
MODBUS_PORT = os.getenv('MODBUS_PORT', 502)
MODBUS_PROTO = os.getenv('MODBUS_PROTO', 'UDP')

sio = socketio.Server(logger=True, async_mode='eventlet')
app = Flask(__name__)
thread = None
pile = eventlet.GreenPile()

@app.route('/')
def index():
    return render_template('index.html')

@sio.on('connect')
def connect(sid, environ):
    sio.emit('status', {'connected': True}, room=sid)

@sio.on('read')
def read(sid, data):
    pile.spawn(readWorker, data['ip'], data['type'], data['offset'], data.get('count', 1))
def readWorker(ip, typ, offset, count):
    c = getModbusClient(ip)

    if typ == 'hreg':
        rq = c.read_holding_registers(offset, count)
    elif typ == 'coil':
        rq = c.read_coil(offset, count)
    else:
        raise "Unknown read data type requested: %s"%typ

    if rq.function_code < 0x80:
        sio.emit('readResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': rq.registers})
    else:
        sio.emit('readResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: 0x%x'%rq.function_code})

@sio.on('write')
def write(sid, data):
    pile.spawn(writeWorker, data['ip'], data['type'], data['offset'], data['value'])
def writeWorker(ip, typ, offset, value):
    c = getModbusClient(ip)

    if typ == 'hreg':
        rq = c.write_registers(offset, value)
    elif typ == 'coil':
        rq = c.write_coils(offset, value)
    else:
        raise "Unknown write data type requested: %s"%typ

    if rq.function_code < 0x80:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'value': value})
    else:
        sio.emit('writeResponse', {'ip': ip, 'type': typ, 'offset': offset, 'error': 'Unexpected response: 0x%x'%rq.function_code})


def getModbusClient(ip, proto = MODBUS_PROTO):
    if proto == 'UDP':
        return ModbusUdpClient(ip)
    elif proto == 'TCP':
        c = ModbusClient(ip)
        c.connect()
        return c
    else:
        raise "Unknown Modbus protocol: %s"%proto

if __name__ == '__main__':
    app = socketio.Middleware(sio, app)
    eventlet.wsgi.server(eventlet.listen(('', PORT)), app)
