
// return 4 IP address bytes from node data
function ipAddrBytes(node) {
  return [node.registers[0] >> 8, node.registers[0] & 0xff, node.registers[1] >> 8, node.registers[1] & 0xff];
}

// 'exports'
window.ipAddrBytes = ipAddrBytes;
