const {connect} = ReactRedux;
const {Button, Glyphicon, Navbar, OverlayTrigger, Panel, PanelGroup, Tooltip} = ReactBootstrap;

/*
 * Container: NodePanel
 */
class NodePanel extends React.Component {
  render() {
    const {eventKey, node, nodeId} = this.props;
    const title = (
      <div style={{textAlign: 'center'}}>
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
      <Panel eventKey={eventKey} header={title}>
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

/*
 * Container: StatusLightContainer
 */
const statusLightColors = {
  'offline':      'grey',
  'connecting':   'orange',
  'connected':    'green',
  'disconnected': 'red',
};
class StatusLight extends React.Component {
  render() {
    const color = statusLightColors[this.props.connected] || 'lightgrey';
    const overlay = (
      <Tooltip id='tooltip-connection' style={{textTransform: 'capitalize'}}>
        {this.props.connected || 'unknown'}
      </Tooltip>
    );
    return (
      <OverlayTrigger placement='bottom' overlay={overlay}>
        <span style={{color: color}}>&#x2B24;</span>
      </OverlayTrigger>
    );
  }
}
const StatusLightContainer = connect(
  ({status: {connected}}) => ({connected})
)(StatusLight);


/*
 * Component: Layout
 */
const Layout = ({children}) => (
  <div>
    <Navbar>
      <Navbar.Header>
        <Navbar.Brand>NetSwarm</Navbar.Brand>
      </Navbar.Header>
      <Navbar.Form pullRight>
        <SettingsButton />
      </Navbar.Form>
      <Navbar.Text pullRight style={{marginTop: 12}}>
        <StatusLightContainer />
      </Navbar.Text>
    </Navbar>
    <div className='container'>
      {children}
    </div>
  </div>
);

/*
 * Component: App
 */
class App extends React.Component {
  render() {
    return (
      <Layout>
        <NodePanelListContainer />
      </Layout>
    );
  }
}

/*
 * Render App on page
 */
ReactDOM.render(
  <ReactRedux.Provider store={store}>
    <App />
  </ReactRedux.Provider>,
  document.getElementById('app')
);
