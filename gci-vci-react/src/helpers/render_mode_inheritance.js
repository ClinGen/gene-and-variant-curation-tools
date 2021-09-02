import React from 'react';
import { EXTERNAL_API_MAP } from '../constants/externalApis';

/**
 * Method to display either mode of inheritance with adjective,
 * or just mode of inheritance if no adjective
 * @param {object} object - A GDM or Interpretation object
 */
export function renderSelectedModeInheritance(object) {
    let moi = '', moiAdjective = '';

    if (object && object.modeInheritance) {
        moi = object.modeInheritance;
        if (object.modeInheritanceAdjective) {
            moiAdjective = object.modeInheritanceAdjective;
        }
    }
    return (
        <span>{moi && moi.length ? renderModeInheritanceLink(moi, moiAdjective) : 'None'}</span>
    );
}

/**
 * Method to construct mode of inheritance linkout
 */
export function renderModeInheritanceLink(modeInheritance, modeInheritanceAdjective) {
    if (modeInheritance) {
        let start = modeInheritance.indexOf('(');
        let end = modeInheritance.indexOf(')');
        let hpoNumber;
        let adjective = modeInheritanceAdjective && modeInheritanceAdjective.length ? ' (' + modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] + ')' : '';
        if (start && end) {
            hpoNumber = modeInheritance.substring(start+1, end);
        }
        if (hpoNumber && hpoNumber.indexOf('HP:') > -1) {
            let hpoLink = EXTERNAL_API_MAP['HPO'] + hpoNumber;
            return (
                <span><a href={hpoLink} target="_blank" rel="noopener noreferrer">{modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1]}</a>{adjective}</span>
            );
        } else {
            return (
                <span>{modeInheritance + adjective}</span>
            );
        }
    }
}
