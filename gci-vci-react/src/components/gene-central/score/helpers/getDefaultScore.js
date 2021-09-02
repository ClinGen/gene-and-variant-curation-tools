// # Evidence Default Score Helper: Pure Function
// # Parameter: previously saved score
// ########  For Individual evidence #########
// # Parameter: Mode of Inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: VariantData (combined string of Variant Type, Functional Data Support, and Is De Novo)
// ########  For Experimental evidence #########
// # Parameter: Experimental Evidence type (e.g. FUNCTION_BIOCHEMICAL_FUNCTION, MODELS_SYSTEMS_ANIMAL_MODEL)

import { AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, MITOCHONDRIAL, X_LINKED, SEMIDOMINANT } from '../constants/evidenceTypes';
import SCORE_MAPS from '../constants/scoreMaps';

// Determine mode of inheritance type via modeInheritance
export const getModeInheritanceType = (moi) => {
    let moiType = '';

    if (moi && moi.length) {
      if (moi.indexOf('Autosomal dominant inheritance') > -1) {
        moiType = AUTOSOMAL_DOMINANT;
      } else if (moi.indexOf('Autosomal recessive inheritance') > -1) {
        moiType = AUTOSOMAL_RECESSIVE;
      } else if (moi.indexOf('X-linked') > -1) {
        moiType = X_LINKED;
      } else if (moi.indexOf('Semidominant inheritance') > -1) {
        moiType = SEMIDOMINANT;
      } else if (moi.indexOf('Mitochondrial inheritance') > -1) {
        moiType = MITOCHONDRIAL;
      } else {
        // Mode of Inheritance is not either AD, AR, SD, or X-Linked
        moiType = '';
      }
    }

    return moiType;
};

export const getScoreMOIString = (modeInheritance, probandIs) => {
  let moiType = modeInheritance;

  if (modeInheritance && probandIs) {
    moiType = modeInheritance;
    // For SemiDom, if probandIs is "Monoallelic heterozygous" or "Hemizygous" then AUTOSOMAL_DOMINANT
    // if "Biallelic homozygous" or "Biallelic compound heterozygous" then AUTOSOMAL_RECESSIVE
    if (moiType.indexOf('SEMIDOMINANT') > -1) {
      moiType = probandIs === "Monoallelic heterozygous" || probandIs === "Hemizygous"
        ? AUTOSOMAL_DOMINANT
        : AUTOSOMAL_RECESSIVE;
    }
  }
  return moiType;
};

export const getVariantDataString = (data) => {
  let variantData = "";

  variantData = data["variantType"] + (data["functionalDataSupport"] === "Yes" ? "_FUNCTIONAL_DATA" : "");
  variantData = variantData + (data["deNovo"] === "Yes" ? "_IS_DE_NOVO" : "");

  return variantData;
};


export function getDefaultScore(modeInheritance, variant, experimentalEvidenceType, savedScore) {
  let score, matched = '';
  const scoreKeys = Object.keys(SCORE_MAPS);

  if (savedScore) {
    score = savedScore;
  } else {
    if (modeInheritance && variant) {
      let variantData = getVariantDataString(variant);
      matched = modeInheritance + '_' + variantData;
      scoreKeys.forEach(key => {
        if (matched === key) {
          score = SCORE_MAPS[matched].DEFAULT_SCORE;
        }
      });
    } else if (experimentalEvidenceType) {
      scoreKeys.forEach(key => {
        if (experimentalEvidenceType === key) {
          score = SCORE_MAPS[experimentalEvidenceType].DEFAULT_SCORE;
        }
      });
    } else {
      score = null;
    }
  }

  return score;
}

// # Evidence Score Upper Limit Helper: Pure Function
// ########  For Individual evidence #########
// # Parameter: Mode of Inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: VariantData (combined string of Variant Type, Functional Data Support, and Is De Novo)

export function getScoreUpperLimit(modeInheritance, variant) {
  let score, matched = '';
  const scoreKeys = Object.keys(SCORE_MAPS);

  if (modeInheritance && variant) {
    let variantData = getVariantDataString(variant);
    matched = modeInheritance + '_' + variantData;
    scoreKeys.forEach(key => {
      if (matched === key) {
        score = SCORE_MAPS[matched].UPPER_LIMIT;
      }
    });
  }

  return score;
}

