const socket = io(location.origin);
let reducers = {};

/*
 * Status
 */
function updateConnected(state) {
  return {type: 'setConnected', state};
}
socket.on('connect', () => {
  store.dispatch(updateConnected('connecting'));
});
socket.on('disconnect', () => {
  store.dispatch(updateConnected('offline'));
});
socket.on('status', ({connected}) => {
  store.dispatch(updateConnected(connected ? 'connected' : 'disconnected'));
});

const initialStatusState = {
  connected: 'offline',
  ipStart: [192, 168, 1, 177],
  nDevices: 1,
};
reducers.status = (state = initialStatusState, action) => {
  switch(action.type) {
  case 'setConnected':
    return {...state, connected: action.state};
  default:
    return state;
  }
};


/*
 * Modbus
 */
function modbusRead(ip, type, offset, count) {
  socket.emit('read', {type, ip: ip.join('.'), offset, count});
}
function modbusWrite(ip, type, offset, value) {
  socket.emit('write', {type, ip: ip.join('.'), offset, values: typeof(value) === 'number' ? [value] : value});
}
function updateRegister(nodeId, ip, offset, value) {
  return {type: 'updateModbusRegister', nodeId, ip, offset, value};
}
window.modbusRead = modbusRead;
window.modbusWrite = modbusWrite;

function handleModbusResponse(rw, type, ip, offset, value, error) {
  if (!error) {
    const ipa = ip.split('.').map(s => parseInt(s));
    const nodeId = ipa[3] - store.getState().status.ipStart[3];
    value.forEach(v => {
      store.dispatch(updateRegister(nodeId, ipa, offset, v));
    });
  } else {
    // @todo handle errors
  }
}
socket.on('readResponse', ({type, ip, offset, value, error}) => {
  handleModbusResponse('read', type, ip, offset, value, error);
});
socket.on('writeResponse', ({type, ip, offset, value, error}) => {
  handleModbusResponse('write', type, ip, offset, value, error);
});

const initialModbusState = {};
reducers.modbus = (state = initialModbusState, action) => {
  // @todo handle responses
  switch(action.type) {
  case 'updateModbusRegister':
    const nodeId = action.nodeId;
    const now = new Date().getTime();
    const oldNodeData = state[nodeId] || newModbusNodeState(nodeId, action.ip);
    const newRegisters = {...oldNodeData.registers, [action.offset]: action.value};
    const newNodeData = {...oldNodeData, lastSeen: now, registers: newRegisters};
    return {...state, [nodeId]: newNodeData};
  default:
    return state;
  }
};
function newModbusNodeState(nodeId, ip) {
  return {
    lastSeen: null,
    nodeId,
    registers: [
      (ip[0] << 8) + ip[1],
      (ip[2] << 8) + ip[3],
    ]
  };
}


/*
 * Store
 */
const createStoreWithMiddleware = Redux.applyMiddleware(ReduxThunk.default, reduxLogger())(Redux.createStore);
window.store = createStoreWithMiddleware(Redux.combineReducers(reducers));
