import React, { useState, useEffect, useMemo } from 'react';
import { useRouteMatch, matchPath, useHistory } from "react-router-dom";
import isEmpty from 'lodash/isEmpty';
import { useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Row from'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';
import { API } from 'aws-amplify';

import { API_NAME } from '../../utils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import CardPanel from '../common/CardPanel';
// ??? import { VariantEvidencesModal } from './curations/common/VariantEvidencesModal';

const GdmVariantsPanel = ({ className }) => {
  const history = useHistory();
  const match = useRouteMatch();
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const [isLoading, setIsLoading] = useState(false);

  const auth = useSelector(state => state.auth);
  const gdm = useSelector(state => state.gdm.entity);
  const activeAnnotation = useSelector((state) => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const annotations = useSelector(state => state.annotations);
  let annotationsList = [];
  if (annotations && !isEmpty(annotations.byPK)) {
    const keys = Object.keys(annotations.byPK);
    annotationsList = keys.map(key => annotations.byPK[key]);
  }

  const { gdmPK: gdmPKFromRouter } = (
    matchPath(match.url, {
      path: [
        '/curation-central/:gdmPK',
        '/curation-central/:gdmPK/annotation/:annotationPK'
      ]
    }) || {}
  ).params ||
  {};

  const getFamilyGdmEvidences = (family) => {
    return [
      // Collect variants in the family's segregation
      family.segregation || {},
      // Collect variants in the family's individuals
      ...(family.individualIncluded || []),
    ];
  };

  // only re-collect variants when gdm changes by useMemo
  const collectedVariants = useMemo(() => {
    const variantCollection = {};

    (annotationsList || [])
      .map((annotation) => {
        return [
          // Search unassociated individuals
          ...(annotation.individuals || []),
          // Search unassociated families
          ...(annotation.families || []).map(getFamilyGdmEvidences).flat(),
          // Search groups
          ...(annotation.groups || [])
            .map((group) => {
              return [
                // Collect variants in group's individuals
                ...(group.individualIncluded || []),
                // Collect variants in the family's individual's
                ...(group.familyIncluded || [])
                  .map(getFamilyGdmEvidences)
                  .flat(),
              ];
            })
            .flat(),
          // Search experimental data
          ...(annotation.experimentalData || []),
        ];
      })
      .flat()
      .map((eachEvidence) => {
        // SOP8 - individual evidence has variantScores which contains variant and score
        let variants = [];
        if (eachEvidence.item_type === "individual") {
          if (eachEvidence.variantScores) {
            eachEvidence.variantScores.map(score => {
              variants = eachEvidence.variantScores && eachEvidence.variantScores.map(score => {
                return score.variantScored || null;
              });
            });
          }
          // For now, include previous added variants to list
          if (eachEvidence.variants) {
            variants = [...variants, ...eachEvidence.variants];
          }
          return variants && variants.length ? variants : [];
        } else {
          return eachEvidence.variants || [];
        }
      })
      .flat()
      .forEach((variant) => {
        return (variantCollection[variant.preferredTitle] = variant);
      });

    return Object.values(variantCollection);
  }, [annotationsList]);

  const showGdmRecordsPanel = Boolean(collectedVariants && collectedVariants.length);

  return (
    showGdmRecordsPanel && (
      <CardPanel
        className={className}
        title="Gene-Disease Record Variants"
        subtitle="Click a variant to View it."
      >
        {isLoading
          ? <LoadingSpinner className="mt-3" />
          : (
            <Row>
              {collectedVariants.map((variant, index) => {
                return (
                  <Col xs={{ span: 12}} sm={{ span: 6 }} xl={{ span: 4 }} className="d-flex mb-2" key={index}>
                    <Button
                      variant="primary"
                      className="flex-fill title-ellipsis font-size-12"
                      onClick={() => {
                        const url = `/curation-central/${gdm.PK}${activeAnnotation
                          ? `/annotation/${activeAnnotation.PK}`
                          : ''
                        }/variant/${variant.PK}`
                        history.push(url);
                      }}
                    >
                      {variant.preferredTitle}
                    </Button>
                  </Col>
                );
              })}
            </Row>
          )
        }
      </CardPanel>
    )
  );

/* ??? For variant scored evidences
  return (
    showGdmRecordsPanel && (
      <CardPanel
        className={className}
        title="Gene-Disease Record Variants"
        subtitle="Click a variant to View scored evidence for this variant."
      >
        {isLoading
          ? <LoadingSpinner className="mt-3" />
          : (
            <Row>
              {collectedVariants.map((variant, index) => {
                return (
                  <Col xs={{ span: 12}} sm={{ span: 6 }} xl={{ span: 4 }} className="d-flex mb-2" key={index}>
                    <VariantEvidencesModal
                      gdm={gdm}
                      variant={variant}
                    />
                  </Col>
                );
              })}
            </Row>
          )
        }
      </CardPanel>
    )
  );
 For variant scored evidences */
};

GdmVariantsPanel.propTypes = {};

export default GdmVariantsPanel;
