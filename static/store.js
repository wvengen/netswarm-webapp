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
 * Config
 */
// update config on server
function updateConfig(config) {
  return () => {
    socket.emit('updateConfig', config);
  };
}
// update config in webapp when it was updated on the server
function updateLocalConfig(config) {
  return (dispatch, getState) => {
    const ipStart = config.ipStart || getState().config.ipStart;
    const nDevices = config.nDevices || getState().config.nDevices;
    const registers = config.registers || getState().config.registers;
    dispatch({type: 'updateLocalConfig', config});
    dispatch(updateNodes(ipStart, nDevices, registers));
  };
}
socket.on('config', config => {
  store.dispatch(updateLocalConfig(config));
});
reducers.config = (state = {}, action) => {
  switch(action.type) {
  case 'updateLocalConfig':
    return {...state, ...action.config};
  default:
    return state;
  }
};
// 'exports'
window.updateConfig = updateConfig;

/*
 * Modbus
 */
function modbusRead(ip, type, offset, count) {
  socket.emit('read', {type, ip, offset, count});
}
function modbusWrite(ip, type, offset, value) {
  socket.emit('write', {type, ip, offset, values: typeof(value) === 'number' ? [value] : value});
}
function updateRegister(nodeId, ip, offset, value) {
  // @todo see if we can get rid of getState() here, it could be called a lot and is triggered rarely
  return (dispatch, getState) => {
    const {config: {registers}} = getState();
    dispatch({type: 'updateModbusRegister', nodeId, offset, value, registers});
  };
}
function updateNodes(ipStart, nDevices, registers) {
  return {type: 'updateNodes', ipStart, nDevices, registers};
}

function handleModbusResponse(rw, type, ip, offset, value, error) {
  if (!error) {
    const nodeId = ip[3] - store.getState().config.ipStart[3];
    value.forEach(v => {
      store.dispatch(updateRegister(nodeId, ip, offset, v));
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
    const oldNodeData = state[nodeId] || newModbusNodeState(nodeId, action.ip, action.registers);
    const newRegisters = {...oldNodeData.registers, [action.offset]: action.value};
    const newNodeData = {...oldNodeData, lastSeen: now, registers: newRegisters};
    return {...state, [nodeId]: newNodeData};
  case 'updateNodes':
    const ids = Array.from(Array(action.nDevices).keys());
    return ids.reduce((r, nodeId) => {
      let newNodeData = state[nodeId];
      if (!newNodeData) {
        const ip = action.ipStart.slice(0, 3).concat([action.ipStart[3] + nodeId]);
        newNodeData = newModbusNodeState(nodeId, ip, action.registers);
      }
      return {...r, [nodeId]: newNodeData};
    }, {});
  default:
    return state;
  }
};
function newModbusNodeState(nodeId, ip, registerConfig) {
  let registers = {};

  // get default registers from config, but ip address is a given
  Object.keys(registerConfig).forEach(k => { registers[k] = null; } );
  registers[0] = (ip[0] << 8) + ip[1];
  registers[1] = (ip[2] << 8) + ip[3];

  return {
    lastSeen: null,
    nodeId,
    registers
  };
}

// 'exports'
window.modbusRead = modbusRead;
window.modbusWrite = modbusWrite;
window.updateNodes = updateNodes;


/*
 * Store
 */
const createStoreWithMiddleware = Redux.applyMiddleware(ReduxThunk.default, reduxLogger())(Redux.createStore);
const store = createStoreWithMiddleware(Redux.combineReducers(reducers));
// 'exports'
window.store = store;
