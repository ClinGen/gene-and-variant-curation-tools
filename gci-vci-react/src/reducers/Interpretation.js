/**
 * Interpretation reducer Redux
 * returns Interpretation Object
 */
const initialState = {
    affiliation: "", //Organization of the user
    date_created: null,
    item_type: "",
    last_modified: null,
    status: "",
    variant: null,
    population: "", //
    disease: "", //Sometimes available, otherwise empty/added later
    PK:"",
    evaluations:[],
    curated_evidence_list: []
}

const interpretation = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_INTERPRETATION':
            return action.interpretation
        default:
            return state
    }
}

export default interpretation

