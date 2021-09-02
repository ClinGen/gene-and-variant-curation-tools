/**
 * Variant reducer Redux
 * returns Variant Object
 */
const initialState = {
    clinVarVariantTitle: "",
    clinvarVariantId: "",
    variationType: "",
    otherNameList: [],
    hgvsNames: null,
    molecularConsequenceList: [{}],
    carId: "",
    dbSNPIds: [],
    PK: ""
}

const variant = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_VARIANT':
            return action.variant
        default:
            return state
    }
}

export default variant

