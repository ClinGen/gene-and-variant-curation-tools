import React, { Component } from "react";
import { orderBy as lodashOrderBy, get as lodashGet } from "lodash";
import { connect } from "react-redux";
import { Row, Col } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { isEmpty } from "lodash";

import CardPanel from "../../common/CardPanel";
import Popover from "../../common/Popover";
import EvaluationForm from "../../EvaluationForm";
import { CompleteSection } from "./CompleteSection";
import { filterCodeStripObjects, evaluationsByGroup } from "../helpers/helpers";
import { MasterEvidenceTable } from "./caseSegregation/MasterEvidenceTable";
import { AddCuratedEvidenceTable } from "./caseSegregation/AddCuratedEvidenceTable";
import { curatedEvidenceHasSourceInfo } from "../helpers/curated_evidence_version";
import { AddArticleEvidenceTableView } from "./ArticleEvidenceTableView";

// Case/Segregation Tab Content
// State mostly handled in Parent (InterpretationView)

class CaseSegregation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      auth: this.props.auth,
      variant: this.props.variant,
      interpretation: this.props.interpretation,
      curatedEvidences: this.props.curatedEvidences,
      allCaseSegregationEvidences: [],
      interpretationCaseSegEvidences: [],
      interpretationCaseSegOldArticleEvidences: []
    };
  }

  componentDidMount = () => {
    // Get case segregation evidences and store in state
    const allCaseSegregationEvidences = this.getAllCaseSegEvidences();
    const interpretationCaseSegEvidences = this.getInterpretaionCuratedEvidences();
    const interpretationCaseSegOldArticleEvidences = this.getInterpretationOldArticleEvidences();
    this.setState({ 
      allCaseSegregationEvidences, 
      interpretationCaseSegEvidences,
      interpretationCaseSegOldArticleEvidences,
    });
  };
  
  componentDidUpdate = (prevProps) => {
    // Reset case segregation evidences if things changed
    if ((this.props.interpretation !== prevProps.interpretation) ||
      (this.props.curatedEvidences !== prevProps.curatedEvidences)) {
      const allCaseSegregationEvidences = this.getAllCaseSegEvidences();
      const interpretationCaseSegEvidences = this.getInterpretaionCuratedEvidences();
      const interpretationCaseSegOldArticleEvidences = this.getInterpretationOldArticleEvidences();
      this.setState({ 
        allCaseSegregationEvidences, 
        interpretationCaseSegEvidences,
        interpretationCaseSegOldArticleEvidences,
      });
    }
  };

  componentWillUnmount = () => {
  };
 
  getAllCaseSegEvidences = () => {
    // get the list of case segregation curated evidences in all interpretations of current variant
    // but only include evidences that are curated in new format with sourceInfo data
    const caseSegCuratedEvidences = (
      this.props.curatedEvidences.byCategory["case-segregation"] || []
    )
      .map((PK) => this.props.curatedEvidences.byPK[PK])
      .filter((curatedEvidence) => curatedEvidenceHasSourceInfo(curatedEvidence));

    const relevantEvidenceList = lodashOrderBy(
      caseSegCuratedEvidences,
      ["date_created"],
      "desc"
    );

    return relevantEvidenceList;
  };

  getInterpretaionCuratedEvidences = () => {
    // Get the list of case segregation curated evidences in current interpretation 
    // but only include evidences that are curated in new format with sourceInfo data
    if (!isEmpty(this.props.interpretation)) {
      const curatedEvidenceList = (
        this.props.interpretation.curated_evidence_list || []
      )
        .map((PK) => this.props.curatedEvidences.byPK[PK])
        .filter((curatedEvidence) => (curatedEvidence && 'category' in curatedEvidence) &&
          (curatedEvidence.category === "case-segregation"))
        .filter((curatedEvidence) => curatedEvidenceHasSourceInfo(curatedEvidence));

      return curatedEvidenceList;
    }
    return [];
  };

  getInterpretationOldArticleEvidences = () => {
    // Get the list of case segregation old article evidences in current interpretation 
    // include evidences that has no sourceInfo data
    if (!isEmpty(this.props.interpretation)) {
      const articleEvidenceList = (
        this.props.interpretation.curated_evidence_list || []
      )
        .map((PK) => this.props.curatedEvidences.byPK[PK])
        .filter((curatedEvidence) => (curatedEvidence && 'category' in curatedEvidence) &&
            curatedEvidence.category === "case-segregation")
        .filter((curatedEvidence) => !curatedEvidenceHasSourceInfo(curatedEvidence));

      return articleEvidenceList;
    }
    return [];
  };

  hasOldArticleEvidence = (subcategory) => {
    const articleEvidences = (
      this.state.interpretationCaseSegOldArticleEvidences || []
    )
      .filter((articleEvidence) => articleEvidence.subcategory === subcategory);

    return articleEvidences.length;
  };

  renderMasterTable = () => {
    return (
      <MasterEvidenceTable
        allCaseSegEvidences = {this.state.allCaseSegregationEvidences}
        readOnly={this.props.variant && isEmpty(this.props.interpretation)}
        auth={this.props.auth}
      />
    );
  };

  render = () => {
    const {
      view,
      selectChange,
      textChange,
      alert,
      loading,
      evaluations,
      onSubmitEval
    } = this.props;

    const infoText = 'The evidence shown in this table was added in a format that has now been retired.  To include retired format evidence in the new granular format then you will have to re-add each one manually. You can start this process by clicking the "Add in New Format" button next to each evidence. Once you have transferred a retired format evidence to the new format and it appears in the new table, then please go ahead and delete the retired format version.';
    const infoPopover = <Popover
      triggerComponent={<FontAwesomeIcon className="text-info" icon={faInfoCircle}/>}
      content={infoText}
      placement="top"
    />

    const panel_data = [
      {
        title: 'Observed in healthy adult(s)',
        key: 1,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-observed-in-healthy',
        criteria: ['BS2'],
        loadingId: 'BS2',
        curatedEvidence: {
          subcategory: 'observed-in-healthy',
          tableName: <span>Curated Evidence (Observed in healthy adult(s))</span>,
          oldTableName: <span>Curated Literature Evidence (Observed in healthy adult(s)) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: 'Case-control',
        key: 2,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-case-control',
        criteria: ['PS4'],
        loadingId: 'PS4',
        curatedEvidence: {
          subcategory: 'case-control',
          tableName: <span>Curated Evidence (Case-control)</span>,
          oldTableName: <span>Curated Literature Evidence (Case-control) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: 'Segregation data',
        key: 3,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-segregation-data',
        criteria: ['BS4', 'PP1'],
        criteriaCrossCheck: [['BS4'], ['PP1']],
        loadingId: 'BS4',
        curatedEvidence: {
          subcategory: 'segregation-data',
          tableName: <span>Curated Evidence (Segregation data)</span>,
          oldTableName: <span>Curated Literature Evidence (Segregation data) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: <span><i>de novo</i> occurrence</span>,
        key: 4,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-de-novo',
        criteria: ['PM6', 'PS2'],
        criteriaCrossCheck: [['PM6'], ['PS2']],
        loadingId: 'PM6',
        curatedEvidence: {
          subcategory: 'de-novo',
          tableName: <span>Curated Evidence (<i>de novo</i> occurrence)</span>,
          oldTableName: <span>Curated Literature Evidence (<i>de novo</i> occurrence) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: <span>Allele data (<i>cis/trans</i>)</span>,
        key: 5,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-allele-data',
        criteria: ['BP2', 'PM3'],
        criteriaCrossCheck: [['BP2'], ['PM3']],
        loadingId: 'BP2',
        curatedEvidence: {
          subcategory: 'allele-data',
          tableName: <span>Curated Evidence (Allele Data (<i>cis/trans</i>))</span>,
          oldTableName: <span>Curated Literature Evidence (Allele Data (<i>cis/trans</i>)) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: 'Alternate mechanism for disease',
        key: 6,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-alternate-mechanism',
        criteria: ['BP5'],
        loadingId: 'BP5',
        curatedEvidence: {
          subcategory: 'alternate-mechanism',
          tableName: <span>Curated Evidence (Alternate mechanism for disease)</span>,
          oldTableName: <span>Curated Literature Evidence (Alternate mechanism for disease) - Retired Format - {infoPopover}</span>
        }
      },
      {
        title: 'Specificity of phenotype',
        key: 7,
        bodyClassName: 'panel-wide-content',
        panelClassName: 'tab-segegration-panel-specificity-of-phenotype',
        criteria: ['PP4'],
        loadingId: 'PP4',
        curatedEvidence: {
          subcategory: 'specificity-of-phenotype',
          tableName: <span>Curated Evidence (Specificity of phenotype)</span>,
          oldTableName: <span>Curated Literature Evidence (Specificity of phenotype) - Retired Format - {infoPopover}</span>
        }
      }
    ];

    // Props to pass to every Evaluation Form
    const formProps = {
      textChange: textChange,
      selectChange: selectChange,
      onSubmitEval: onSubmitEval,
    };

    const panelsWithCuratedEvidences = panel_data.map(panel => {
      const criteriaArray = [];
      criteriaArray.push(panel.criteria);
      let evaluationForm = null;
      if (view === "Interpretation") {
        const criteriaArray = [];
        criteriaArray.push(panel.criteria);
        evaluationForm = <EvaluationForm {...formProps}
          evaluations={evaluationsByGroup(criteriaArray, evaluations)}
          criteria={filterCodeStripObjects(panel.criteria)}
          criteriaGroups={criteriaArray}
          criteriaCrossCheck={panel.criteriaCrossCheck}
          loading={loading[panel.loadingId]}
          alert={alert && alert.id === panel.loadingId ? alert : {}}
        />
      }

      const addCuratedEvidenceTable = <AddCuratedEvidenceTable
        tableName={panel.curatedEvidence.tableName}
        category="case-segregation"
        subcategory={panel.curatedEvidence.subcategory}
        criteriaList={panel.criteria}
        readOnly={this.props.variant && isEmpty(this.props.interpretation)}
        allCaseSegEvidences = {this.state.allCaseSegregationEvidences}
        interpretationCaseSegEvidences = {this.state.interpretationCaseSegEvidences}
        auth={this.props.auth}
      />

      // need to add old evidence table to support old case segregation evidences
      const oldEvidenceTable = <CardPanel
        title={panel.curatedEvidence.oldTableName}>
          <AddArticleEvidenceTableView 
            category="case-segregation"
            subcategory={panel.curatedEvidence.subcategory}
            criteriaList={panel.criteria}
          />
        </CardPanel>

      return (
        <CardPanel key={panel.key}
          title={panel.title}
        >
          {evaluationForm}
          {addCuratedEvidenceTable}
          {this.hasOldArticleEvidence(panel.curatedEvidence.subcategory) > 0 && (
            oldEvidenceTable
          )}
        </CardPanel>
      );
    });

    return (
      <>
      {view === "Interpretation" && (
        <p className="alert alert-warning">
          All information entered and accessed in the ClinGen curation interfaces should be considered publicly accessible, and may not include <a className="external-link" target="_blank" rel="noopener noreferrer" href="//www.hipaajournal.com/considered-phi-hipaa/">protected health information (PHI)</a> or equivalent identifiable information as defined by regulations in your country or region. For more information about ClinGen policies on data sharing, please refer to the <a className="external-link" target="_blank" href="/terms-of-use">Terms of Use</a>.
        </p>
      )}

      {this.renderMasterTable()}

      {panelsWithCuratedEvidences}

      <CardPanel key="reputable-section" title="Reputable source">
        {view === "Interpretation" && (
          <Row>
            <Col sm="12">
              <p className="alert alert-warning">ClinGen has determined that the following rules should not be applied in any context.</p>
              <EvaluationForm {...formProps}
                evaluations = {evaluationsByGroup([['BP6', 'PP5']], evaluations)}
                criteria = {filterCodeStripObjects(['BP6', 'PP5'])}
                criteriaGroups = {[['BP6', 'PP5']]}
                disabled
              />
            </Col>
          </Row>
        )}
      </CardPanel>
      {view === "Interpretation" && (
        <CompleteSection tabName="segregation-case" updateTab={this.props.updateTab} />
      )}
      </>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  variant: state.variant,
  interpretation: state.interpretation,
  curatedEvidences: state.curatedEvidences,
});

export const canCurrUserModifyEvidence = (auth, evidence) => {
  // Set if logged in user can edit/delete given evidence
  const evidenceAffId = lodashGet(evidence, "affiliation", null);
  const evidenceUserId = lodashGet(evidence, "submitted_by.PK", null);
  const authAffId = lodashGet(auth, "currentAffiliation.affiliation_id", null);
  const authUserId = lodashGet(auth, "PK", null);

  return (
    (evidenceAffId && authAffId && evidenceAffId === authAffId) ||
    (!evidenceAffId && !authAffId && evidenceUserId === authUserId)
  );
};

export default connect(mapStateToProps)(CaseSegregation);
