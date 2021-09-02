import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux'
import { Container, Jumbotron } from "react-bootstrap";

import PmidSummary from "../components/common/article/PmidSummary";

import LoadingSpinner from '../components/common/LoadingSpinner';
import ExperimentalCuration from './ExperimentalCuration';
import ExperimentalSubmit from '../components/gene-central/curations/experimental-data/ExperimentalSubmit';
import ExperimentalView from '../components/gene-central/curations/experimental-data/ExperimentalView';
import CaseControlCuration from '../components/gene-central/curations/case-control/CaseControlCuration';
import CaseControlView from '../components/gene-central/curations/case-control/CaseControlView';
import CaseControlSubmit from '../components/gene-central/curations/case-control/CaseControlSubmit';
import { GdmHeader } from '../components/gene-central/GdmHeader';
import { GroupCuration } from '../components/gene-central/curations/group/GroupCuration';
import { GroupSubmit } from '../components/gene-central/curations/group/GroupSubmit';
import { GroupView } from '../components/gene-central/curations/group/GroupView';
import { FamilyCuration } from '../components/gene-central/curations/family/FamilyCuration';
import { FamilySubmit } from '../components/gene-central/curations/family/FamilySubmit';
import { FamilyView } from '../components/gene-central/curations/family/FamilyView';
import { IndividualCuration } from '../components/gene-central/curations/individual/IndividualCuration';
import { IndividualSubmit } from '../components/gene-central/curations/individual/IndividualSubmit';
import { IndividualView } from '../components/gene-central/curations/individual/IndividualView';
import { getEvidenceByPKFromActiveAnnotation } from '../utilities/gdmEvidenceUtilities';
import { useLocation } from 'react-router-dom';


export const GdmEvidenceCuration = (props) => {
  const { evidencePK } = props.match.params || {};
    
  const gdmIsLoading = useSelector(state => state.gdm.isLoading);
  const annotation = useSelector(state => {
    if (state.annotations.activePK && state.annotations.byPK[state.annotations.activePK]) {
      return state.annotations.byPK[state.annotations.activePK];
    }
  })
  const annotationsState = useSelector(state => state.annotations);
  const annotationIsLoading = annotationsState.isLoading;

  const [ evidence, setEvidence ] = useState({});
  const [ operation, setOperation ] = useState('add');
  const [ evidenceIsLoading, setEvidenceIsLoading ] = useState(true);
  const [ selectedCuration, setSelectedCuration ] = useState(null);
  const [ associatedGroup, setAssociatedGroup ] = useState(null);
  const [ associatedFamily, setAssociatedFamily ] = useState(null);
  const [ loadDataError, setLoadDataError ] = useState(null);

  // reset the scroll location to top upon page navigation
  // https://stackoverflow.com/a/63042864/9814131
  const location = useLocation();
  useLayoutEffect(() => {
      window.scrollTo(0, 0);
  }, [location.pathname])

  // fetch group/family/individual/case-control/experimental-data if needed 
  useEffect(() => {
    if (annotationIsLoading || 
      // loading data requires the active annotation available
      !annotationsState.activePK) {
      return;
    }

    setEvidenceIsLoading(true);
    if ((props.match.url).includes('edit')) {
      setOperation('edit');
    }
    if ((props.match.url).includes('view')) {
      setOperation('view');
    }
    if ((props.match.url).includes('submit')) {
      setOperation('submit');
    }
    if ((props.match.url).includes('group-curation')) {
      setSelectedCuration('group');
      loadCurationData('groups').then(result => {
        setEvidenceIsLoading(false);
      });
    } else if ((props.match.url).includes('family-curation')) {
      setSelectedCuration('family');
      loadCurationData('families').then(result => {
        if (loadDataError === null) {
          let params = new URLSearchParams(props.location.search);
          if (params.get("parentTypeCuration") === "group-curation" && params.get("parentEvidencePK") !== "") {
            loadAssociatedEvidence("group", params.get("parentEvidencePK"));
          } else {
            setEvidenceIsLoading(false);
          }
        }
      });
    } else if ((props.match.url).includes('individual-curation')) {
      setSelectedCuration('individual');
      loadCurationData('individuals').then(result => {
        if (loadDataError === null) {
          let params = new URLSearchParams(props.location.search);
          if (params.get("parentTypeCuration") === "group-curation" && params.get("parentEvidencePK") !== "") {
            loadAssociatedEvidence("group", params.get("parentEvidencePK"));
          } else if (params.get("parentTypeCuration") === "family-curation" && params.get("parentEvidencePK") !== "") {
            loadAssociatedEvidence("family", params.get("parentEvidencePK"));
          } else {
            setEvidenceIsLoading(false);
          }
          setEvidenceIsLoading(false);
        }
      });
    } else if ((props.match.url).includes('case-control-curation')) {
      setSelectedCuration('case-control');
      loadCurationData('casecontrol').then(result => {
        setEvidenceIsLoading(false);
      });
    } else if ((props.match.url).includes('experimental-curation')) {
      setSelectedCuration('experimental');
      loadCurationData('experimental').then(() => {
        setEvidenceIsLoading(false);
      });
    }
  }, [props.match.url, annotationIsLoading, annotationsState.activePK]);

  const loadCurationData = (type) => {
    setLoadDataError(null);
    return new Promise((resolve, reject) => {
      if ((props.match.url).includes('edit') || (props.match.url).includes('view') || (props.match.url).includes('submit')) {
        if (evidencePK) {
          // pull evidence from redux
          const evidence = getEvidenceByPKFromActiveAnnotation(annotationsState, evidencePK);
          if (evidence) {
            setEvidence(evidence);
            setEvidenceIsLoading(false);
            
            resolve(null);
            return;
          }

          // evidence failed to retrieve
          setEvidence(null);
          setLoadDataError(`Selected ${type} ${evidencePK} is not found`);
          setEvidenceIsLoading(false);
          reject(null);
          return;

        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  };

  const loadAssociatedEvidence = (type, evidencePK) => {
    setLoadDataError(null);

    // pull case level evidence from redux 
    const parentEvidence = getEvidenceByPKFromActiveAnnotation(annotationsState, evidencePK);
    if (parentEvidence) {
      if (type === "group") {
        setAssociatedGroup(parentEvidence);
      } else if (type === 'family') {
        setAssociatedFamily(parentEvidence)
      }
      setEvidenceIsLoading(false);
      return;
    }

    setLoadDataError(`Selected add to ${type} object ${evidencePK} is not found`);
    setEvidenceIsLoading(false);
  };

  const renderPmidSummary = () => {
    return (
      <div className="curation-pmid-summary">
        <PmidSummary article={annotation.article} displayJournal pmidLinkout />
      </div>
    );
  };

  const renderCurationForm = () => {
    switch (selectedCuration) {
      case 'group':
        if (operation === 'view') {
          return <GroupView group={evidence} />;
        } else if (operation === 'submit') {
          return <GroupSubmit submitGroup={evidence} />;
        } else {
          return <GroupCuration editGroup={operation==='edit' && evidence ? evidence : null} />;
        }
      case 'family':
        if (operation === 'view') {
          return <FamilyView family={evidence} />;
        } else if (operation === 'submit') {
          const params = new URLSearchParams(props.location.search);
          // If hadvar='' mean it exists in url; if null, hadvar param is not in url.
          const hadVar = params.get("hadvar") === '' ? true : false;
          return <FamilySubmit
            submitFamily={evidence}
            associatedGroup={associatedGroup ? associatedGroup : null}
            hadVar={hadVar}
          />;
        } else {
          return <FamilyCuration
            editFamily={operation === 'edit' && evidence ? evidence : null}
            associatedGroup={associatedGroup ? associatedGroup : null}
          />;
        }
      case 'individual':
        if (operation === 'view') {
          return <IndividualView individual={evidence} />;
        } else if (operation === 'submit') {
          return <IndividualSubmit
            individual={evidence}
            associatedGroup={associatedGroup ? associatedGroup : null}
            associatedFamily={associatedFamily ? associatedFamily : null}
          />;
        } else {
          return <IndividualCuration
            editIndividual={operation === 'edit' && evidence ? evidence : null}
            associatedGroup={associatedGroup ? associatedGroup : null}
            associatedFamily={associatedFamily ? associatedFamily : null}
          />;
        }
      case 'case-control':
        if (operation === 'view') {
          return <CaseControlView caseControl={evidence} />
        } else if (operation === 'submit') {
          return <CaseControlSubmit submitCaseControl={evidence} />
        } else {
          return <CaseControlCuration editCaseControl={operation === 'edit' && evidence ? evidence : null} />
        }
      case 'experimental':
        if (operation === 'view') {
          return <ExperimentalView experimentalData={evidence} />;
        } else if (operation === 'submit') {
          return <ExperimentalSubmit submitExperimental={evidence} />;
        } else {
          return <ExperimentalCuration editExperimentalData={operation === 'edit' && evidence ? evidence : null} />;
        }
      default:
        return null;
    }
  };


  return (gdmIsLoading || annotationIsLoading || evidenceIsLoading ||
    // active annotation needs to be avaialble in order to display the page
    !annotationsState.activePK) ? (
    <LoadingSpinner className="mt-4" />
  ) : annotation ? (
    loadDataError ? (
      <Jumbotron>
        <Container>
          <h2>{loadDataError}</h2>
        </Container>
      </Jumbotron>
    ) : (
      <>
        <GdmHeader />
        <Container>
          {renderPmidSummary()}
          {renderCurationForm()}
        </Container>
      </>
    )
  ) : (
    <Jumbotron>
      <Container>
        <h2>Annotation Not Found</h2>
      </Container>
    </Jumbotron>
  );
};

export default GdmEvidenceCuration;
