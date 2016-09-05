from twisted.internet import reactor, protocol, defer, error
from pymodbus.client.async import ModbusClientProtocol, ModbusUdpClientProtocol
from config import config


class ModbusError(StandardError): pass
class ModbusValueError(ModbusError): pass
class ModbusResponseError(ModbusError): pass
class ModbusNoResponseError(ModbusError): pass


def read(ip, typ, offset, count = 1):
    rd = connect(ip)
    rd.addCallback(readCallback, typ, offset, count)
    rd.addCallback(modbusCallback, typ)
    rd.addErrback(modbusErrback)
    return rd

def readCallback(client, typ, offset, count):
    if typ == 'hreg':
        rq = client.read_holding_registers(offset, count)
    elif typ == 'coil':
        rq = client.read_coils(offset, count)
    else:
        disconnect(client)
        return deferredErr(ModbusValueError('Unknown read data type requested: %s'%typ))

    rq.addBoth(lambda r: disconnect(client, r))

    return rq


def write(ip, typ, offset, values):
    rd = connect(ip)
    rd.addCallback(writeCallback, typ, offset, values)
    rd.addCallback(modbusCallback, None)
    rd.addErrback(modbusErrback)
    return rd

def writeCallback(client, typ, offset, values):
    if typ == 'hreg':
        rq = client.write_registers(offset, values)
    if typ == 'coil':
        rq = client.write_coils(offset, values)
    else:
        disconnect(client)
        return deferredErr(ModbusValueError('Unknown write data type requested: %s'%typ))

    rq.addBoth(lambda r: disconnect(client, r))

    return rq

def modbusCallback(r, typ):
    if r.function_code < 0x80:
        if typ == 'hreg':
            return r.registers
        elif typ == 'coil':
            return r.bits
        else:
            pass # shouldn't happen, already checked earlier
    else:
        return deferredErr(ModbusResponseError('Unexpected response: 0x%x'%r.function_code))

def modbusErrback(e):
    if isinstance(e.value, error.TimeoutError):
        return deferredErr(ModbusNoResponseError('No response'))
    elif isinstance(e.value, error.ConnectionRefusedError):
        return deferredErr(ModbusNoResponseError('Connection refused'))
    else:
        return deferredErr(e)


def connect(ip):
    host = '.'.join(map(str, ip))
    proto = config.get('modbusProto')
    port = int(config.get('modbusPort'))
    timeout = int(config.get('modbusTimeout'))
    if proto == 'UDP':
        proto = ModbusUdpClientProtocol()
        reactor.listenUDP(0, proto) # @todo check if we need a (free) port here instead of 0
        proto.transport.connect(host, port)
        # @todo emit error on timeout if no response received after request (...)
        reactor.callLater(timeout, lambda: disconnect(proto))
        d = defer.Deferred()
        d.callback(proto)
        return d
    elif proto == 'TCP':
        creator = protocol.ClientCreator(reactor, ModbusClientProtocol)
        return creator.connectTCP(host, port, timeout = timeout)
    else:
        return deferredErr(ModbusValueError('Unknown Modbus protocol: %s'%proto))

def disconnect(client, arg = None):
    modbusProto = config.get('modbusProto')
    if modbusProto == 'TCP':
        client.transport and client.transport.loseConnection()
    elif modbusProto == 'UDP':
        client.transport and client.transport.stopListening()
    else:
        pass # shouldn't happen, we catch this error already elsewhere
    return arg

def deferredErr(v):
    d = defer.Deferred()
    d.errback(v)
    return d
