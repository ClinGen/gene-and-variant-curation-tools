import React from 'react';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';

/**
 * This is a component that contains a info icon. A tooltip is shown when the
 * user hovers over the info icon. It is meant to be placed at the end of a
 * line of text, i.e. to the right of the text.
 *
 * @author Liam Mulhall
 * @param {String} tooltip - tooltip to display over the icon
 * @param {String} tooltipId - unique ID for the tooltip
 * @param {String} placement - tooltip placement
 */
const InfoIcon = ({tooltip = '', tooltipId = '', placement='top'}) => {
    const infoIconStyle = {
        color: '#007bff',
        marginLeft: '0.5em'
    };
    const tooltipJsx = <Tooltip id={tooltipId}>{tooltip}</Tooltip>;
    return (
        <OverlayTrigger placement={placement} overlay={tooltipJsx}>
            <div
                className='icon icon-info-circle'
                style={infoIconStyle}
            ></div>
        </OverlayTrigger>
    );
};

export default InfoIcon;
