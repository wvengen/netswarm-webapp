const {connect} = ReactRedux;
const {Panel, PanelGroup, Table} = ReactBootstrap;

/*
 * Component: NodeRegisters
 */
const NodeRegisters = ({registers}) => {
  return (
    <div>
      {Object.entries(registers).map(([idx, val]) => (
        <div key={idx} style={{display: 'inline-block', textAlign: 'right', width: 250, padding: '6px 12px', border: '1px solid #ddd'}}>
          <span style={{float: 'left', textAlign: 'left', width: 100}}>Address {idx}</span>
          <b>{val}</b>
        </div>
      ))}
    </div>
  );
};

/*
 * Component: NodePanelContents
 */
const NodePanelContents = ({node}) => (
  <NodeRegisters registers={node.registers} />
);

/*
 * Container: NodePanelContainer
 */
class NodePanel extends React.Component {
  render() {
    const {node, nodeId, dispatch, ...props} = this.props;
    const title = (
      <div style={{textAlign: 'center', cursor: 'pointer'}}>
        <div className='pull-left'>
          <strong style={{marginRight: '.6em'}}>ID</strong>
          <tt>{nodeId}</tt>
        </div>
        <div className='pull-right'>
          <strong style={{marginRight: '.6em'}}>Last seen</strong>
          {node.lastSeen
            ? moment(node.lastSeen).format('HH:mm:SS')
            : <i>never</i>
            }
        </div>
        <div>
          <strong style={{marginRight: '.6em'}}>IP</strong>&nbsp;
          <tt>{ipAddrBytes(node).join('.')}</tt>
        </div>
      </div>
    );
    return (
      <Panel header={title} {...props}>
        <NodePanelContents node={node} />
      </Panel>
    );
  }
}
const NodePanelContainer = connect(
  ({modbus}, {nodeId}) => ({node: modbus[nodeId] || {}})
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
const NodePanelListContainer = connect(
  ({modbus}) => ({nodeIds: Object.keys(modbus)})
)(NodePanelList);

// 'exports'
window.NodePanelListContainer = NodePanelListContainer;
