const {connect} = ReactRedux;
const {Button, Glyphicon, Modal, Navbar, OverlayTrigger, Panel, PanelGroup, Tooltip} = ReactBootstrap;

// return 4 IP address bytes from node data
function ipAddrBytes(node) {
  return [node.registers[0] >> 8, node.registers[0] & 0xff, node.registers[1] >> 8, node.registers[1] & 0xff];
}

/*
 * Container: NodePanel
 */
class NodePanel extends React.Component {
  render() {
    const title = (
      <div style={{textAlign: 'center'}}>
        <div className='pull-left'>
          <strong style={{marginRight: '.6em'}}>ID</strong>
          <tt>{this.props.nodeId}</tt>
        </div>
        <div className='pull-right'>
          <strong style={{marginRight: '.6em'}}>State</strong>
          <i>unknown</i>
        </div>
        <div>
          <strong style={{marginRight: '.6em'}}>IP</strong>&nbsp;
          <tt>{ipAddrBytes(this.props.node).join('.')}</tt>
        </div>
      </div>
    );
    return (
      <Panel eventKey={this.props.eventKey} header={title}>
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
 * Component: SettingsButton
 */
class SettingsButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {showModal: false};
  }

  open() {
    this.setState({showModal: true});
  }
  
  close() {
    this.setState({showModal: false});
  }

  render() {
    return (
      <div>
        <Button type='submit' onClick={this.open.bind(this)}>
          <Glyphicon glyph='cog' />
        </Button>
        <Modal show={this.state.showModal} onHide={this.close.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Settings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>@todo</p>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.close.bind(this)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

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
