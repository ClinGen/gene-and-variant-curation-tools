import PropTypes from 'prop-types'

export const ArticleEvidencePropTypes = PropTypes.shape({
  PK: PropTypes.string,
  item_type: PropTypes.oneOf(["curated-evidence"]),
  evidenceDescription: PropTypes.string,
  evidenceCriteria: PropTypes.string,
})

export const ArticlePropTypes = PropTypes.shape({
  PK: PropTypes.string,
  item_type: PropTypes.oneOf(["article"]),
  date: PropTypes.string,
})
