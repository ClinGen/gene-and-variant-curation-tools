import React from "react";
import PropTypes from "prop-types";


export const ExternalLink = ({ href, children, asButton, ...props }) => {
  return <a href={href} className={`${asButton ? 'btn btn-primary' : ''} ${props.className}`} target="_blank" rel="noopener noreferrer" {...props} >{children}</a>
}
ExternalLink.propTypes = {
  href: PropTypes.string
}
