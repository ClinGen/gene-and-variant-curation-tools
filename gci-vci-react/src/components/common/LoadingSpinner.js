import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

function LoadingSpinner({ text, ...props }) {
    const size = props.size || "3x";

    return (
        <div className={`${text ? 'mt-4' : ''} text-center`}>
            <div>{text ? text : null}</div>
            <div className={`${text ? 'mt-2' : ''} ${props.className}`}>
                <FontAwesomeIcon icon={faSpinner} size={size} spin />
            </div>
        </div>
    )
}
LoadingSpinner.propTypes = {
    text: PropTypes.string
}

export default LoadingSpinner;