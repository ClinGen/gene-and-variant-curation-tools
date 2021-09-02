import React, { Component } from 'react';
//import { withCustomAuthenticator } from '../components/CustomAuthenticator';
import VariantResult from '../components/VariantResult';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import { AmplifyAPIRequestRecycler } from "../utilities/fetchUtilities";
import { get as lodashGet } from "lodash";
import { EXTERNAL_API_MAP } from '../constants/externalApis';

/*
* SelectVariant page
* export select variant component with access to
* API searching and saving variant info to the db
* PropTypes: no current proptypes
 */
class SelectVariant extends Component {
  // We set customerSelectOption to false for the time being, so we can
  // present a UX pattern that leaves a single search box that checks both
  // registries. From there we can display result(s) from both, but
  // almost never will we have results from both, so this should simplify
  constructor(props) {
    super(props);
    this.customerSelectOption = false;
    this.requestRecycler = new AmplifyAPIRequestRecycler();
    this.state = {
      clinGenResults: null,
      clinVarResults: null,
      variantIdType: this.customerSelectOption ? null : 'ClinGen/ClinVar',
      outstandingRequests: 0,
      clingenId: '',
      clinvarId: '',
      searchSubmitted: false,
      isLoading: false,
      variantResultErrorMessage: ''
    };
    this.handleCollapseTrigger = this.handleCollapseTrigger.bind(this);
    this.handleEntry = this.handleEntry.bind(this);
    this.getVariant = this.getVariant.bind(this);
    this.getVariantInfo = this.getVariantInfo.bind(this);
    this.getClinVarResults = this.getClinVarResults.bind(this);
    this.getClinGenResults = this.getClinGenResults.bind(this);
  }

  componentWillUnmount() {
    this.requestRecycler.cancelAll();
  }

  handleCollapseTrigger = (e) => {
    if (e.target) {
      if (e.target.text === 'more...') {
        e.target.text = 'less...';
      } else {
        e.target.text = 'more...';
      }
    }
  };

  handleClinVarEntry = (e) => {
    this.setState({
      variantIdType: 'ClinVar',
      clingenId: '',
      clinvarId: e.target.value,
    });
  };

  handleClinGenEntry= (e) => {
    this.setState({
      variantIdType: 'ClinGen Allele Registry',
      clingenId: e.target.value,
      clinvarId: '',
    });
  };

  handleEntry= (e) => {
    this.setState({
      variantIdType: 'ClinVar',
      clinvarId: e.target.value,
    });
  };

  getClinGenResults = () => {
    const { clinvarId } = this.state;
    const url = '/variants?carId=' + clinvarId;
    this.getResults(url, (d) => this.setState({ clinVarResults: d }));
  };
  
  getClinVarResults = () => {
    const { clinvarId } = this.state;
    const url = '/variants?clinvarVariantId=' + clinvarId;
    this.getResults(url, (d) => this.setState({ clinVarResults: d }));
  };

  getResults = (url, setData) => {
    this.outstandingRequests += 1;
    this.setState({ outstandingRequests: this.outstandingRequests, isLoading:true });
    this.requestRecycler.capture(API.get(API_NAME, url)).then(data => {
      setData(data);
      this.outstandingRequests -= 1;
      this.setState({ outstandingRequests: this.outstandingRequests, isLoading:false });
    })
    .catch(error => {
      if (API.isCancel(error)) {
        return;
      }
      const detailErrorMessageFromServer = lodashGet(error, "response.data.error");
      let humanizeMessage = `Oops! Can't retrieve the variant. `
      if (detailErrorMessageFromServer) {
        humanizeMessage += `Here's more detail: ${detailErrorMessageFromServer}`;
      }

      this.setState({ isLoading: false, errorMessage: humanizeMessage });
    });
  };

  getVariant = (id, fn) => {
    if (!id) { return; }
    fn();
  };

  getVariantInfo = (e) => {
    const clinVarIdRegex = new RegExp('^[0-9]+$');
    const clinGenIdRegex = new RegExp('CA*');
    this.setState({ clinGenResults: null, clinVarResults: null, searchSubmitted: true });

    if (clinVarIdRegex.test(this.state.clinvarId)){
      this.setState({variantIdType: 'ClinVar'})
      this.getVariant(this.state.clinvarId, this.getClinVarResults);
    }
    if (clinGenIdRegex.test(this.state.clinvarId)){
      this.setState({variantIdType: 'ClinGen Allele Registry'})
      this.getVariant(this.state.clinvarId, this.getClinGenResults);
    }
    e.preventDefault();
  };

  render = () => {
    const {
      outstandingRequests,
      clinVarResults,
    } = this.state;
    return (
      
      <>
       
        <div className="jumbotron">
          <div className="container"> 
          <h1>Search and Select Variant</h1>
          <div className="text-muted mb-3">
            This version of the interface returns evidence for SNVs (single nucleotide variants) and for some small duplications, insertions, and deletions.
            <div className="collapse" id="collapseAlertNote">We are currently working to optimize the evidence returned for other variant types. However, the interface supports the evaluation/interpretation of any variant.</div>
            <div><a data-toggle="collapse" href="#collapseAlertNote" role="button" aria-expanded="false" aria-controls="collapseAlertNote" onClick={this.handleCollapseTrigger}>more...</a></div>
          </div>
          <form className="form-row" onSubmit={this.getVariantInfo}>
            {this.customerSelectOption
              && (
                <>
                  <div className="form-group col-md-4">
                    <input className="form-control form-control-lg" 
                      value={this.state.clinvarId} 
                      onChange={this.handleClinVarEntry} 
                      placeholder="ClinVar Variation ID" />
                    
                  </div>
                  <div className="col-md-2 text-center"><h2>OR</h2></div>
                  <div className="form-group col-md-4">
                    <input className="form-control form-control-lg" 
                    value={this.state.clingenId} 
                    onChange={this.handleClinGenEntry} 
                    placeholder="ClinGen Allele Registry ID" />
                  </div>
                </>
              )}
            {!this.customerSelectOption
              && (
                <>
                  <div className="form-group col-md-9">
                    <label className="col-form-label-lg text-muted">ClinVar Variation ID or ClinGen Allele Registry ID</label>
                    <input className="form-control form-control-lg" 
                    value={this.state.clinvarId} 
                    onChange={this.handleEntry} 
                    placeholder="e.g. 139214 or CA003323" />
                  </div>
                  </>
              )}

              <div className="form-group col-md-2 mt-auto">
                <input className="btn btn-primary btn-lg btn-block" type="submit" value="Retrieve" />
              </div>
          </form>
          </div>
        </div>
        <div className="container">
          {!!outstandingRequests && <div>Processing...please wait</div> }
          {this.state.searchSubmitted && (
            <VariantResult 
              variant={clinVarResults} 
              isLoading={this.state.isLoading} 
              variantType={this.state.variantIdType} 
              errorMessage={this.state.errorMessage} /> 
          )}
          
          <div className="jumbotron jumbotron-fluid bg-white">
            <div className="container">
              <h1 className="display-4">Getting Started?</h1>
              <ol className="list-group">
                <li className="list-group-item">
                  <h5>Search <a href={EXTERNAL_API_MAP['ClinVar']} target="_blank" rel="noopener noreferrer">ClinVar</a> for variant.</h5>
                  The ClinVar Variation ID can be found within the light blue box at the top of every record in ClinVar 
                  (example: <a href={EXTERNAL_API_MAP['ClinVarSearch'] + '139214'} target="_blank" rel="noopener noreferrer">139214</a>).
                </li>
                <li className="list-group-item">
                <h5>If variant NOT found?</h5>
                  Search the <a href={EXTERNAL_API_MAP['CAR']} target="_blank" rel="noopener noreferrer">ClinGen Allele Registry</a> with 
                  a valid HGVS term for that variant.
                  <ul>
                    <li>
                      If <a href={EXTERNAL_API_MAP['CAR']} target="_blank" rel="noopener noreferrer">ClinGen Allele Registry</a> returns 
                      a ClinVar Variation ID, enter it in the variant search field above.
                    </li>
                    <li>
                      If <a href={EXTERNAL_API_MAP['CAR']} target="_blank" rel="noopener noreferrer">ClinGen Allele Registry</a> does not 
                      find a ClinVar Variation ID, register the variant to return a ClinGen Allele Registry ID (CA ID) and then enter that 
                      in the variant search field above.
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>

        </div>
      </>
    );
  };
}

export default SelectVariant;
// export default withCustomAuthenticator(SelectVariant);
