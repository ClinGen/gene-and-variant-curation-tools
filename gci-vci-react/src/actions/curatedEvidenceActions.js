export const CuratedActionTypes = {
  set: 'SET_CURATED_EVIDENCES',
  add: 'ADD_CURATED_EVIDENCE',
  update: 'UPDATE_CURATED_EVIDENCE',
  delete: 'DELETE_CURATED_EVIDENCE',
}

export const setCuratedEvidencesAction = (curatedEvidences) => ({
  type: CuratedActionTypes.set,
  curatedEvidences,
});

export const addCuratedEvidenceAction = (curatedEvidence) => ({
  type: CuratedActionTypes.add,
  curatedEvidence,
});

export const updateCuratedEvidenceAction = (curatedEvidence) => ({
  type: CuratedActionTypes.update,
  curatedEvidence,
});

export const deleteCuratedEvidenceAction = (curatedEvidence) => ({
  type: CuratedActionTypes.delete,
  curatedEvidence,
});
