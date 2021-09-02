import { AUTOSOMAL_RECESSIVE, SEMIDOMINANT } from '../constants/evidenceTypes';

/**
 * Method to determine if a score should be double counted
 * @param {string} moiType - Mode of Inheritance text
 * @param {string} recessiveZygosity - proband individual zygosity value 
 * @param {string} probandIs - proband individual probandIs value (only have value if moiType = SEMIDOMINANT)
 */
export function isHomozygousScore(moiType, recessiveZygosity, probandIs) {
  const autoRec = moiType === AUTOSOMAL_RECESSIVE;
  const semiDom = moiType === SEMIDOMINANT;

  return ((autoRec && recessiveZygosity === "Homozygous") ||
          (semiDom && probandIs.indexOf("Biallelic homozygous") > -1) ||
          (semiDom && probandIs.indexOf("Biallelic compound heterozygous") > -1 && recessiveZygosity === "Homozygous"));

}

export default isHomozygousScore;
