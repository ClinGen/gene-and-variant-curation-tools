import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import { useHistory } from "react-router-dom";
import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';

const TermsOfUse = ({ auth }) => {
  const history = useHistory();
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { email } = auth;
      if (email) {
        try {
          const url = `/users?email=${email}`;
          const response = await requestRecycler.capture(API.get(API_NAME, url));
          if (response && response.length) {
            setCurrentUser(response[0]);
          }
        } catch(error) {
          if (API.isCancel(error)) {
            return;
          }
          console.log(JSON.parse(JSON.stringify(error)));
        }
      }
    };
    fetchUser();
  }, [auth, requestRecycler]);

  const handleAcceptTerms = async () => {
    if (!currentUser) {
      setError('Unable to find user.')
    }
    try {
      const url = `/users/${currentUser.PK}`;
      const user = {
        ...currentUser,
        accepted_terms: true,
      };
      delete user['custom:institution'];
      delete user['cognito:user_status'];
      delete user['cognito:email_alias'];
      delete user['custom:affiliations'];
      delete user['custom:groups'];
      delete user['cognito:mfa_enabled'];
      delete user['custom:rid'];

      const params = {
        body: {
          user
        }
      };
      const response = await requestRecycler.capture(API.put(API_NAME, url, params));
      if (response) {
        setCurrentUser(response);
        if (response.user_status === 'active') {
          history.push('/dashboard');
        } else if (response.user_status === 'requested activation') {
          history.push('/activation');
        } else if (response.user_status === 'inactive') {
          history.push('/access-denied');
        }
      }
    } catch(error) {
      if (API.isCancel(error)) {
        return;
      }
      console.log(JSON.parse(JSON.stringify(error)));
      setError('Failed, please try again later!');
    }
  };

  return (
    <div className="container d-flex flex-column">
      <div className="border bg-light p-4 mt-5 mb-3">
        <h2>Terms of Use, User Agreement</h2>
        <p className="lead">Upon registration as a user of the ClinGen Variant Curation Interface (VCI), I acknowledge and agree to the following terms:</p>
        <ol>
            <li className="lead">Any data entered into the VCI may be made publicly accessible, either through the VCI directly or by subsequent transfer to other public resources (ClinVar, ClinGen Evidence Repository, etc.);</li>
            <li className="lead">All unpublished patient-specific data entered into the VCI, which is not explicitly consented for public sharing, should be the <span className="underline">minimum necessary</span> to inform the clinical significance of genetic variants;</li>
            <li className="lead">Data entered into the VCI should not include <a href="https://www.hipaajournal.com/considered-phi-hipaa/" target="_blank" rel="noopener noreferrer">protected health information (PHI)</a> or equivalent identifiable information as defined by regulations in your country or region;</li>
            <li className="lead">Data accessed through the VCI should not be used in a manner that is likely to compromise the privacy of individuals. Users agree that they will not attempt in any way to identify or re-identify data subjects;</li>
            <li className="lead">Users understand that they may be personally identified on the basis of information provided during registration, including (but not limited to) names, email addresses, professional affiliations, and curation activities in the VCI.</li>
        </ol>
        <p className="lead">
            For information about the publication of data in the ClinGen curation ecosystem, data sharing, and informed consent in clinical genomics in the United States,
            please consult the ClinGen Terms of Use (<a href="https://www.clinicalgenome.org/docs/terms-of-use/" target="_blank" rel="noopener noreferrer">https://www.clinicalgenome.org/docs/terms-of-use/</a>),
            ClinGen Broad Data Sharing Consent Resources (<a href="https://www.clinicalgenome.org/tools/consent-resources/" target="_blank" rel="noopener noreferrer">https://www.clinicalgenome.org/tools/consent-resources/</a>), 
            the NHGRI Policy on informed consent (<a href="https://www.genome.gov/about-genomics/policy-issues/informed-consent" target="_blank" rel="noopener noreferrer">https://www.genome.gov/about-genomics/policy-issues/informed-consent</a>)
            and this &quot;Points to Consider&quot; regarding data sharing in public databases: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5793773"target="_blank" rel="noopener noreferrer">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5793773</a>
        </p>
      </div>
      {/* {location && location.state && location.state.view === 'acceptAndContinue' */}
      {currentUser && !currentUser.accepted_terms
        && (
          <Button
            className="btn-lg align-self-center mb-2 rounded-button"
            variant="primary"
            onClick={handleAcceptTerms}
          >
            Accept Terms & Continue
          </Button>
        )
      }
      {error &&
        <span className="align-self-center text-danger">{error}</span>
      }
      <footer className="mt-5">
          <p>&copy; {moment().format("YYYY")} <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">ClinGen</a> - All rights reserved</p>
      </footer>
    </div>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(TermsOfUse);
