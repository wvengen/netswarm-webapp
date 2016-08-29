const {connect} = ReactRedux;
const {Col, ControlLabel, Button, Form, FormControl, FormGroup, Glyphicon, InputGroup, Modal, Radio} = ReactBootstrap;

const FormControlIPByte = (props) => (
  <FormControl type='number' min={0} max={255} {...props} />
);

/*
 * Container: SettingsFormContainer
 */
class SettingsForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ipStart: props.ipStart,
      nDevices: props.nDevices,
      modbusProto: props.modbusProto,
    };
  }

  render() {
    return (
      <Form horizontal>
        <FormGroup controlId='ipStart'>
          <Col componentClass={ControlLabel} sm={4}>
            IP start address
          </Col>
          <Col sm={8}>
            <InputGroup>
              <FormControlIPByte value={this.state.ipStart[0]} onChange={this._onIpChange.bind(this, 0)} />
              <InputGroup.Addon>.</InputGroup.Addon>
              <FormControlIPByte value={this.state.ipStart[1]} onChange={this._onIpChange.bind(this, 1)} />
              <InputGroup.Addon>.</InputGroup.Addon>
              <FormControlIPByte value={this.state.ipStart[2]} onChange={this._onIpChange.bind(this, 2)} />
              <InputGroup.Addon>.</InputGroup.Addon>
              <FormControlIPByte value={this.state.ipStart[3]} onChange={this._onIpChange.bind(this, 3)} />
            </InputGroup>
          </Col>
        </FormGroup>
        <FormGroup controlId='nDevices'>
          <Col componentClass={ControlLabel} sm={4}>
            Number of devices
          </Col>
          <Col sm={8}>
            <FormControl type='number' value={this.state.nDevices}
                         min={1} max={255 - this.state.ipStart[3]}
                         onChange={e => this.setState({nDevices: parseInt(e.target.value)})} />
          </Col>
        </FormGroup>
        <FormGroup controlId='modbusProto'>
          <Col componentClass={ControlLabel} sm={4}>
            Modbus protocol
          </Col>
          <Col sm={8}>
            <Radio checked={this.state.modbusProto === 'UDP'} value='UDP' onChange={e => this.setState({modbusProto: 'UDP'})} inline>UDP</Radio>
            <Radio checked={this.state.modbusProto === 'TCP'} value='TCP' onChange={e => this.setState({modbusProto: 'TCP'})} inline>TCP</Radio>
          </Col>
        </FormGroup>
      </Form>
    );
  }

  _onIpChange(idx, e) {
    const v = e.target.value;
    const {ipStart} = this.state;
    const newIpStart = ipStart.slice(0, idx).concat([parseInt(v)]).concat(ipStart.slice(idx+1));
    this.setState({ipStart: newIpStart});
  }

  apply() {
    this.props.dispatch(updateConfig(this.state));
  }
}
const SettingsFormContainer = connect(
  ({config}) => ({...config}), null, null, {withRef: true}
)(SettingsForm);
// propagate {#apply} to component
SettingsFormContainer.prototype.apply = function() {
  return this.getWrappedInstance().apply();
};

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
            <SettingsFormContainer ref='form' />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.close.bind(this)}>Cancel</Button>
            <Button onClick={this._onSubmit.bind(this)} bsStyle='primary'>Ok</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }

  _onSubmit() {
    this.refs.form.apply();
    this.close();
  }
}

// 'exports'
window.SettingsButton = SettingsButton;
