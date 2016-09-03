#!/usr/bin/env python
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from main import main

# Allow to set HTTP server port in environment
PORT = os.getenv('PORT', 5000)

if __name__ == '__main__':
    main(PORT)
