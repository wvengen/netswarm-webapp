from twisted.internet import reactor, protocol
from pymodbus.factory import ServerDecoder
from pymodbus.transaction import ModbusSocketFramer
from pymodbus.server.async import ModbusTcpProtocol as PymodbusTcpProtocol, ModbusServerFactory as PymodbusServerFactory
from pymodbus.register_write_message import WriteSingleRegisterRequest, WriteMultipleRegistersRequest
from pymodbus.bit_write_message import WriteSingleCoilRequest, WriteMultipleCoilsRequest

from config import config

import logging
_logger = logging.getLogger(__name__)


def parseModbusRequest(request):
    '''Converts pymodbus request to its components as used in this webapp'''
    if isinstance(request, WriteSingleRegisterRequest):
        typ = 'hreg'
        values = [request.value]
    elif isinstance(request, WriteMultipleRegistersRequest):
        typ = 'hreg'
        values = request.values
    elif isinstance(request, WriteSingleCoilRequest):
        typ = 'coil'
        values = [request.value]
    elif isinstance(request, WriteMultipleCoilsRequest):
        typ = 'coil'
        values = request.values
    else:
        _logger.debug('Ignoring modbus message of type %s' % type(request).__name__)
        return None, None, None

    return typ, request.address, values


class ModbusTcpProtocol(PymodbusTcpProtocol):
    '''Implements a modbus tcp listener (non-responding server) in Twisted'''

    def __init__(self, addr, callback=None, framer=None, **kwargs):
        self._modbusCallback = callback

    def _execute(self, request):
        '''Receives incoming request and runs callback

        :param request: decoded request message
        '''
        peer = self.transport.getPeer()
        ip, port = peer.host, peer.port
        _logger.debug('Modbus message from [%s:%s]: %s' % (ip, port, request))
        if self._modbusCallback:
            ipArray = map(int, ip.split('.'))
            typ, address, values = parseModbusRequest(request)
            if typ: self._modbusCallback(ipArray, typ, address, values)
        # no replies
        self.transport.loseConnection()

class ModbusServerFactory(PymodbusServerFactory):
    protocol = ModbusTcpProtocol

    def __init__(self, callback=None, framer=None, **kwargs):
        PymodbusServerFactory.__init__(self, None, framer, None, **kwargs)
        self._modbusCallback = callback

    def buildProtocol(self, addr):
        p = self.protocol(addr, self._modbusCallback, self.framer)
        p.factory = self
        return p


class ModbusUdpProtocol(protocol.DatagramProtocol):
    '''Implements a modbus udp listener (non-responding server) in Twisted'''

    def __init__(self, callback=None, framer=None, **kwargs):
        framer = framer or ModbusSocketFramer
        self.framer = framer(decoder=ServerDecoder())
        self._modbusCallback = callback

    def datagramReceived(self, data, addr):
        '''Callback when we receive any data

        :param data: data sent by the client
        :param addr: tuple of source of datagram
        '''
        ip, port = addr
        _logger.debug('Packet from [%s:%s]' % (ip, port))
        if _logger.isEnabledFor(logging.DEBUG):
            _logger.debug(' '.join([hex(ord(x)) for x in data]))
        self.framer.processIncomingPacket(data, lambda r: self._execute(r, addr))

    def _execute(self, request, addr):
        '''Receives incoming request and runs callback

        :param request: decoded request message
        :param addr: tuple of source of datagram
        '''
        ip, port = addr
        _logger.debug('Modbus message from [%s:%s]: %s' % (ip, port, request))
        if self._modbusCallback:
            ipArray = map(int, ip.split('.'))
            typ, address, values = parseModbusRequest(request)
            self._modbusCallback(ipArray, typ, address, values)


def server(callback):
    modbusProto = config.get('modbusProto')
    modbusPort = int(config.get('modbusPort'))
    if modbusProto == 'TCP':
        server = ModbusServerFactory(callback)
        reactor.listenTCP(modbusPort, server)
        _logger.debug('Listening on TCP port %d' % modbusPort)
    elif modbusProto == 'UDP':
        proto = ModbusUdpProtocol(callback)
        reactor.listenUDP(modbusPort, proto)
        _logger.debug('Listening on UDP port %d' % modbusPort)
    else:
        raise 'Unknown Modbus protocol: %s' % modbusProto

#
# For some background info, see:
#   https://twistedmatrix.com/documents/current/core/howto/udp.html
#   http://stackoverflow.com/questions/21770219/twisted-python-udp-broadcast-simple-echo-server
#   http://serverfault.com/questions/421373/can-i-test-broadcast-packets-on-a-single-machine
#   http://jdimpson.livejournal.com/6812.html
#
