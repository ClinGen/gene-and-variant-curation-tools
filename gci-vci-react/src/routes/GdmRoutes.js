import React from 'react';
import CurationCentral from "../pages/curationCentral";
import GdmEvidenceCuration from "../pages/GdmEvidenceCuration";
import GeneDiseaseEvidenceSummary from "../pages/GeneDiseaseEvidenceSummary";
import GdmVariantCuration from '../pages/GdmVariantCuration';
import { useFetchGdmAndAnnotations } from "../utilities/gdmUtilities";
import { Route, Link } from "react-router-dom";
import ProvisionalCuration from '../pages/ProvisionalCuration';
import ProvisionalClassification from '../components/provisional-classification';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { isUserAllowedToCreateGdm } from '../helpers/allowCreateGdm';

export const gciRoutes = [
  // the gdm curation page
  { path: '/curation-central/:gdmPK', render: CurationCentral},
  // selected an annotation in the curation page
  { path: '/curation-central/:gdmPK/annotation/:annotationPK', render: CurationCentral},
  // add new evidence page
  { path: '/curation-central/:gdmPK/annotation/:annotationPK/:typeCuration', render: GdmEvidenceCuration},
  // view evidence page
  { path: '/curation-central/:gdmPK/annotation/:annotationPK/:typeCuration/:evidencePK/view', render: GdmEvidenceCuration},
  // edit evidence page
  { path: '/curation-central/:gdmPK/annotation/:annotationPK/:typeCuration/:evidencePK/edit', render: GdmEvidenceCuration},
  // submit evidence page
  { path: '/curation-central/:gdmPK/annotation/:annotationPK/:typeCuration/:evidencePK/submit', render: GdmEvidenceCuration},

  // way to add new evidence to a parent evidence:
  // GET params ?parentTypeCuration=group-curation&parentEvidencePK=...

  // preview evidence summary page
  { path: '/curation-central/:gdmPK/gene-disease-evidence-summary*', render: GeneDiseaseEvidenceSummary},

  // classification matrix page
  { path: '/provisional-curation/:gdmPK', render: ProvisionalCuration},
  // classification page that can provision, approve & publish
  { path: '/provisional-classification/:gdmPK', render: ProvisionalClassification},

  /* variant information page
    NOTE: (annotation)? and (pathogenicity)? are optional paths
        :annotationPK and :pathogenicityPK are optional params
  */
  { path: '/curation-central/:gdmPK/(annotation)?/:annotationPK?/variant/:variantPK/(pathogenicity)?/:pathogenicityPK?', render: GdmVariantCuration },
]

export const gciRoutePaths = gciRoutes.map(route => route.path);


/**
 * Switch for GCI curation pages including evidence pages. 
 * 
 * Handles gdm & annotation fetching in one place based on the current route and redux state,
 * so that GCI pages and components don't need to fetch them separately and only need to pull gdm and annotation from redux.
 * 
 * Also ties url with redux state so that use case like pasting url directly in browser will work.
 */
export const GCICurationRouterSwitch = () => {
  useFetchGdmAndAnnotations();

  const auth = useSelector(state => state.auth);
  const allowToCreateGdm = isUserAllowedToCreateGdm(auth);
  const [gdm, gdmIsLoading, gdmFetchErrorMessage] = useSelector(state => [state.gdm.entity, state.gdm.isLoading, state.gdm.fetchErrorMessage]);

  return gciRoutes.map(({ path, render: GCIPageComponent }, index) => {
      return (
        <Route key={index} exact path={path} render={props => 
          gdmIsLoading ? (
            <LoadingSpinner text="Loading GDM" />
          ) : gdmFetchErrorMessage ? (
            <Alert className="m-4" heading="Failed to load Gene-Disease Record (GDM)">
              <p>More detail information about the error below:</p>
              <p>
                {gdmFetchErrorMessage}
              </p>
            </Alert>
          ) : !gdm ? (
            <Alert className="mt-4 ml-4 mr-4">
              No Valid GDM Object found!{" "}
              <Link to={allowToCreateGdm ? "/create-gene-disease/" : "/"} className={!allowToCreateGdm ? "disabled" : "" }>Start a new gene curation</Link>.
            </Alert>
          ) : <GCIPageComponent {...props} />
          } />
      )
  });
}
