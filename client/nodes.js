const {connect} = ReactRedux;
const {Panel, PanelGroup} = ReactBootstrap;

/*
 * Component: NodeRegisters
 */
const NodeRegisters = ({registers, config, onChange}) => {
  return (
    <div>
      {Object.entries(registers).map(([idx, val]) => (
        <div key={idx} style={{display: 'inline-block', textAlign: 'right', width: 220, padding: '6px 12px', border: '1px solid #ddd'}}>
          <span style={{float: 'left', textAlign: 'left'}}>
            {registerLabel(config, idx)}
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
  ({modbus}) => ({nodeIds: Object.keys(modbus)})
)(NodePanelList);

// 'exports'
window.NodePanelListContainer = NodePanelListContainer;
