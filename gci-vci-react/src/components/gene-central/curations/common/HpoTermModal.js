import React, { useState, useEffect } from 'react';
import axios from "axios";
import _ from 'lodash';
import { Button } from "react-bootstrap";
import { LoadingButton } from "../../../common/LoadingButton";

import Modal from '../../../common/Modal';
import Input from '../../../common/Input';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis';
import { ExternalLink } from '../../../common/ExternalLink';
import { getHpoIdsFromList } from './commonFunc';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';

export const HpoTermModal = ({
  isNew,
  savedHpo,             // Array of HPO terms saved from parent
  passHpoToParent,      // Function used to pass HPO data to respective parent
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hpoWithTerms, setHpoWithTerms] = useState(savedHpo && savedHpo.length ? savedHpo : []);
  const [hpoInput, setHpoInput] = useState("");
  const [formError, setFormError] = useState(null);
  const [isLoadingHpoTerm, setIsLoadingHpoTerm] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);

  useEffect(() => {
    setHpoWithTerms(savedHpo && savedHpo.length ? savedHpo : []);
  }, [savedHpo, isModalOpen])

  const onButtonClick = () => {
    setIsModalOpen(true);
  };

  const onModalCancel = () => {
    setHpoWithTerms([]);
    setHpoInput("");
    setIsModalOpen(false);
    setIsLoadingHpoTerm(false);
    setIsLoadingSave(false);
    setFormError(null);
  };

  const handleChange = (e) => {
    if (formError) {
      setFormError(null);
    }
    setHpoInput(e.target.value);
  };

  const saveForm = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsLoadingSave(true);
    const hpoWithTermsList = _.uniq(hpoWithTerms);
    passHpoToParent(hpoWithTermsList);
    setHpoWithTerms([]);
    setHpoInput("");
    setIsLoadingSave(false);
    setIsModalOpen(false);
  };
          
  const validateHpo = (hpoIds) => {
    const checkIds = getHpoIdsFromList(hpoIds);
    // Check HPO ID format
    if (checkIds && checkIds.length && checkIds.includes(null)) {
      // HPOID list is bad
      setFormError('Use HPO IDs (e.g. HP:0000001) separated by commas');
    }
    else if (checkIds && checkIds.length && !checkIds.includes(null)) {
      const hpoIdList = _.without(checkIds, null);
      return hpoIdList;
    }
  };

  const deleteHpo = (index) => {
    const term = hpoWithTerms[index];
    const hpos = hpoWithTerms.filter(hpo => {
      return hpo!== term;
    });
    setHpoWithTerms(hpos);
  };

  /**
   * Method to fetch HPO term names and append them to HPO ids
   * @param {string} type - A string used to differentiate between hpo/elim hpo, setState accordingly
  */
  const fetchHpoName = () => {
    setIsLoadingHpoTerm(true);
    const hpoIds = hpoInput;
    const hpoIdList = validateHpo(hpoIds);
    if (hpoIdList && hpoIdList.length) {
      hpoIdList.forEach(id => {
        const url = EXTERNAL_API_MAP['HPOApi'] + id;
        // Make call to fetch HPO term
        axios.get(url).then(result => {
          const termLabel = result['data']['details']['name'];
          const hpoWithTerm = `${termLabel} (${id})`;
          setHpoWithTerms(hpoWithTerms => [...hpoWithTerms, hpoWithTerm]);
        }).catch(err => {
          // Unsuccessful retrieval
          console.warn('Error in fetching HPO data =: %o', err);
          const hpoWithTerm = id + ' (note: term not found)';
          setHpoWithTerms(hpoWithTerms => [...hpoWithTerms, hpoWithTerm]);
        });
      });
      setIsLoadingHpoTerm(false);
    } else {
      setIsLoadingHpoTerm(false);
    }
  };

  const hpoTerms = _.uniq(hpoWithTerms ? hpoWithTerms : []);
  return (
    <>
    {isNew
      ? <Button variant="primary" onClick={onButtonClick}>HPO Terms <FontAwesomeIcon icon={faPlus} /></Button>
      : <Button variant="primary" onClick={onButtonClick}>HPO Terms <FontAwesomeIcon icon={faEdit} /></Button>
    }
    <Modal
      show={isModalOpen}
      size="lg"
      title="Add HPO Terms"
      className="modal-default"
      onHide={onModalCancel}
      onSave={saveForm}
      isLoadingSave={isLoadingSave}
    >
      <div className="modal-body">
          <strong><span><ExternalLink href={`${EXTERNAL_API_MAP['HPOBrowser']}`} title="Open HPO Browser in a new tab">HPO</ExternalLink> ID(s)</span>:</strong>
          <Input
            type="textarea"
            rows="4"
            groupClassName="form-group"
            value={hpoInput}
            className="hpo-text-area form-control"
            placeholder="e.g. HP:0010704, HP:0030300"
            onChange={handleChange}
            error={formError || null}
          />
          <LoadingButton
            key="fetch-hpo"
            className="btn-copy btn-last hpo-add-btn"
            text="Add"
            onClick={() => fetchHpoName()}
            textWhenLoading="Retrieving"
            isLoading={isLoadingHpoTerm}
          />
        <div>
          {hpoTerms ? 
            <ul style={{'listStyleType':'none'}}>
              {hpoTerms.map((term, i) => {
                return (
                  <div key={i}>
                    <li className="hpo-term-list">{term}&nbsp;
                      <Button className="link-button" variant="danger" onClick={() => deleteHpo(i)}>
                        <FontAwesomeIcon icon={faTrashAlt} size="xs" />
                      </Button>
                    </li>
                  </div>
                );
              })}
            </ul>
          : null}
        </div>
      </div>
    </Modal>
    </>
  );
};
