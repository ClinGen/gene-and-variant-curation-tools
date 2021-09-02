import React, { Component } from "react";
import PropTypes from "prop-types";
import { Row, Col } from "react-bootstrap";
import lodashGet from "lodash/get";

// Internal libs
import CardPanel from "../../../common/CardPanel";
import Alert from "../../../common/Alert";
import { EvidenceTable } from "./EvidenceTable";
import { EvidenceModalManager } from "./EvidenceModalManager";
import { isOwnedByCurrentCuratingEntity } from "../../../../utilities/ownershipUtilities";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

// Class to render the Case Segregation curated evidence table in VCI, and handle any interactions with it

class AddCuratedEvidenceTableComponent extends Component {

  static propTypes = {
    tableName: PropTypes.object,   // table name as HTML object
    category: PropTypes.string,    // category (usually the tab) the evidence is part of
    subcategory: PropTypes.string, // subcategory (usually the panel) the evidence is part of
    criteriaList: PropTypes.array, // criteria code(s) pertinent to the category/subcategory
    readOnly: PropTypes.bool,      // True if curated evidence is in read-only mode
    allCaseSegEvidences: PropTypes.array, // all case segregation curated evidences for this variant
    interpretationCaseSegEvidences: PropTypes.array,  // Case segregation evidences with sourceInfo added to current interpretation
    canCurrUserModifyEvidence: PropTypes.func, // function to check if current logged in user can modify given evidence
    auth: PropTypes.object         // current logged in user auth data
  };

  state = {
    evidenceType: null,   // evidence type - PMID, clinical_lab, clinic, research_lab, public_database, registered_curator, other
    showAddModal: false,  // bring up add evidence modal 
  };

  setEvidenceType = (event) => {
    if (event.target.value === 'select-source') {
      this.setState({ evidenceType: null });
    } else {
      this.setState({ evidenceType: event.target.value });
    }
  };

  renderEvidenceText = () => {
    const text = this.state.evidenceType
      ? 'Click "Add Evidence" to curate and save a piece of evidence.'
      : 'Select an evidence source above';
    return (
      <span style={{marginLeft: '15px'}}>{text}</span>
    );
  };

  onAddEvidneceClick = () => {
    this.setState({
      showAddModal: true
    });
  };

  onHideAddEvidenceModal = () => {
    this.setState({
      showAddModal: false
    });
  };

  render = () => {
    const isMyInterpretation = isOwnedByCurrentCuratingEntity(this.props.interpretation, this.props.auth);
    const hasInterpretation = !!lodashGet(this.props.interpretation, 'PK');

    return (
      <section mb="5">
        <CardPanel mb="5" key={this.props.tableName} title={this.props.tableName}>
          <div>
            {!this.props.readOnly && isMyInterpretation ? 
              <table className="table">
                <tbody>
                  <tr>
                    <td colSpan="6" style={{border: 'none'}}>
                      <span>
                        <Row>
                          <Col md="12">
                            <select className="form-control case-seg-select-source" name="caseSegSource"defaultValue="select-source" onChange={this.setEvidenceType}>
                              <option value="select-source">Select Source</option>
                              <option disabled="disabled"></option>
                              <option value="PMID">PMID</option>
                              <option value="clinical_lab">Clinical Lab</option>
                              <option value="clinic">Clinic</option>
                              <option value="research_lab">Research Lab</option>
                              <option value="public_database">Database (if data exists in multiple sources, e.g. clinical lab, PMID, and database, please choose the most detailed source)</option>
                              <option value="other">Other</option>
                            </select>

                            <EvidenceModalManager
                              evidenceData={null}
                              selectedCriteriaList={this.props.criteriaList}
                              selectedEvidenceType={this.state.evidenceType}
                              selectedSubcategory={this.props.subcategory}
                              isNewEvidence={true}
                              auth={this.props.auth}
                              canCurrUserModifyEvidence={this.props.canCurrUserModifyEvidence}
                              interpretationCaseSegEvidences = {this.props.interpretationCaseSegEvidences}
                            >
                            </EvidenceModalManager>

                            {this.renderEvidenceText()}
                          </Col>
                        </Row>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table> 
            : !this.props.readOnly && !hasInterpretation ?
                <Alert type="warning" className="mb-2">
                  <FontAwesomeIcon icon={faInfoCircle} /> Please create interpretation before adding any curated evidence.
                </Alert>
            : null}
            <EvidenceTable
              allCaseSegEvidences={this.props.allCaseSegEvidences}
              interpretationCaseSegEvidences = {this.props.interpretationCaseSegEvidences}
              subcategory={this.props.subcategory}
              criteriaList={this.props.criteriaList}
              auth={this.props.auth}
              readOnly={this.props.readOnly}
              canCurrUserModifyEvidence={this.props.canCurrUserModifyEvidence}
            >
            </EvidenceTable>
          </div>
        </CardPanel>
      </section>
    );
  }
}
const mapStateToProps = state => ({
  auth: state.auth,
  interpretation: state.interpretation,
});
const AddCuratedEvidenceTable = connect(mapStateToProps)(AddCuratedEvidenceTableComponent);
export {
  AddCuratedEvidenceTable
};
