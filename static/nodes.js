const {connect} = ReactRedux;
const {Panel, PanelGroup} = ReactBootstrap;

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
        :)
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
