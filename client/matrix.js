const {connect} = ReactRedux;
const {Table, Column, Cell} = FixedDataTable;

class Matrix extends React.Component {
  render() {
    const {nodes, config, containerWidth} = this.props;
    const registers = Object.keys(config);

    return (
      <Table rowsCount={nodes.length}
          rowHeight={35} headerHeight={35}
          width={containerWidth} height={nodes.length * 35 + 35 + 2}>
        <Column header={<div style={{padding: 8}}>ID</div>} cell={props => {
          const nodeId = nodes[props.rowIndex].nodeId;
          return (
            <Cell {...props}>
              {typeof(nodeId) === 'string'
                ? <span style={{fontSize: '60%'}}>{nodeId}</span>
                : nodeId}
            </Cell>
          );
        }} width={80} fixed={true} />
        {registers.map(addr => (
          <Column key={addr} header={<div style={{padding: 8}}>{registerLabel(config, addr)}</div>} cell={props => {
            const node = nodes[props.rowIndex];
            return (
              <Cell {...props}>{<RegisterValue value={node.registers[addr]} {...config[addr]} />}</Cell>
            );
          }} width={120} flexGrow={1} />
        ))}
      </Table>
    );
  }
}
Matrix.propTypes = {
  config: React.PropTypes.object.isRequired,
  nodes: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  // from ReactDimensions
  containerHeight: React.PropTypes.number.isRequired,
  containerWidth: React.PropTypes.number.isRequired,
};

const MatrixContainer = connect(
  ({modbus, config: {registers}}) => ({nodes: Object.values(modbus) || [], config: registers || {}})
)(ReactDimensions()(Matrix));

// 'exports'
window.MatrixContainer = MatrixContainer;
