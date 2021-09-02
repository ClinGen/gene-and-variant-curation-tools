import React, { useState } from 'react';
import PropTypes from 'prop-types'
import { Alert as BootstrapAlert } from "react-bootstrap";

const Alert = ({
  value,
  children,
  dismissible,
  type = 'danger',
  heading,
  name,
  className
}) => {
  const [show, setShow] = useState(true);
  if (children || value) {
    return (
      <BootstrapAlert
        show={show}
        variant={type}
        id={name}
        className={className}
        dismissible={dismissible}
        onClose={() => setShow(false)}
      >
        {heading ? <BootstrapAlert.Heading>{heading}</BootstrapAlert.Heading> : null}
        {children
          ? children
          : <div dangerouslySetInnerHTML={{ __html: value }}/>
        }
      </BootstrapAlert>    
    );
  }
};


Alert.propTypes = {
  // a string that contains html for additional stylings
  // alternatively, you can also use children to render the alert content
  value: PropTypes.string,

  heading: PropTypes.string
}
export default Alert;