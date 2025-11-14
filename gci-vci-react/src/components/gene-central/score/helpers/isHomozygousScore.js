import {
  AUTOSOMAL_RECESSIVE,
  SEMIDOMINANT,
  SOMATIC_MOSAICISM
} from '../constants/evidenceTypes';

/**
 * Method to determine if a score should be double counted
 * @param {string} moiType - Mode of Inheritance text
 * @param {string} recessiveZygosity - proband individual zygosity value 
 * @param {string} probandIs - proband individual probandIs value (only have value if moiType = SEMIDOMINANT or SOMATIC_MOSAICISM)
 */
export function isHomozygousScore(moiType, recessiveZygosity, probandIs) {
  const isAR = moiType === AUTOSOMAL_RECESSIVE;
  const isSDSM = moiType === SEMIDOMINANT || moiType === SOMATIC_MOSAICISM;

  return ((isAR && recessiveZygosity === "Homozygous") ||
          (isSDSM && probandIs.indexOf("Biallelic homozygous") > -1) ||
          (isSDSM && probandIs.indexOf("Biallelic compound heterozygous") > -1 && recessiveZygosity === "Homozygous"));

}

export default isHomozygousScore;
