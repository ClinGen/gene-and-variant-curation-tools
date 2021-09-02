import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";


// A flexible, re-usable panel component
const CardPanel = ({
    title,
    subtitle,
    children,
    link,
    panelMarginClass = "mb-4",
    label,
    badge,
    bodyClass = '',
    labelClass,
    renderHeaderTail,
    className = '',
    accordion = false,
    open = false
}) => {

  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(open);
  }, []);


  const handleClick = (e) => {
    e.preventDefault(); // Prevent auto-scroll to top on state change
    if (accordion) {
      setShow(!show);
    }
  }

  const newBodyClass = ((accordion && !show) ? "card-closed " : "") + bodyClass;
  const showIcon = show ? <FontAwesomeIcon icon={faChevronUp}/> : <FontAwesomeIcon icon={faChevronDown}/>;

  return (
    <div className={`card card-panel ${panelMarginClass} ${className}`}>
      <div className="card-header">
        <h4 className="m-0">
          {label && (
            <span
              className={`badge ${
                labelClass ? `badge-${labelClass}` : "badge-info"
              } mr-3`}
            >
              {label}
            </span>
          )}
          {React.isValidElement(title) ? (
            title
          ) : (
            <span
              dangerouslySetInnerHTML={{ __html: title }}
              className={`title ${labelClass}`}
            />
          )}
          {/* align right items */}
          {badge && (
            <span className="badge badge-warning align-end">{badge}</span>
          )}
          {React.isValidElement(renderHeaderTail) ? (
            <div className="align-end">{renderHeaderTail}</div>
          ) : null}
          {accordion ? (
            <div className="align-end">
              <a href="#" onClick={handleClick}>{showIcon}</a>
            </div>
          ) : null}
        </h4>
      </div>
      <div className={`card-body ${newBodyClass}`}>
        {subtitle && <h5 className="card-title">{subtitle}</h5>}
        <div className="card-text">{children}</div>
        {link && (
          <a href={link.url} className="btn btn-primary">
            {link.label}
          </a>
        )}
      </div>
    </div>
  );
}

CardPanel.propTypes = {
  panelMarginClass: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  subtitle: PropTypes.string,
  link: PropTypes.shape({
    url: PropTypes.string,
    label: PropTypes.string,
  }),
  label: PropTypes.string,
  badge: PropTypes.string,
  labelClass: PropTypes.string,
  renderHeaderTail: PropTypes.element,
  accordion: PropTypes.bool, // true if an accordion card panel
  open: PropTypes.bool, // true if accordion card panel should default to open
};
export default CardPanel;
