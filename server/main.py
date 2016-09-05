import os
import signal
from twisted.internet import reactor, error
from twisted.web.static import File
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource

from config import config
from websocket import sio, pushRead
import modbus_server

import logging
_logger = logging.getLogger(__name__)
## Uncomment to get debug logging
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)

#
# Setup and run webserver
#
def main(port):
    # load initial configuration
    config.load()

    # first make sure we can use ctrl-c
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, signal_handler)

    # static files
    path = os.path.join(os.path.dirname(__file__), '..', 'client')
    root = File(path)

    # add socket.io as wsgi app
    #   allows combining socketio with twisted so we can use async with pymodbus
    wsApp = sio.handle_request
    wsResource = WSGIResource(reactor, reactor.getThreadPool(), wsApp)
    root.putChild('socket.io', wsResource)

    # go
    site = Site(root)
    reactor.listenTCP(port, site)
    try:
        modbus_server.server(pushRead)
    except error.CannotListenError, e:
        _logger.warn('Continuing without Modbus server: %s' % e)
    reactor.run()

def signal_handler(*args):
    print("Killed by user")
    # @todo somehow this isn't always enough ...
    reactor.stop()
