import React from 'react';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
import warningIcon from '../../style/img/warning-icon.svg';

/**
 * This is a component that contains a warning icon. If a tooltip is supplied as
 * a prop, then the tooltip is shown when the user hovers over the warning icon.
 * A tooltip is optional, but if the dev wants a tooltip, they need to supply a
 * unique ID for the tooltip along with the tooltip itself.
 *
 * @author Liam Mulhall
 * @param {String} [tooltip] - tooltip to display over the icon
 * @param {String} [tooltipId] - unique ID for the tooltip
 */
const WarningIcon = ({tooltip = '', tooltipId = ''}) => {
    const warningIconStyle = {
        backgroundColor: 'orange',
        border: '1px solid black',
        borderRadius: '5%',
        margin: '2px',
        padding: '2px',
    };
    let warningIconJsx =
        <img
            alt='warning icon'
            src={warningIcon}
            style={warningIconStyle}
        ></img>;
    if (tooltip.length > 0 && tooltipId.length > 0) {
        const tooltipJsx = <Tooltip id={tooltipId}>{tooltip}</Tooltip>;
        warningIconJsx =
            <OverlayTrigger placement='top' overlay={tooltipJsx}>
                {warningIconJsx}
            </OverlayTrigger>;
    }
    return warningIconJsx;
};

export default WarningIcon;
