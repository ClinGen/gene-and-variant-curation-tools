export const AnnotationActionTypes = {
  reset: 'RESET_ANNOTATIONS',
  set: 'SET_ANNOTATIONS',
  add: 'ADD_ANNOTAION',
  update: 'UPDATE_ANNOTATION',
  activateAnnotation: 'ACTIVATE_ANNOTATION',
  setIsLoading: 'IS_LOADING_ANNOTATION',

  fetchSuccess: 'FETCH_SUCCESS_ANNOTATIONS',
  fetchFailure: 'FETCH_FAILURE_ANNOTATIONS'
}

export const resetAnnotationsAction = () => ({
  type: AnnotationActionTypes.reset
});

export const setAnnotationsAction = (annotations, activeAnnotationPK) => ({
  type: AnnotationActionTypes.set,
  annotations,
  activeAnnotationPK
});

export const fetchAnnotationsSuccessAction = (annotations, activeAnnotationPK) => ({
  type: AnnotationActionTypes.fetchSuccess,
  annotations,
  activeAnnotationPK
})

export const fetchAnnotationsFailureAction = (errorMessage) => ({
  type: AnnotationActionTypes.fetchFailure,
  errorMessage,
})

export const addAnnotationAction = (annotation) => ({
  type: AnnotationActionTypes.add,
  annotation,
});

export const updateAnnotationAction = (annotation) => ({
  type: AnnotationActionTypes.update,
  annotation,
});

export const activateAnnotationAction = (annotationPK) => ({
  type: AnnotationActionTypes.activateAnnotation,
  annotationPK,
});

export const setAnnotationsIsLoadingAction = (isLoading) => ({
  type: AnnotationActionTypes.setIsLoading,
  isLoading,
});
