/**
 * Method to return the source title given the annotation
 * @param {object} annotation  - annotation object
 */
export function getAnnotationSourceTitle (annotation) {
  const author = annotation?.article?.authors && annotation.article.authors.length > 0
    ? annotation.article.authors[0] + (annotation.article.authors.length > 1 ? ' et al. ' : '. ')
    : "";
  const title = annotation?.article?.PK
    ? `${author} PMID:${annotation.article.PK}`
    : annotation?.scv?.scvId
      ? `ClinVar SCV:${annotation.scv.scvId}`
      : "";

  return (title);
}
