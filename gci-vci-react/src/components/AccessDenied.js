import React from 'react';
import { Link } from "react-router-dom";
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';

const AccessDenied = () => {
  return(
    <Jumbotron>
      <Container className="text-center">
        <h1 className="display-4">Access Denied</h1>
        <p className="lead">
          Please review our <Link to="/terms-of-use">Terms of Use</Link>.
          If you have any questions, please contact us at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.
        </p>
        {/* <div className="alert alert-info">
          <span>If you do not wish to continue registering for the interfaces but want to explore a demo version of the interfaces, you may select the &quot;Demo Login&quot; button located at <a href="https://curation-test.clinicalgenome.org" target="_blank" rel="noopener noreferrer">curation-test.clinicalgenome.org</a>. Your name will display as &quot;ClinGen Test Curator&quot; in the interfaces, along with others who use the &quot;Demo Login.&quot;</span>
        </div> */}
      </Container>
    </Jumbotron>
  );
};

export default AccessDenied;
