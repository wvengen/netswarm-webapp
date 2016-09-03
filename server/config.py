import os
import json
from UserDict import UserDict

class Config(UserDict):

    # configuration file
    filename = os.path.join(os.path.dirname(__file__), '..', 'config.json')

    # default configuration
    default = {
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

    def __init__(self):
        UserDict.__init__(self, self.default)

    def load(self, filename = None):
        if not filename: filename = self.filename
        if os.path.exists(filename):
            with open(filename) as f:
                self.data.update(json.load(f))
            return True
        else:
            return False

    def save(self, filename = None):
        if not filename: filename = self.filename
        with open(filename, 'w') as f:
            json.dump(self.data, f, indent = 2)

# Single global instance
config = Config()
