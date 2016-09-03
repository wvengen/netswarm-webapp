const {connect} = ReactRedux;
const {Button, Glyphicon, Navbar, OverlayTrigger, Tooltip} = ReactBootstrap;

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
