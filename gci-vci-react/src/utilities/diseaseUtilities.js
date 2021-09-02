export const convertDiseasePKToMondoId = (diseasePK) => {
  return typeof diseasePK === 'string' ? diseasePK.replace('_', ':') : '';
}

export const isFreeTextDisease = (disease) => {
  return disease && typeof disease === 'string' && disease.includes('FREETEXT');
}
