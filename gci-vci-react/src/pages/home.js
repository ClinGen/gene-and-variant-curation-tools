import React, { useState } from 'react';
import moment from 'moment';
import {Jumbotron, Collapse, Button, Container, Row, Col} from 'react-bootstrap'
/**
 * Stateless Component Home 
 * Landing page for application displays basic info
 */

function Home() {
    //const [demoVersion] = useState(true);
    const [open, setOpen] = useState(false);
    
    return(
        <>
        <Jumbotron>
            <Container>
                <h1 className="display-4 d-flex">ClinGen Variant &amp; Gene Curation</h1>
                <p className="lead mb-0 text-muted"><strong>Variant Curation</strong> is available for public use. To register, create an account via &quot;Login&quot;, and then contact our VCI helpdesk at <a href="mailto:vci@clinicalgenome.org">vci@clinicalgenome.org</a>.</p>
                <p className="lead text-muted"><strong> Gene Curation </strong> is currently restricted to ClinGen curators. To collaborate on gene curation contact <a href="mailto:clingen@clinicalgenome.org">clingen@clinicalgenome.org</a></p>
                <p>
                    <Button
                    onClick={() => setOpen(!open)}
                    aria-controls="hidden-text"
                    aria-expanded={open}
                    variant="light"
                    >Demo version...</Button>
                </p>

                <Collapse in={open}>
                    <div className="hidden-text">
                        <p>Any user may explore the demo version of the ClinGen interfaces by registering using the &quot;Login&quot; button, found in the header at <a href="https://curation-test.clinicalgenome.org" target="_blank" rel="noopener noreferrer">curation-test.clinicalgenome.org</a>. If you have questions about the demo site, please email us at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a></p> 
                    </div>
                </Collapse>
            </Container>
        </Jumbotron>

        {/* <div className="row demo-access-note">
            {demoVersion ?
                <div>Explore a demo version of the ClinGen interfaces by clicking on the "Demo Login" button located in the header above.</div>
                :
                <div>Explore a demo version of the ClinGen interfaces at <a href="https://curation-test.clinicalgenome.org/" target="_blank" rel="noopener noreferrer">curation-test.clinicalgenome.org</a></div>
            }
        </div> */}

        <Container className="pt-3 pb-3">
            <Row>
                <Col sm="6">
                    <div className="promo">
                        <h2 className="h2">Variant Curation</h2>
                        <h3 className="lead text-muted">Which changes in the gene cause disease?</h3>
                        <p>
                            The ClinGen variant curation process combines clinical, genetic, population, and functional evidence with expert review to classify variants into 1 of 5 categories according to the <a href="https://www.acmg.net/docs/standards_guidelines_for_the_interpretation_of_sequence_variants.pdf" target="_blank" rel="noopener noreferrer">ACMG guidelines <i className="icon icon-file-pdf-o"></i></a>.
                        </p>
                        <p><strong>Pathogenic &#8226; Likely Pathogenic &#8226; Uncertain &#8226; Likely Benign &#8226; Benign</strong></p>
                        <p className="help-document">
                            <a className="btn btn-primary" href="https://www.clinicalgenome.org/curation-activities/variant-pathogenicity/" target="_blank" rel="noopener noreferrer" role="button">Learn more</a>
                        </p>
                    </div>
                </Col>
                <Col sm="6">
                    <div className="promo">
                        <h2 className="h2">Gene Curation</h2>
                        <h3 className="lead text-muted">Does variation in this gene cause disease?</h3>
                        <p>
                            The ClinGen gene curation process combines an appraisal of genetic and experimental data in the scientific literature with expert review to classify gene-disease pairs into 1 of 6 categories according to ClinGen's <a href="https://clinicalgenome.org/curation-activities/gene-disease-validity/training-materials/#Documentation" target="_blank" rel="noopener noreferrer">Gene-Disease Clinical Validity Classification <i className="icon icon-file-pdf-o"></i></a> framework.
                        </p>
                        <p><strong>Definitive &#8226; Strong &#8226; Moderate &#8226; Limited &#8226; Disputed &#8226; Refuted</strong></p>
                        <p className="help-document">
                            <a className="btn btn-primary" href="https://www.clinicalgenome.org/curation-activities/gene-disease-validity/" target="_blank" rel="noopener noreferrer" role="button">Learn more</a>
                        </p>
                    </div>
                </Col>
            </Row>   
        </Container>

        <section className="pt-5 pb-3">
            <Container>
                <p className="lead">ClinGen is a National Institutes of Health (NIH)-funded resource dedicated to building an authoritative central resource that defines the clinical relevance of genes and variants for use in precision medicine and research. One of the key goals of ClinGen is to implement an evidence-based consensus for curating genes and variants. For more information on the ClinGen resource, please visit the ClinGen portal at <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">clinicalgenome.org</a></p>
                <hr/>
                <footer>
                    <p>&copy; {moment().format("YYYY")} <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">ClinGen</a> - All rights reserved</p>
                </footer>
            </Container>
        </section>
        </>
    )
}

export default Home;

