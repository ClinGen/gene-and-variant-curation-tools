import React, {Component} from 'react';
import axios from 'axios';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../../utils';
import { connect } from 'react-redux';
import moment from 'moment';
import { get as lodashGet, cloneDeep } from "lodash";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrashAlt, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { compareFormGroupValues, getGenomicLinkouts } from './helpers/helpers';
import { getHgvsNotation } from './helpers/hgvs_notation';
import DiseaseModal from '../common/DiseaseModal';
import InheritanceModal from './InheritanceModal';
import CodeStrip from './CodeStrip';
import Population from './tab-content/population/Population';
import VariantType from './tab-content/VariantType';
import { codeStripValues } from './mapping/CodeStripValues';
import GeneCentric from './tab-content/GeneCentric';
import Experimental from './tab-content/Experimental';
import CaseSegregation from './tab-content/CaseSegregation';
import Summary from './Summary';
import PathogenicityCalculator from './PathogenicityCalculator';
import { BasicInfoTabView } from '../variant-central/tab-content/BasicInfoTabView';
import { AmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { isOwnedByCurrentCuratingEntity } from '../../utilities/ownershipUtilities';

// Set Controlled forms to "not-evaluated" by default
const defaultForms = {};
codeStripValues.forEach(v => defaultForms[v.code] = {criteria: v.code, value: "not-evaluated", explanation: "" });

class VariantView extends Component {

    constructor(props) {
        super(props);
        this.initialState = {
            affiliation: lodashGet(this.props.auth, 'currentAffiliation', null),
            tabIndex: 0, // Index of current active tab
            subTabIndex: 0, // Index of sub-tabs in Variant Type Tab
            view: this.props.view, // Evidence or Interpretation View
            alertMessage: {},
            isLoading: {},
            interpretation: this.props.interpretation,
            variant: this.props.variant,
            evaluations: JSON.parse(JSON.stringify(defaultForms)),
            savedEvaluations: JSON.parse(JSON.stringify(defaultForms)),
            showDiseaseModal: false, // 'Disease' or 'Inheritance'
            showInheritanceModal: false,
            myVariantInfoData: {},
            isLoadingMyVariantInfo: false,
            calculatedPathogenicity: '',
            provisionalPathogenicity: '',
            publishProvisionalReady: false,
            publishSnapshotListReady: false,
            classificationStatus: '',
            classificationSnapshots: [],
            lovdLink: '',
            civicData: {},
            hasBrcaData: false,
            isLoadingLovd: false,
            isLoadingBrca: false,
            isLoadingCivic: false,
        };
        this.state = this.initialState;
        this.requestRecycler = new AmplifyAPIRequestRecycler();
        this.axioCanceller = axios.CancelToken.source();
    }

    componentDidMount(){
        this._mounted = true; // Boolean used to unsubuscribe
        
        this.fetchMyVariantInfo();
        this.fetchLovdLink();
        this.fetchBrcaData();
        this.fetchCivicData();

        // Check for evaluations in interpretations object, 
        // then loop through the PK values and pre-populate forms accordingly
        if (this.props.interpretation && this.props.interpretation.evaluations && this._mounted){
            this.props.interpretation.evaluations.forEach(val=>{
                const url ='/evaluations/' + val;
                this.requestRecycler.capture(API.get(API_NAME, url))
                .then(res => {
                    if (res){
                        const currentValues = cloneDeep(this.state.evaluations);
                        if (currentValues[res.criteria]){
                            currentValues[res.criteria].value = res.criteriaStatus !== 'met' ? 
                                (res.criteriaStatus === 'not-met' ? 'not-met' : 'not-evaluated') 
                                : (!res.criteriaModifier ? 'met' : res.criteriaModifier);
                            currentValues[res.criteria].criteriaStatus = res.criteriaStatus;
                            currentValues[res.criteria].criteriaModifier = res.criteriaModifier;
                            currentValues[res.criteria].explanation = res.explanation;
                            currentValues[res.criteria].functional = res.functional;
                            currentValues[res.criteria].population = res.population;
                            currentValues[res.criteria].computational = res.computational;
                            currentValues[res.criteria].PK = res.PK;
                            this.setState({
                                evaluations: currentValues,
                                savedEvaluations: currentValues
                            });
                        }
                    }
                })
                .catch(AmplifyAPIRequestRecycler.defaultCatch);
            })
        }
        else{
            this.resetEvaluationForms();
        }

        // Get Provisional Variant Object via PK in interpretation
        if (this.state.interpretation && this.state.interpretation.provisionalVariant) {
            const classification = this.state.interpretation.provisionalVariant;
            if (classification){
                this.props.setClassification(classification)
                this.setState({
                    classification: classification,
                    autoClassification: classification.autoClassification,
                    provisionalPathogenicity: classification.alteredClassification,
                    provisionalReason: classification.reason,
                    evidenceSummary: classification.evidenceSummary ? classification.evidenceSummary : null,
                    classificationStatus: classification.classificationStatus
                })
            }
            // If snapshots array is available inside interpretation, get those objects
            if (this.state.interpretation.snapshots){
                this.getSnapshotsByPK(this.state.interpretation.snapshots)
            }
        }

    }

    // Make sure local state gets updated when props change in parent
    static getDerivedStateFromProps(nextProps, prevState) {
        if (prevState.interpretation !== nextProps.interpretation) {
            return { interpretation: nextProps.interpretation }
        }
        if (prevState.view !== nextProps.view){
            if(nextProps.view === "Evidence"){ // Reset form state to default
                const defaultForms = {};
                codeStripValues.forEach(v => defaultForms[v.code] = {criteria: v.code, value: "not-evaluated", explanation: "" });
                return{view: nextProps.view, evaluations: defaultForms}
            }
            return{ view: nextProps.view }
        }

        return null;
    }

    componentWillUnmount() {
        this._mounted = false; // Unsubscribe
        this.requestRecycler.cancelAll();
        this.axioCanceller.cancel('Request cancelled');
    }

    /**
     * Retrieve data from MyVariantInfo
     * REVEL data is no longer queried from Bustamante lab
     * Since REVEL data is now available in the myvariant.info response
     * So we can access its data object via response['dbnsfp']['revel']
     * @param {object} variant - The variant data object
     */
    fetchMyVariantInfo() {
        this.setState({ isLoadingMyVariantInfo: true });
        const { variant } = this.props;
        const hgvs_notation = getHgvsNotation(variant, 'GRCh37');
        if (hgvs_notation) {
            axios.get(`https://myvariant.info/v1/variant/${hgvs_notation}`, { cancelToken: this.axioCanceller.token })
                .then(response => {
                    this.setState({ myVariantInfoData: response.data, isLoadingMyVariantInfo: false });
                })
                .catch(err => {
                    if (axios.isCancel(err)) {
                        return;
                    }
                    this.setState({ isLoadingMyVariantInfo: false });
                    console.log('MyVariant Fetch Error=: %o', err);
                });
        } else {
            this.setState({ isLoadingMyVariantInfo: false });
        }
    }

    // Query LOVD `whole_genome` and `shared` to decide which link to display
    fetchLovdLink() {
        this.setState({ isLoadingLovd: true });
        // @geneName parsed from preferredTitle and @variantOnGenome parsed from GRCh37
        const grch37 = lodashGet(this.props.variant, 'hgvsNames.GRCh37');
        const preferredTitle = lodashGet(this.props.variant, 'preferredTitle');
        const gIndex = grch37 && grch37.indexOf('g');
        const variantOnGenome = grch37 && gIndex && grch37.substring(gIndex, grch37.length - 3);
        const geneBeginIndex = preferredTitle && preferredTitle.indexOf('(');
        const geneEndIndex = preferredTitle && preferredTitle.indexOf(')');
        const geneName = preferredTitle && geneBeginIndex && geneEndIndex && preferredTitle.substring(geneBeginIndex + 1, geneEndIndex);
        if (geneName && variantOnGenome) {
            const url = `/variants?lovd=true&geneName=${geneName}&variantOnGenome=${variantOnGenome}`
            this.requestRecycler.capture(API.get(API_NAME, url))
                .then(result => {
                    this.setState({ lovdLink: result, isLoadingLovd: false });
                })
                .catch(err => {
                    if (axios.isCancel(err)) {
                        return;
                    }
                    console.log('LOVD error', err);
                    this.setState({ isLoadingLovd: false });
                });
        } else {
            this.setState({ isLoadingLovd: false });
        }
    }

    // Query CIViC for link in Other Evidence table - Basic info
    fetchCivicData() {
      this.setState({ isLoadingCivic: true });
      const clinvarVariantId = lodashGet(this.props.variant, 'clinvarVariantId');
      const carId = lodashGet(this.props.variant, 'carId');
      const url = carId
        ? `https://civicdb.org/api/variants/${carId}?identifier_type=allele_registry`
        : `https://civicdb.org/api/variants/${clinvarVariantId}?identifier_type=clinvar`;

      axios.get(url, { cancelToken: this.axioCanceller.token })
        .then(response => {
            this.setState({ civicData: response.data[0], isLoadingCivic: false });
        })
        .catch(err => {
            if (axios.isCancel(err)) {
                return;
            }
            this.setState({ isLoadingCivic: false });
            console.log('CIViC Fetch Error=: %o', err);
        });
    }

    fetchBrcaData() {
      this.setState({ isLoadingBrca: true });
      const carId = lodashGet(this.props.variant, 'carId');
      // This long URL should be replaced when BRCA Exchange implements &include=all querystring action
      const url = `https://brcaexchange.org/backend/data/?format=json&search_term=${carId}&include=Variant_in_ENIGMA&include=Variant_in_ClinVar&include=Variant_in_1000_Genomes&include=Variant_in_ExAC&include=Variant_in_LOVD&include=Variant_in_BIC&include=Variant_in_ESP&include=Variant_in_exLOVD&include=Variant_in_ENIGMA_BRCA12_Functional_Assays&include=Variant_in_GnomAD`;
      
      axios.get(url, { cancelToken: this.axioCanceller.token })
      .then(response => {
        // We only want to check if BRCA Exch. is returning data and checking CA_ID in response against carId
        if (response.data.data && response.data.data[0].CA_ID === carId) {
          this.setState({ hasBrcaData: true, isLoadingBrca: false });
        }
      })
      .catch(err => {
          if (axios.isCancel(err)) {
              return;
          }
          this.setState({ isLoadingBrca: false });
          console.log('BRCA Exchange Fetch Error=: %o', err);
      });

    }

    // For Disease Modal and Inheritance Modal
    setShowModal = (type, value) => {
        this.setState({ [`show${type}Modal`]: value });
    }

    handleDeleteDisease = async () => {
        const interpretation = JSON.parse(JSON.stringify(this.state.interpretation));
        interpretation.disease = null;
        interpretation.diseaseTerm = null;
        interpretation.modified_by = this.props.auth ? this.props.auth.PK : null;
        try {
            const url = '/interpretations/' + interpretation.PK;
            const params = {body: {interpretation}};
            let response;
            try {
                response = await this.requestRecycler.capture(API.put(API_NAME, url, params));
            } catch (error) {
                if (API.isCancel(error)) {
                    return;
                }
                throw error;
            }

            if (response) {
                this.props.handleInterpretationUpdate(response);
            }
        } catch (error) {
            console.log('Error updating interpretation with disease: ', error);
        }
    }

    resetEvaluationForms = () => {
        const defaultForms = {};
        codeStripValues.forEach(v => defaultForms[v.code] = {criteria: v.code, value: "not-evaluated", explanation: "" });
        this.setState({ evaluations: JSON.parse(JSON.stringify(defaultForms))})
    }
    render(){
        const { interpretation, handleInterpretationUpdate } = this.props;
        const isMyInterpretation = isOwnedByCurrentCuratingEntity(interpretation, this.props.auth);
        const inheritanceButtonStyle = interpretation && (interpretation.modeInheritance || interpretation.modeInheritanceAdjective)
            ? 'info' : 'secondary';
    // Variant Type Tab combines 4 groups
    const InterpretationHeader = () => {
        return(
            <div className="row">
                <div className="col-sm-6">
                    <h3 className="mb-3">Variant Interpretation Record</h3>
                </div>
                {isMyInterpretation ? <div className="col-sm-6 text-right">
                    {interpretation && interpretation.disease
                        ? <button className="btn btn-danger mr-1" onClick={this.handleDeleteDisease}>Disease <FontAwesomeIcon icon={faTrashAlt} /></button>
                        : <button className="btn btn-secondary mr-1" onClick={() => this.setShowModal('Disease', true)}>Disease <FontAwesomeIcon icon={faPlus} /></button>
                    }
                    <button className={`btn btn-${inheritanceButtonStyle}`} onClick={() => this.setShowModal('Inheritance', true)}>Inheritance  <FontAwesomeIcon icon={faEdit} /></button>
                </div> : null}
            </div>
        )
    }

    const evaluationProps = {
        evaluations: this.state.evaluations,
        selectChange: this.selectChangeHandler,
        textChange: this.textChangeHandler,
        onSubmitEval: this.submitForm,
        alert: this.state.alertMessage,
        loading: this.state.isLoading,
        view: this.state.view
    }

    if (this.state.view !== "Summary") {
        const completedSections = this.state.interpretation && this.state.interpretation.completed_sections ? this.state.interpretation.completed_sections : [];
        const { gRCh38, gRCh37 } = getGenomicLinkouts(this.props.variant);
        return(
            <>

            {this.state.view === "Interpretation" && (isOwnedByCurrentCuratingEntity(this.props.interpretation, this.props.auth)) ? (
                <>
                    <InterpretationHeader />
                    <PathogenicityCalculator interpretation={this.state.interpretation} 
                        evaluations={Object.values(this.state.savedEvaluations)}
                        setCalculatedPathogenicity={this.setCalculatedPathogenicity} 
                    />
                    <CodeStrip onSetTab={this.setTab} evaluations={this.state.savedEvaluations} />
                </>
            ) : (
                <h3 className="text-center">Evidence View</h3>
            )}
            
            <Tabs className="mt-3" selectedIndex={this.state.tabIndex} forceRenderTabPanel={true} onSelect={tabIndex => this.setTab(tabIndex)}>
                {/* Actual Tabs/Labels */}
                <TabList className="nav nav-tabs">
                    <Tab className="tab-link">Basic Information</Tab>
                    <Tab className="tab-link">Population {completedSections.indexOf('population') > -1 ? <FontAwesomeIcon icon={faCheck} /> : null}</Tab>
                    <Tab className="tab-link">Variant Type {completedSections.indexOf('variant-type') > -1 ? <FontAwesomeIcon icon={faCheck} /> : null}</Tab>
                    <Tab className="tab-link">Experimental {completedSections.indexOf('experimental') > -1 ? <FontAwesomeIcon icon={faCheck} /> : null}</Tab>
                    <Tab className="tab-link">Case/Segregation {completedSections.indexOf('segregation-case') > -1 ? <FontAwesomeIcon icon={faCheck} /> : null}</Tab>
                    <Tab className="tab-link">Gene-centric</Tab>
                </TabList>
    
                {/* Basic Info Tab Content */}
                <TabPanel className="tab-panel">
                    <BasicInfoTabView
                        clinvarVariantId={this.props.variant ? this.props.variant.clinvarVariantId : null}
                        carId={this.props.variant ? this.props.variant.carId : null}
                        GRCh37={gRCh37}
                        GRCh38={gRCh38}
                        lovdLink={this.state.lovdLink}
                        hasBrcaData={this.state.hasBrcaData}
                        civicData={this.state.civicData}
                        isLoadingBrca={this.state.isLoadingBrca}
                        isLoadingCivic={this.state.isLoadingCivic}
                        isLoadingLovd={this.state.isLoadingLovd}
                        externalAPIData={this.props.basicInfoTabExternalAPIData} 
                        basicInfoTabExternalAPILoadingStatus={this.props.basicInfoTabExternalAPILoadingStatus}
                        internalAPIData={this.props.interpretationsWithSnapshots}
                        basicInfoTabInternalAPILoadingStatus={this.props.internalAPILoadingStatus}
                    />
                </TabPanel>
    
                {/* Population Tab Content */}
                <TabPanel className="tab-panel">
                    <Population
                        {...evaluationProps}
                        myVariantInfoData = {this.state.myVariantInfoData}
                        isLoadingMyVariantInfo = {this.state.isLoadingMyVariantInfo}
                        updateTab = {this.setTab}
                    />
                </TabPanel>
    
                {/* Variant Type Tab */}
                <TabPanel className="tab-panel">
                    <VariantType {...evaluationProps} 
                        variant = {this.state.variant}
                        tabIndex = {this.state.subTabIndex}
                        activeCode = {this.state.activeCode}
                        subTabHandler = {this.setSubTab}
                        myVariantInfoData = {this.state.myVariantInfoData}
                        isLoadingMyVariantInfo = {this.state.isLoadingMyVariantInfo}
                        updateTab = {this.setTab}
                    />
                </TabPanel>

                {/* Experimental Tab */}
                <TabPanel className="tab-panel">
                    <Experimental {...evaluationProps}
                        updateTab = {this.setTab}
                    />
                </TabPanel>
                
                {/* Case Seg Tab */}
                <TabPanel className="tab-panel">
                    <CaseSegregation {...evaluationProps}
                        updateTab = {this.setTab}
                    />
                </TabPanel>

                {/* Gene-centric Tab */}
                <TabPanel className="tab-panel">
                    <GeneCentric 
                        externalAPIData={this.props.basicInfoTabExternalAPIData} 
                        basicInfoTabExternalAPILoadingStatus={this.props.basicInfoTabExternalAPILoadingStatus}
                    />
                </TabPanel>
            </Tabs>
                <DiseaseModal
                    show={this.state.showDiseaseModal}
                    onHide={() => this.setShowModal('Disease', false)}
                    id="addDiseaseModal"
                    title="Add Disease"
                    parentEndpoint="interpretations"
                    parentToInsertDisease={interpretation}
                    updateParentObj={handleInterpretationUpdate}
                    userPK={this.props.auth ? this.props.auth.PK : null}
                />

                <InheritanceModal
                    show={this.state.showInheritanceModal}
                    onHide={() => this.setShowModal('Inheritance', false)}
                    id="addInheritanceModal"
                    title="Associate this interpretation with a mode of inheritance"
                    interpretation={interpretation}
                    updateInterpretation={handleInterpretationUpdate}
                    userPK={this.props.auth ? this.props.auth.PK : null}
                />
            </>
        )
    }

    if (this.state.view === "Summary"){
        return(
            <>
            <Summary 
                affiliation={this.state.affiliation} // hard-coded in initialState for now
                interpretation={interpretation}
                variant={this.state.variant}
                evaluations={this.state.savedEvaluations}
                calculatedAssertion={this.state.calculatedPathogenicity}
                setProvisionalEvaluation={this.setProvisionalEvaluation}
                view={this.state.view}
                provisionalPathogenicity={this.state.provisionalPathogenicity}
                provisionalReason={this.state.provisionalReason}
                evidenceSummary={this.state.evidenceSummary}
                provisionalVariant={this.state.classification}
                updateProvisionalObj={this.updateProvisionalObj}
                updateSnapshotList={this.updateSnapshotList}
                classificationSnapshots={this.state.classificationSnapshots}
                classificationStatus={this.state.classificationStatus}
                updateParentObj={handleInterpretationUpdate}
                publishProvisionalReady={this.state.publishProvisionalReady}
                publishSnapshotListReady={this.state.publishSnapshotListReady}
                resetPublishReadyState={this.resetPublishReadyState}
            />
            </>
        )
    }
    
}

    // Manage Active Tabs via Code Strip & Tab clicks
    setTab = (index, code, subIndex) => {
        this.setState({ 
            tabIndex: index, // index of active tab
            activeCode: code, // value of code clicked in strip
            alertMessage: {} // need to make this dynamic, for now reset when tabs change
        });

        // Only for Variant Type "Sub Tabs"
        if (subIndex || subIndex === 0){
            this.setState({subTabIndex: subIndex})
        }
    }

    /**
     * Method to reset publish-related state data
     * Called when "ready to publish" flags can be reset:
     * 1) After they've been used to automatically display the publish panel
     * 2) At the end of every publish event **/
    resetPublishReadyState = () => {
        this.setState({publishProvisionalReady: false, publishSnapshotListReady: false});
    }

    // Method to set the calculated pathogenicity state for summary page
    setCalculatedPathogenicity = (assertion) => {
        if (assertion && this.state.calculatedPathogenicity !== assertion) {
            this.setState({calculatedPathogenicity: assertion});
            this.props.setCalculatedPathogenicity(assertion)
        }
    }
    // Method to persist provisional evaluation states
    setProvisionalEvaluation = (field, value) => {
        if (field === 'provisional-pathogenicity' && this.state.provisionalPathogenicity !== value) {
            this.setState({provisionalPathogenicity: value});
        }
        if (field === 'provisional-reason' && this.state.provisionalReason !== value) {
            this.setState({provisionalReason: value});
        }
        if (field === 'evidence-summary' && this.state.evidenceSummary !== value) {
            this.setState({evidenceSummary: value});
        }
    }
    /**
     * Method to retrieve the updated classification object and pass the updated state as a prop
     * back to the child components (e.g. provisional, approval).
     * Called as PropTypes.func in the child components upon the PUT request to update the classification.
     * @param {boolean} publishProvisionalReady - Indicator that (provisional) classification is ready for publish component (optional, defaults to false)
    **/
    updateProvisionalObj = (provisionalObj, publishProvisionalReady = false) => {
        // Get an updated copy of the classification object
        this.setState({
            classification: provisionalObj,
            classificationStatus: provisionalObj.classificationStatus,
            publishProvisionalReady: publishProvisionalReady
        });
        this.props.setClassification(provisionalObj)
    }

    // Takes an array of PKs (nested in the interpretation), and GETs the corresponding objects
    // sending each object to be added to the running snapshot object list in local state
    getSnapshotsByPK = (PKArray) => {
        if (PKArray){
            PKArray.forEach(snapshotPK=>{
                const url ='/variants/' + snapshotPK;
                this.requestRecycler.capture(API.get(API_NAME, url)).then(snapshot => {
                    this.updateSnapshotList(snapshot);
                })
                .catch(err => {
                    if (API.isCancel(err)) {
                        return;
                    }
                    console.log('get snapshot error', err);
                })
            })
        }
        
    }

    /**
     * Method to retrieve the given snapshot object and concat with (or refresh) the existing snapshot list.
     * Then pass the updated state as a prop back to the child components (e.g. provisional, approval)
    **/

    updateSnapshotList = (snapshot, publishSnapshotListReady = false) => {
        let classificationSnapshots = this.state.classificationSnapshots;
        let isNewSnapshot = true;
        // Check if snapshot already exists
        if (classificationSnapshots) {
           if (classificationSnapshots.find(snapshotObj => (snapshotObj['PK'] && snapshotObj['PK'] === snapshot['PK']))) {
               isNewSnapshot = false;
           }
        }

        if (isNewSnapshot) {
            const newClassificationSnapshots = [snapshot, ...classificationSnapshots];
            
            if (publishSnapshotListReady) {
                this.setState({classificationSnapshots: newClassificationSnapshots, publishSnapshotListReady: publishSnapshotListReady});
            } else {
                this.setState({classificationSnapshots: newClassificationSnapshots});
            }
        } else {
                this.setState({classificationSnapshots: classificationSnapshots});
        }
    }

    // Method to persist provisional evaluation states
    setProvisionalEvaluation = (field, value) => {
        if (field === 'provisional-pathogenicity' && this.state.provisionalPathogenicity !== value) {
            this.setState({provisionalPathogenicity: value});
        }
        if (field === 'provisional-reason' && this.state.provisionalReason !== value) {
            this.setState({provisionalReason: value});
        }
        if (field === 'evidence-summary' && this.state.evidenceSummary !== value) {
            this.setState({evidenceSummary: value});
        }
    }

    // Set Active Sub-Tabs in VariantType
    setSubTab = (index) => {
        this.setState({ subTabIndex: index, activeCode: null, alertMessage: {} });
    }

    // Handle updates to evaluation select values by code
    selectChangeHandler = (event, code) => {
        const currentValues = cloneDeep(this.state.evaluations);
        currentValues[code].value = event.target.value;

        // set criterion status and modifiers
        if (currentValues[code].value !== "not-met" && currentValues[code].value !== "not-evaluated" && currentValues[code].value !== "met") {
            // if dropdown selection is a modifier to met, set status to met, and set modifier as needed...
            currentValues[code].criteriaStatus = "met";
            currentValues[code].criteriaModifier = event.target.value;
        }
        else {
            // ... otherwise, set status as dropdown value, and blank out modifier
            currentValues[code].criteriaStatus = event.target.value;
            currentValues[code].criteriaModifier = '';
        }

        this.setState({ evaluations: currentValues, activeCode: null });
    }

    // Handle updates to evaluation textareas by code
    textChangeHandler = (event, code) => {
        const currentValues = cloneDeep(this.state.evaluations);
        currentValues[code].explanation = event.target.value;
        this.setState({ evaluations: currentValues, activeCode: null });
    }

    // Clicking Save button
    // values = evaluation form values
    // groups determine where the "or" logic goes
    submitForm = (event, values, groups, additionalData) => {
        // Commenting .... No Need to have an existing interpretation
        if (this.props.variant.PK){
        //if (this.props.variant.PK && this.state.interpretation.PK){
            if (!compareFormGroupValues(values, groups)){
                const flatGroups = Array.isArray(groups) && groups.flat();
                const loadingIdentifier = flatGroups[0];
                this.setState({ alertMessage: {}, isLoading: { [loadingIdentifier]: true } });
                const promises = Object.values(values).map(async value => {
                    // POST to /evaluations
                    // Object to get POSTed to /evaluations
                    const evaluationObject = {
                        submitted_by: this.props.auth.PK,
                        modified_by: this.props.auth ? this.props.auth.PK : null,
                        affiliation: this.state.affiliation ? this.state.affiliation.affiliation_id : null,
                        date_created:moment(new Date()),
                        last_modified:moment(new Date()),
                        variant:this.props.variant.PK,
                        criteria:value.criteria,
                        criteriaStatus:value.criteriaStatus,
                        criteriaModifier: value.criteriaModifier || null,
                        explanation: value.explanation || null,
                        ...additionalData
                    };
                    const valueObject = { ...value, ...additionalData };
                    return this.saveEvaluation(valueObject, evaluationObject);
                });

                // Wait for above to PUT evaluation PKs array to /interpretations
                const evalPKs = this.state.interpretation && this.state.interpretation.evaluations && this.state.interpretation.evaluations.length
                    ? cloneDeep(this.state.interpretation.evaluations)
                    : [];
                Promise.all(promises).then((evals) => {
                    const currentValues = Object.values(this.state.evaluations);
                    if (currentValues && evals) {
                        currentValues.forEach((value) => {
                            // add current PK if not already in the evalPKs list
                            if (value && value.PK && !evalPKs.includes(value.PK)) {
                                evalPKs.push(value.PK);
                            }
                        });
                        this.updateInterpretationEvaluations(evalPKs, this.state.interpretation.PK, loadingIdentifier);
                    }
                });
            }
        }
    }

    // POST or PUT to /evaluations
    // TO-DO: Check for change before updating evaluation and making unnecessary endpoint calls
    saveEvaluation = async (valueObject, object) => {
        const postURL = '/evaluations';
        const putURL = `/evaluations/${valueObject.PK}`;
        const evalObject = object;
        const currentEval = this.state.evaluations[valueObject.criteria];

        // Otherwise POST a new evaluation
        if (currentEval && !currentEval.PK) {
            const params = {body: {evalObject}}
            await this.requestRecycler.capture(API.post(API_NAME, postURL, params))
            .then(data => {
                if (data) {
                    valueObject.PK = data.PK;
                    this.setState(prevState => {
                        const newEvaluations = {
                            ...prevState.evaluations,
                            [data.criteria]: valueObject
                        };
                        return ({
                            evaluations: newEvaluations,
                            savedEvaluations: newEvaluations
                        });
                    });
                    return data.PK;
                }
            })
            .catch(AmplifyAPIRequestRecycler.defaultCatch);
        } else if (currentEval && currentEval.PK) {
            // If PK available, PUT to update evaluation
            evalObject.PK = currentEval.PK;
            const params = {body: {evalObject}}
            let data;
            try {
                data = await this.requestRecycler.capture(API.put(API_NAME, putURL, params))
                if (data) {
                    valueObject.PK = data.PK;
                    this.setState(prevState => {
                        const savedEvaluations = {
                            ...prevState.evaluations,
                            [data.criteria]: valueObject
                        };
                        return ({ savedEvaluations });
                    });
                }
            } catch (error) {
                if (API.isCancel(error)) {
                    return;
                }
                throw error;
            }

            if (data && data.PK){
                return data.PK;
            }
        }
        else{
            console.log("Nothing to update?", this.state.evaluations[valueObject.criteria]);
            return null;
        }
    }

    // PUT to /interpretations/PK with array of evaluations
    updateInterpretationEvaluations = (evals, PK, loadingIdentifier) => {
        if (evals && PK) {
            const newInterpretation = cloneDeep(this.state.interpretation);
            newInterpretation.evaluations = evals;
            this.setState({ interpretation: newInterpretation });
            this.props.handleInterpretationUpdate(newInterpretation);

            const evalObject = {
                evaluations: evals,
                // save calculatedPathogenicity here to display on dashboard
                // in the case that a provisionalVariant has not yet been saved.
                pathogenicity: this.state.calculatedPathogenicity,
                modified_by: this.props.auth ? this.props.auth.PK : null
            };
            const interpURL = '/interpretations/' + PK;
            const params = {body: {evalObject}}
            this.requestRecycler.capture(API.put(API_NAME, interpURL, params))
            .then(response => {
                //Add success alert message
                this.setState({
                    alertMessage: {
                        id: loadingIdentifier,
                        type: "success",
                        message: "Save Successful!"
                    },
                    isLoading: { [loadingIdentifier]: false }
                });
            })
            .catch(err => {
                if (API.isCancel(err)) {
                    return;
                }
                this.setState({ isLoading: { [loadingIdentifier]: false } })
                console.log(err);
            });
        }
        else{
            console.log("Error with submission! Please verify your selections and resubmit.")
        }
        
    }
}

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(mapStateToProps)(VariantView);
