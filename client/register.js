const {connect} = ReactRedux;
const {Button, Checkbox} = ReactBootstrap;

class EditBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {editing: false};
    this._canBlur = false;
  }

  render() {
    if (!this.state.editing) {
      return <b onClick={this._onClick.bind(this)}>{this.props.value}</b>;
    } else {
      return <input type='number' defaultValue={this.props.value}
                    onKeyUp={this._onKeyUp.bind(this)} onBlur={this._onBlur.bind(this)}
                    style={{width: 45, margin: 0, padding: 2, border: '1px solid #ccc', borderRadius: 2}}
                    ref='input' />
    }
  }

  componentDidUpdate() {
    this.refs.input && this.refs.input.focus(); // focus input when rendered
    this._canBlur = true;
  }

  _onClick(e) {
    this.setState({editing: true});
    this._canBlur = false;
  }

  _onApply(e) {
    if (this.props.onChange) {
      this.props.onChange(e.target.value, e);
    }
    this.setState({editing: false});
  }

  _onCancel(e) {
    this.setState({editing: false});
  }

  _onKeyUp(e) {
    if (e.keyCode === 13) { // enter
      this._onApply(e);
    } else if (e.keyCode === 27) { // escape
      this._onCancel(e);
    }
  }

  _onBlur(e) {
    // there can also be a blur event before it's focused
    if (this._canBlur) { this._onApply(e); }
  }
}
EditBox.propTypes = {
  onChange: React.PropTypes.func,
  value: React.PropTypes.string.isRequired,
};

/*
 * Component: RegisterValue
 */
const RegisterValue = ({value, type, format, bits, onChange, ...props}) => {
  const readonly = !['hreg', 'coil'].includes(type);
  const parts = splitValue(value, bits);
  const showPre = s => <span style={{color: '#aaa'}}>{s}</span>;
  const change = (newValue, i) => (onChange && !readonly) ? onChange(combineValue(value, bits, newValue, i)) : null;
  let useSep = true;
  let showPart = e => e;

  if (format === 'hex') {
    showPart = (v,i) => <span key={i}>{showPre('0x')}<EditBox value={v.toString(16)} onChange={v => change(parseInt(v, 16), i)} /></span>;
  } else if (format === 'dec') {
    showPart = (v,i) => <span key={i}><EditBox value={v.toString(10)} onChange={v => change(parseInt(v, 10), i)}/></span>;
  } else if (format === 'oct') {
    showPart = (v,i) => <span key={i}>{showPre('0')}<EditBox value={v.toString(8)} onChange={v => change(parseInt(v, 8), i)} /></span>;
  } else if (format === 'bool') {
    showPart = (v,i) => <input key={i} type='checkbox' checked={!!v} disabled={readonly} onChange={() => change(v ? 0 : 1, i)} />;
    useSep = false;
  } else if (format === 'btn') {
    showPart = (v,i) => <Button key={i} active={!!v} disabled={readonly} bsSize='xsmall' style={{verticalAlign: 'top', lineHeight: 1.4}}
                                onClick={() => change(v ? 0 : 1, i)}>⦾</Button>;
    useSep = false;
  } else if (format === 'cmdbtn') {
    showPart = (v,i) => <Button key={i} disabled={readonly} bsSize='xsmall' style={{verticalAlign: 'top', lineHeight: 1.4}}
                                onClick={() => change(1, i)}>⦿</Button>;
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
  format: React.PropTypes.oneOf(['hex', 'dec', 'oct', 'bool', 'btn', 'cmdbtn', 'char']).isRequired,
  bits: React.PropTypes.oneOf([1, 2, 4, 8, 16]).isRequired,
  onChange: React.PropTypes.func,
};

// 'exports'
window.RegisterValue = RegisterValue;
