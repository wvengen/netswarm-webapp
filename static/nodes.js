const {connect} = ReactRedux;
const {Button, Checkbox, Panel, PanelGroup, Table} = ReactBootstrap;

/*
 * Component: RegisterValue
 */
const RegisterValue = ({value, type, format, bits, onChange, ...props}) => {
  const readonly = !['hreg', 'coil'].includes(type);
  const parts = splitValue(value, bits);
  const showPre = s => <span style={{color: '#aaa'}}>{s}</span>;
  const change = (newValue, i) => (onChange && !readonly) ? onChange(combineValue(newValue, bits, value, i)) : null;
  let useSep = true;
  let showPart = e => e;

  if (format === 'hex') {
    showPart = (v,i) => <span key={i}>{showPre('0x')}<b>{v.toString(16)}</b></span>;
  } else if (format === 'dec') {
    showPart = (v,i) => <span key={i}><b>{v.toString(10)}</b></span>;
  } else if (format === 'oct') {
    showPart = (v,i) => <span key={i}>{showPre('0')}<b>{v.toString(8)}</b></span>;
  } else if (format === 'bool') {
    showPart = (v,i) => <input key={i} type='checkbox' checked={!!v} disabled={readonly}
                               onChange={change(v ? 0 : 1, i)} />;
    useSep = false;
  } else if (format === 'btn') {
    showPart = (v,i) => <Button key={i} active={!!v} disabled={readonly} bsSize='xsmall' style={{verticalAlign: 'top', lineHeight: 1.4}}
                                onClick={() => change(v ? 0 : 1, i)}>●</Button>;
    useSep = false;
  } else if (format === 'char') {
    // background color to show something for invisible characters
    showPart = (v,i) => <tt key={i} style={{backgroundColor: '#eee', width: '1ch', display: 'inline-block', fontWeight: 'bold'}}>{String.fromCharCode(v)}</tt>;
    useSep = false;
  } else {
    console.log('Invalid register format: ', format);
  }

  return (
    <span {...props}>{parts.map(showPart).reduce((r, part, i) => (
      r.concat((r.length && useSep) > 0 ? [<span key={[i, 'sep']}>, </span>, part] : [part])
    ), [])}</span>
  );
}
// return array of value split by bits (most significant first)
function splitValue(value, bits) {
  const mask = Math.pow(2, bits) - 1;
  return Array.from(Array(16 / bits)).map((_, i) => (
    (value >> (i * bits)) & mask
  )).reverse();
}
// put updated split value back into the full-width value
function combineValue(value, bits, newValue, index) {
  const mask = Math.pow(2, bits) - 1;
  const cleanValue = value & ~(mask << (16 - (index + 1) * bits));
  return cleanValue | (newValue << (16 - (index + 1) * bits));
}
RegisterValue.defaultProps = {
  type: 'hreg',
  format: 'dec',
  bits: 16,
};
RegisterValue.propTypes = {
  type: React.PropTypes.oneOf(['hreg', 'coil']).isRequired,
  format: React.PropTypes.oneOf(['hex', 'dec', 'oct', 'bool', 'btn', 'char']).isRequired,
  bits: React.PropTypes.oneOf([1, 2, 4, 8, 16]).isRequired,
  onChange: React.PropTypes.func,
};

/*
 * Component: NodeRegisters
 */
const NodeRegisters = ({registers, config, onChange}) => {
  return (
    <div>
      {Object.entries(registers).map(([idx, val]) => (
        <div key={idx} style={{display: 'inline-block', textAlign: 'right', width: 220, padding: '6px 12px', border: '1px solid #ddd'}}>
          <span style={{float: 'left', textAlign: 'left'}}>
            {config[idx] && config[idx].label
              ? config[idx].label
              : `Address ${idx}`
            }
          </span>
          <RegisterValue value={val} {...config[idx]} onChange={val => onChange ? onChange(idx, val) : null} />
        </div>
      ))}
    </div>
  );
};

/*
 * Component: NodePanelContents
 */
const NodePanelContents = ({node, config, onChangeRegister}) => (
  <NodeRegisters registers={node.registers} config={config} onChange={onChangeRegister} />
);

/*
 * Container: NodePanelContainer
 */
class NodePanel extends React.Component {
  render() {
    const {config, node, nodeId, dispatch, ...props} = this.props;
    const title = (
      <div style={{textAlign: 'center', cursor: 'pointer'}}>
        <div className='pull-left'>
          <strong style={{marginRight: '.6em'}}>ID</strong>
          <tt>{nodeId}</tt>
        </div>
        <div className='pull-right'>
          <strong style={{marginRight: '.6em'}}>Last seen</strong>
          <div style={{display: 'inline-block', textAlign: 'center', width: '4em'}}>
            {node.lastSeen
              ? moment(node.lastSeen).format('HH:mm:ss')
              : <i>never</i>
              }
          </div>
        </div>
        <div>
          <strong style={{marginRight: '.6em'}}>IP</strong>&nbsp;
          <tt>{ipAddrBytes(node).join('.')}</tt>
        </div>
      </div>
    );
    return (
      <Panel header={title} {...props}>
        <NodePanelContents node={node} config={config} onChangeRegister={this._onChangeRegister.bind(this)} />
      </Panel>
    );
  }

  _onChangeRegister(idx, value) {
    const {node, nodeId, config} = this.props;
    const {type} = config[idx];
    this.props.dispatch(modbusWrite(nodeId, type, idx, value));
  }
}
const NodePanelContainer = connect(
  ({modbus, config: {ipStart, registers}}, {nodeId}) => ({node: modbus[nodeId] || {}, config: registers})
)(NodePanel);

/*
 * Container: NodePanelListContainer
 */
class NodePanelList extends React.Component {
  render() {
    const {nodeIds} = this.props;
    return (
      <PanelGroup defaultActiveKey={nodeIds[0]} accordion>
        {nodeIds.map(id => (
           <NodePanelContainer key={id} eventKey={id} nodeId={id} />
        ))}
      </PanelGroup>
    );
  }
}
NodePanelList.propTypes = {
  nodeIds: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
};
const NodePanelListContainer = connect(
  ({modbus}) => ({nodeIds: Object.keys(modbus).map(i => parseInt(i))})
)(NodePanelList);

// 'exports'
window.NodePanelListContainer = NodePanelListContainer;
