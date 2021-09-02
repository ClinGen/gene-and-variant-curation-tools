import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Container from 'react-bootstrap/Container';
import { default as lodashGet } from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
import { API } from 'aws-amplify';

import { API_NAME } from '../utils';
import CardPanel from '../components/common/CardPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PmidSummary from "../components/common/article/PmidSummary";
import { GdmHeader } from '../components/gene-central/GdmHeader';
import { ExternalLink } from '../components/common/ExternalLink';
import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { renderVariantLabelAndTitle } from '../components/gene-central/curations/common/commonFunc';
import { EXTERNAL_API_MAP } from '../constants/externalApis';

const GdmVariantCuration = (props) => {
  const history = useHistory();
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const auth = useSelector(state => state.auth);
  const gdm = useSelector(state => state.gdm.entity);
  const annotations = useSelector(state => state.annotations);
  const activeAnnotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  });
  const { variantPK: variantPKFromRouter } = props.match.params || {};

  const findVariant = () => {
    const keys = Object.keys(annotations.variantByPKByAnnotation);
    let foundVariant;
    keys.some(key => {
      if (annotations.variantByPKByAnnotation[key][variantPKFromRouter]) {
        foundVariant = annotations.variantByPKByAnnotation[key][variantPKFromRouter];
        return true;
      }
      return false;
    });
    return foundVariant;
  };

  const variant = findVariant();
  const affiliation = auth && auth.currentAffiliation;
  const curatorName = auth && auth.name && auth.family_name && `${auth.name} ${auth.family_name}`;

  let annotationsList = [];
  if (annotations && !isEmpty(annotations.byPK)) {
    const keys = Object.keys(annotations.byPK);
    annotationsList = keys.map(key => annotations.byPK[key]);
  }

  const handleCancel = () => {
    let cancelUrl = "/dashboard";
    if (lodashGet(gdm, "PK", null)) {
      if (lodashGet(activeAnnotation, "PK", null)) {
        cancelUrl = `/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}`;
      } else {
        cancelUrl = `/curation-central/${gdm.PK}`;
      }
    }
    requestRecycler.cancelAll();
    history.push(cancelUrl);
  };

  // Collect references to all families and individuals within an annotation that reference the given variant
  const collectVariantAssociations = (annotation, targetVariant) => {
    const allAssociations = [];

    // Find any variants matching the target variant in the given individual.
    // Any matching variant pushes its individual onto the associations array as a side effect
    const surveyIndividual = (individual, targetVariant) => {
      // Search for variant in individual matching variant we're looking for
      const matchingVariant = individual && individual.variants && individual.variants.find((variant) => variant.PK === targetVariant.PK);
      // Found a matching variant; push its parent individual
      if (matchingVariant) {
        allAssociations.push(individual);
      }
    };

    // Find any variants matching the target variant in the given family's segregation.
    // Any matching variant pushes its family onto the associations array as a side effect
    const surveyFamily = (family, targetVariant) => {
      if (family.segregation && family.segregation.variants) {
        const matchingVariant = family.segregation.variants.find((variant) => variant.PK === targetVariant.PK);
        // Found a matching variant; push its parent family
        if (matchingVariant) {
          allAssociations.push(family);
        }
      }
    }

    // Find any variants matching the target variant in the given experimental data.
    // Any matching variant pushes its experimental data onto the associations array as a side effect
    const surveyExperimental = (experimental, targetVariant) => {
      // Search for variant in experimental matching variant we're looking for
      if (experimental.variants && experimental.variants.length) {
        const matchingVariant = experimental.variants.find((variant) => variant.PK === targetVariant.PK);
        // Found a matching variant; push its parent individual
        if (matchingVariant) {
          allAssociations.push(experimental);
        }
      }
    }

    if (annotation && Object.keys(annotation).length) {
      // Search unassociated individuals
      if (annotation.individuals && annotation.individuals.length) {
        annotation.individuals.forEach((individual) => {
          // Add any variants matching targetVariant in the individual to allAssociations
          surveyIndividual(individual, targetVariant);
        });
      }

      // Search unassociated families
      if (annotation.families && annotation.families.length) {
        annotation.families.forEach((family) => {
          // Add any variants matching targetVariant in the family to allAssociations
          surveyFamily(family, targetVariant);
          // Search for variant in the family's individuals matching variant we're looking for
          if (family.individualIncluded && family.individualIncluded.length) {
            family.individualIncluded.forEach((individual) => {
              surveyIndividual(individual, targetVariant);
            });
          }
        })
      }

      // Search groups
      if (annotation.groups && annotation.groups.length) {
        annotation.groups.forEach((group) => {
          // Search variants in group's individuals
          if (group.individualIncluded && group.individualIncluded.length) {
            group.individualIncluded.forEach((individual) => {
              surveyIndividual(individual, targetVariant);
            });
          }
          // Search variants in group's families' segregations
          if (group.familyIncluded && group.familyIncluded.length) {
            group.familyIncluded.forEach((family) => {
              surveyFamily(family, targetVariant);
              // Search for variant in the group's families' individuals matching variant we're looking for
              if (family.individualIncluded && family.individualIncluded.length) {
                family.individualIncluded.forEach((individual) => {
                  surveyIndividual(individual, targetVariant);
                });
              }
            });
          }
        });
      }

      // Search experimental data
      if (annotation.experimentalData && annotation.experimentalData.length) {
        annotation.experimentalData.forEach((experimental) => {
          surveyExperimental(experimental, targetVariant);
        });
      }
    }

    return allAssociations.length ? allAssociations : null;
  };

  const renderAssociations = () => {
    return annotationsList.map((annotation) => {
      const associations = variant ? collectVariantAssociations(annotation, variant) : null;
      // Sort by probands first
      const sortedAssociations = associations && sortBy(associations, (association) => {
        if (association['item_type'] === 'individual') {
          return association.proband ? 0 : 1;
        }
        return 1;
      });
      if (sortedAssociations && sortedAssociations.length) {
        return (
          <div key={annotation.PK} className="pmid-association-header">
            <span>
              {'PMID: '}
              <ExternalLink
                href={`${EXTERNAL_API_MAP['PubMed']}${annotation.article.PK}`}
                title="PubMed article in a new tab"
              >
                {annotation.article.PK}
              </ExternalLink>
              <FontAwesomeIcon icon={faLongArrowAltRight} className="mx-2" />
            </span>
            {sortedAssociations.map((association, i) => {
              const associationType = association['item_type'];
              const probandLabel = (associationType === 'individual' && association.proband) && <i className="icon icon-proband" />;
              return (
                <span key={association.PK}>
                  {i > 0 ? ', ' : ''}
                  {associationType === 'group' && <span>Group </span>}
                  {associationType === 'family' && <span>Family </span>}
                  {associationType === 'individual' && <span>Individual </span>}
                  {associationType === 'experimental' && <span>Experimental </span>}
                  <Link
                    to={`/curation-central/${gdm.PK}/annotation/${annotation.PK}/${associationType}-curation/${association.PK}/view`}
                    title={'View ' + associationType}
                  >
                    {association.label}
                  </Link>
                  {probandLabel}
                </span>
              );
            })}
          </div>
        );
      }
    });
  };

  const renderVariantInfo = () => (
    <>
      <div>
        {gdm && activeAnnotation &&
          <Link to={`/curation-central/${gdm.PK}/annotation/${activeAnnotation.PK}`}>
            <i className="icon icon-briefcase" />
          </Link>
        }
        {variant.clinvarVariantId &&
          <span>
            <span className="term-name"> &#x2F;&#x2F; ClinVar Variation ID: </span>
            <span className="term-value">
              <ExternalLink
                href={`${EXTERNAL_API_MAP['ClinVarSearch']}${variant.clinvarVariantId}`}
                title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`}
              >
                {variant.clinvarVariantId}
              </ExternalLink>
            </span>
          </span>
        }
        {variant.carId &&
          <span>
            <span className="term-name"> &#x2F;&#x2F; ClinGen Allele Registry ID: </span>
            <span className="term-value">
              <ExternalLink
                href={`${EXTERNAL_API_MAP['CARallele']}${variant.carId}.html`}
                title={`ClinGen Allele Registry entry for variant ${variant.carId} in new tab`}
              >
                {variant.carId}
              </ExternalLink>
            </span>
          </span>
        }
      </div>
      <div>
        {renderVariantLabelAndTitle(variant, false, true)}
      </div>
    </>
  );

  const geneImpactMap = {
   'lof': 'Predicted or observed null',
   'non-lof': 'Other variant with gene impact',
   'insufficient': 'Insufficient evidence for gene impact'
  };
  const geneImpact = geneImpactMap[formData.geneImpact] || 'none';
  const supportExperimental = formData.supportExperimental || 'none';
  const supportSegregation = formData.supportSegregation || 'none';
  const supportAllelic = formData.supportAllelic || 'none';
  const supportComputational = formData.supportComputational || 'none';
  const comments = formData.comments || '';

  return (
    gdm && !isLoading
      ? (
        <>
          <GdmHeader />
          <Container>
            {activeAnnotation && activeAnnotation.article &&
              <div className="curation-pmid-summary mb-2">
                <PmidSummary article={activeAnnotation.article} displayJournal pmidLinkout />
              </div>
            }
            <h2>View Variant Information</h2>
            {affiliation
              ? <h4>{`Curator: ${affiliation.affiliation_fullname}`}</h4>
              : (curatorName
                ? <h4>{`Curator: ${curatorName}`}</h4>
                : null)
            }
            <h4>{renderAssociations()}</h4>
            {variant &&
              <h4>{renderVariantInfo()}</h4>
            }
            {gdm &&
              <Button
                variant="primary"
                className="float-right align-self-end mb-2 ml-2"
                onClick={handleCancel}
              >
                Close
              </Button>
            }
          </Container>
        </>
      ) : (
        <LoadingSpinner className="mt-4" />
      )
  );
};

export default GdmVariantCuration;
