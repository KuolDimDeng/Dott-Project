import * as React from 'react';
import PropTypes from 'prop-types';

function Title(props) {
  return (
    <h2 className="text-lg font-medium text-indigo-600 mb-2">
      {props.children}
    </h2>
  );
}

Title.propTypes = {
  children: PropTypes.node,
};

export default Title;
