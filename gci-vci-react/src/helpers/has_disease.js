/**
 * If a user wants to publish to the ERepo, there needs to be a disease
 * associated with their interpretation. This helper function determines whether
 * a disease is associated with an interpretation.
 *
 * For background on this, see this issue:
 * https://github.com/ClinGen/gene-and-variant-curation-tools/issues/273
 *
 * @author Liam Mulhall
 * @param {Object} interpretation - should contain disease
 * @returns {Boolean} - whether the interpretation has a disease assoc. with it
 */
const hasDisease = interpretation => {
    return interpretation?.disease !== undefined
           && interpretation?.disease !== null
           && typeof interpretation?.disease === 'object'
           && Object.keys(interpretation?.disease).length > 0;
};

export default hasDisease;
