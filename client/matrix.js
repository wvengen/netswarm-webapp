const {connect} = ReactRedux;
const {Button, Checkbox, Panel, PanelGroup, Table} = ReactBootstrap;

class Matrix extends React.Component {
  render() {
    return <div>hi :)</div>;
  }
}
Matrix.propTypes = {
  nodeIds: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
};

const MatrixContainer = connect(
  ({modbus}) => ({nodeIds: Object.keys(modbus)})
)(Matrix);

// 'exports'
window.MatrixContainer = MatrixContainer;
