/* 
  SOPv8 scores mapping:

  For individual proband, the name is made up by
    <moi> + _<variant_type> + _FUNCTIONAL_DATA (if variant has functional data support) + _IS_DE_NOVO (if variant is de novo)

  If GDM mode of inheritance is "Semidominant inheritance",
    if probandIs is "Monoallelic heterozygous" or "Hemizygous" then use data with <moi> as AUTOSOMAL_DOMINANT
    if probandIs is "Biallelic homozygous" or "Biallelic compound heterozygous" then use data with <moi> as AUTOSOMAL_RECESSIVE

  FUNCTION_*, MODEL_SYSTEMS_* and RESCUE_* are for experimental data score
*/
const SCORE_MAPS = {
    AUTOSOMAL_DOMINANT_OTHER_VARIANT_TYPE: {
        DEFAULT_SCORE: 0.1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_OTHER_VARIANT_TYPE_IS_DE_NOVO: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 1.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_PREDICTED_OR_PROVEN_NULL: {
        DEFAULT_SCORE: 1.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_PREDICTED_OR_PROVEN_NULL_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_DOMINANT_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_OTHER_VARIANT_TYPE: {
        DEFAULT_SCORE: 0.1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_OTHER_VARIANT_TYPE_IS_DE_NOVO: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 1.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_PREDICTED_OR_PROVEN_NULL: {
        DEFAULT_SCORE: 1.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_PREDICTED_OR_PROVEN_NULL_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    MITOCHONDRIAL_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    X_LINKED_OTHER_VARIANT_TYPE: {
        DEFAULT_SCORE: 0.1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    X_LINKED_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    X_LINKED_OTHER_VARIANT_TYPE_IS_DE_NOVO: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    X_LINKED_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 1.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    X_LINKED_PREDICTED_OR_PROVEN_NULL: {
        DEFAULT_SCORE: 1.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    X_LINKED_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    X_LINKED_PREDICTED_OR_PROVEN_NULL_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    X_LINKED_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_OTHER_VARIANT_TYPE: {
        DEFAULT_SCORE: 0.1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_OTHER_VARIANT_TYPE_IS_DE_NOVO: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_OTHER_VARIANT_TYPE_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 1.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5],
        UPPER_LIMIT: 1.5,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_PREDICTED_OR_PROVEN_NULL: {
        DEFAULT_SCORE: 1.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_PREDICTED_OR_PROVEN_NULL_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.0,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    AUTOSOMAL_RECESSIVE_PREDICTED_OR_PROVEN_NULL_FUNCTIONAL_DATA_IS_DE_NOVO: {
        DEFAULT_SCORE: 2.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        UPPER_LIMIT: 3.0,
        MAX_SCORE: 12
    },
    FUNCTION_BIOCHEMICAL_FUNCTION: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 2
    },
    FUNCTION_PROTEIN_INTERACTIONS: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 2
    },
    FUNCTION_EXPRESSION: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 2
    },
    FUNCTIONAL_ALTERATION_PATIENT_CELLS: {
        DEFAULT_SCORE: 1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 2
    },
    FUNCTIONAL_ALTERATION_NON_PATIENT_CELLS: {
        DEFAULT_SCORE: 0.5,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1],
        MAX_SCORE: 2
    },
    MODEL_SYSTEMS_NON_HUMAN_MODEL_ORGANISM: {
        DEFAULT_SCORE: 2,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
        MAX_SCORE: 4
    },
    MODEL_SYSTEMS_CELL_CULTURE_MODEL: {
        DEFAULT_SCORE: 1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 4
    },
    RESCUE_PATIENT_CELLS: {
        DEFAULT_SCORE: 1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 4
    },
    RESCUE_CELL_CULTURE_MODEL: {
        DEFAULT_SCORE: 1,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2],
        MAX_SCORE: 4
    },
    RESCUE_NON_HUMAN_MODEL_ORGANISM: {
        DEFAULT_SCORE: 2,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
        MAX_SCORE: 4
    },
    RESCUE_HUMAN_MODEL: {
        DEFAULT_SCORE: 2,
        SCORE_RANGE: [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
        MAX_SCORE: 4
    }
};

export default SCORE_MAPS;
