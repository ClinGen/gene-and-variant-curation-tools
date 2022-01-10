/* eslint-disable react/prop-types */
// TODO: Use prop-types. Current implementation of this rule doesn't handle this component form
import React from 'react';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from '../utils';
import { useHistory } from "react-router-dom";
import { connect, useSelector } from 'react-redux';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import { updateVariant, updateInterpretation } from '../actions/actions';
import { AmplifyAPIRequestRecycler, useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { EXTERNAL_API_MAP } from '../constants/externalApis';

/**
 * Stateless functional component to render single variant search result
*/

const VariantResult = (props) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const history = useHistory();
  const { variant, variantType, isLoading, errorMessage = 'No Results Found' } = props;

  const auth = useSelector(state => state.auth);

  const saveSubmit = async (variant) => {
    console.log('variant', variant);
    //POST to /variants, passing variant JSON object
    const url = '/variants';
    variant.submitted_by = auth.PK;
    variant.modified_by = auth ? auth.PK : null;
    const params = {body: {variant}}

    await requestRecycler.capture(API.post(API_NAME, url, params))
    .then(data => { 
      console.log('variant data', data);
      //Add PK value to variant object
      const updatedVariant = variant;
      updatedVariant.PK = data.PK;
      // and store in redux
      props.dispatch(updateVariant(updatedVariant));
      //Redirect to variant-central page via PK value
      history.push(`/variant-central/${data.PK}`)
    })
    .catch(AmplifyAPIRequestRecycler.defaultCatch);
  }
  
  if (!variant & !isLoading ) { //No results
    return(
      <Alert value={errorMessage} type="danger" dismissible={false} /> 
    ); 
  }
  if ( isLoading ) { //Loading State
    return( 
      <LoadingSpinner />
    ); 
  }
  
  if (variant){
    const {
      preferredTitle,
      carId,
      clinvarVariantId,
      hgvsNames,
      molecularConsequenceList,
    } = variant;
    return (
      <div className="card mb-5">
        <h5 className="card-header">
            <div className="row no-gutter align-items-center">
                <div className="col-sm-9">
                  <h3 className="mb-0">{preferredTitle || "--"}</h3>
                </div>
                <div className="col-sm-3 text-right">
                  <button type="button" 
                    onClick={() => saveSubmit(variant)} 
                    className="btn btn-primary btn-block">
                      Save and View Evidence 
                  </button>
                </div>
            </div>
        </h5>
        <div className="card-body">
          <p className="lead"><span className="badge badge-info mr-1">{variantType}</span></p> 
          <div className="row no-gutters">
            <div className="col-sm-4"><label>CA ID:</label></div>
            <div className="col-sm-8">
                <a href={EXTERNAL_API_MAP['CARallele'] + carId + '.html'} rel="noopener noreferrer" target="_blank">
                  <strong>{carId}</strong>
                </a>
            </div>
          </div>
          <div className="row no-gutters">
            <div className="col-sm-4"><label>ClinVar Variation ID:</label></div>
            <div className="col-sm-8">
                <a href={EXTERNAL_API_MAP['ClinVarSearch'] + clinvarVariantId} rel="noopener noreferrer" target="_blank">
                  <strong>{clinvarVariantId}</strong>
                </a>
            </div>
          </div>
          <div className="row no-gutters">
            <span className="col-sm-4 control-label">
              <span>HGVS terms</span>
            </span>
            <span className="col-sm-8 text-no-input">
              <div>
                <span>
                  <span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh38}>
                    {hgvsNames.GRCh38}
                    (GRCh38)
                  </span>
                  <br />
                </span>
                <span>
                  <span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh37}>
                    {hgvsNames.GRCh37}
                    (GRCh37)
                  </span>
                  <br />
                </span>
                {molecularConsequenceList && molecularConsequenceList.map((obj, i) => (
                  <span key={i}>
                    <span>
                      <span className="title-ellipsis title-ellipsis-shorter dotted" title="{obj.hgvsName}">
                        {obj.hgvsName}
                      </span>
                      <br />
                    </span>
                  </span>
                ))}
              </div>
            </span>
        </div>
        </div>
      </div>
    );
  }
  
};

const mapStateToProps = state => ({
  auth: state.auth,
});

const mapDispatchToProps = dispatch => ({
  updateVariant: variant => dispatch(updateVariant(variant)),
  updateInterpretation: interpretation => dispatch(updateInterpretation(interpretation)),
  dispatch
})
export default connect(mapStateToProps, mapDispatchToProps)(VariantResult);
