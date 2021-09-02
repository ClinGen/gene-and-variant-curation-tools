import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { updateCurrentAffiliation } from '../../actions/actions';
import Modal from '../common/Modal';

import { useAmplifyAPIRequestRecycler } from '../../utilities/fetchUtilities';
import { getAffiliationByID } from '../../helpers/get_affiliation_name';

const AffiliationsModal = ({
  auth,
  show,
  onHide,
  updateCurrentAffiliation,
}) => {
  const defaultAffiliation = (auth && auth.currentAffiliation && auth.currentAffiliation.affiliation_id) || 'no-affiliation';
  const [affiliation, setAffiliation] = useState(defaultAffiliation);
  const [affiliationOptions, setAffiliationOptions] = useState([]);
  const [isLoadingSave, setLoadingSave] = useState(false);

  const requestRecycler = useAmplifyAPIRequestRecycler();

  useEffect(() => {
    const getAffiliationOptions = () => {
      if (auth && auth.affiliations && auth.affiliations.length) {
        // TODO: refactor when affiliation objects are embeded and available; remove affiliation json file
        // try {
        //   const affiliationsUrl = `/affiliations?`;
        //   let affiliationsQueryString = '';
        //   auth.affiliations.forEach((affiliationId, i) => {
        //     affiliationsQueryString += `${i > 0 ? '&' : ''}affiliation_id=${affiliationId}`
        //   });
        //   const affiliationsResponse = await requestRecycler.capture(API.get(API_NAME, affiliationsUrl + affiliationsQueryString));
        //   if (affiliationsResponse && affiliationsResponse.length) {
        //     setAffiliationOptions(affiliationsResponse);
        //   }
        // } catch(error) {
        //   console.log(JSON.parse(JSON.stringify(error)));
        // }
        // Map over users affiliations and filter out any potential undefined values (due to typos or incorrect aff in Users Table, avoids crashes)
        const myAffiliations = auth.affiliations.map(affiliation_id => getAffiliationByID(affiliation_id)).filter(aff => aff !== undefined);
        setAffiliationOptions(myAffiliations);
      }
    };
    if (show) {
      getAffiliationOptions();
    }
    return () => {
      requestRecycler.cancelAll();
      setLoadingSave(false);
    }
  }, [show, auth, requestRecycler]);

  // get affiliation object and save it to redux.
  const handleSave = () => {
    setLoadingSave(true);
    // find the affiliation object from the options
    const selectedAffiliation = affiliationOptions.find(obj => obj.affiliation_id === affiliation);
    // if find returns undefined, set current affiliation to null
    updateCurrentAffiliation(selectedAffiliation || null);
    setLoadingSave(false);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      onSave={handleSave}
      isLoadingSave={isLoadingSave}
      centered
    >
      <div className="p-4">
        <h2>Please select whether you would like to curate as part of an Affiliation:</h2>
        <select
          className="form-control affiliation-select mt-3"
          name="affiliation"
          value={affiliation}
          onChange={(e) => setAffiliation(e.target.value)}
        >
          <option value="" disabled>Select Affiliation</option>
          <option value="" disabled>-----------------------------------------------------------------------------------</option>
          <option value="no-affiliation">
            {auth && auth.name && auth.family_name
              ? `No Affiliation (${auth.name} ${auth.family_name})`
              : `No Affiliation${auth && auth.email ? ` (${auth.email})` : ''}`
            }
          </option>
          <option value="" disabled>-----------------------------------------------------------------------------------</option>
          <option value="" disabled></option>
          {affiliationOptions.map(affiliation => (
            <option key={affiliation.affiliation_id} value={affiliation.affiliation_id}>{affiliation.affiliation_fullname}</option>
          ))}
        </select>
        <p className="alert alert-warning mt-5">
          Please close any other VCI/GCI tabs you have open before you switch affiliations. 
          Keeping work open in other tabs when you switch affiliations can potentially lead
          to your curations being attributed to the wrong affiliation.
        </p>
      </div>
    </Modal>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth
});

const mapDispatchToProps = (dispatch) => ({
  updateCurrentAffiliation: affiliation => dispatch(updateCurrentAffiliation(affiliation))
});

export default connect(mapStateToProps, mapDispatchToProps)(AffiliationsModal);