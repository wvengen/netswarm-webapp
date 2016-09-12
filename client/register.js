const {connect} = ReactRedux;
const {Button, Checkbox} = ReactBootstrap;

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
