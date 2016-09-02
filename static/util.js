
// return 4 IP address bytes from node data
function ipAddrBytes(node) {
  return [node.registers[0] >> 8, node.registers[0] & 0xff, node.registers[1] >> 8, node.registers[1] & 0xff];
}

function nodeId2Ip(ipStart, nodeId) {
  if (String(~~Number(nodeId)) === String(nodeId)) { // @todo make sure numbers are never strings and use `typeof(nodeId)`
    // if number, convert to IP
    return ipStart.slice(0, 3).concat([ipStart[3] + Number(nodeId)]);
  } else {
    // otherwise it's a string which is the IP address directly
    return nodeId.split('.').map(s => parseInt(s));
  }
}

function ip2NodeId(ipStart, ip) {
  if (ipStart[0] === ip[0] && ipStart[1] === ip[1] && ipStart[2] === ip[2]) {
    // within range, return number
    return ip[3] - ipStart[3];
  } else {
    // outside of range, return ip address as string
    return ip.join('.');
  }
}

// 'exports'
window.ipAddrBytes = ipAddrBytes;
window.nodeId2Ip = nodeId2Ip;
window.ip2NodeId = ip2NodeId;
