import React, { useState, useEffect, useRef } from 'react';
import PropTypes from "prop-types";
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import Select from 'react-select';
import { get as lodashGet, cloneDeep, isEmpty } from 'lodash';
import { API } from 'aws-amplify';
import { API_NAME } from '../../utils';
import {
  resolveCallbackReturnValue,
  useAmplifyAPIRequestRecycler
} from '../../utilities/fetchUtilities';

const CspecModal = ({
  id,
  show,
  title,
  onHide,
  handleCspecUpdate,
  saveButtonText,
  deleteButtonText,
  parentEndpoint,
  parentToInsertCspec,
  setIsLoadingCspecDoc,
  updateCspec,
  updateParentObj,
  affiliation,
  alleleRegistryGeneData,
  userPK
}) => {
  const requestRecycler = useAmplifyAPIRequestRecycler();
  const _isMounted = useRef(true); // used to track mounting of component, skip async tasks if unmounted
  const [cspecDocuments, setCspecDocuments] = useState([]);
  const [cspecSelectOptions, setCspecSelectOptions] = useState([]);
  const [selectedCspec, setSelectedCspec] = useState(null);
  const [cspecGenes, setCspecGenes] = useState([]); // when a doc is selected, can have a list of genes associated
  const [selectedCspecGene, setSelectedCspecGene] = useState(""); // gene associated with doc, either set automatically (one option) or selected (multiple gene options)
  const [previouslySavedCspec, setPreviouslySavedCspec] = useState(null);
  const [previouslySavedGene, setPreviouslySavedGene] = useState(null);
  const [savedCspecInfo, setSavedCspecInfo] = useState(null);
  const [isLoadingSave, setLoadingSave] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteButtonDisabled, setDeleteButtonDisabled] = useState(true);
  const [isLoadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    getCspecDocuments();
    return () => {
      _isMounted.current = false;
    }
  }, []);

  useEffect(() => {
    const selectOptions = cspecDocuments.map((doc) => {
      const documentName = lodashGet(doc, 'ruleSetDoc.cspecInfo.documentName', null);
      const genes = lodashGet(doc, 'ruleSetDoc.genes', []);

      // Get unique diseases
      const uniqueDiseases = getUniqueDiseases(genes);

      // Build the subLabel for react-select dropdown from unique diseases
      const subLabel = uniqueDiseases
        .map(disease => `${disease.diseaseLabel} (${disease.diseaseId}) ${disease.modesOfInheritance.map(moi => `${moi.label} (${moi.id})`).join(', ') || ''}`)
        .join(' | ');

      return {
        value: lodashGet(doc, 'PK', null),
        label: documentName,
        subLabel: subLabel
      };
    });

    setCspecSelectOptions(selectOptions);

    if (parentToInsertCspec?.cspec?.cspecId) {
      setIsLoadingCspecDoc(true);
      const matchingDocument = cspecDocuments.find(doc =>
        doc.ruleSetDoc.ruleSetId === parentToInsertCspec.cspec.cspecId &&
        doc.ruleSetDoc.cspecInfo.documentName === parentToInsertCspec.cspec.documentName
      );

      if (matchingDocument) {
        const formattedCspecForInput = {
          value: lodashGet(matchingDocument, 'PK', null),
          label: lodashGet(matchingDocument, 'ruleSetDoc.cspecInfo.documentName', null)
        };
        const genes = matchingDocument.ruleSetDoc?.genes;
        if (genes && genes.length > 0) {
          const parsedGenesInfo = getUniqueDiseases(genes);
          setSavedCspecInfo(parsedGenesInfo);
        } else {
          setSavedCspecInfo([]);
        }

        setPreviouslySavedCspec(formattedCspecForInput);
        const previouslySavedGene = parentToInsertCspec?.cspec?.specifiedGene;
        if (previouslySavedGene) {
          setPreviouslySavedGene(previouslySavedGene);
        } else if (genes?.length === 1) {
          setSelectedCspecGene(genes[0].hgncSymbol);
        } else {
          setSelectedCspecGene("");
        }
        handleCspecUpdate(matchingDocument);
        setDeleteButtonDisabled(false);
        setIsLoadingCspecDoc(false);
      }
    } else {
      setIsLoadingCspecDoc(false);
    }
  }, [cspecDocuments, parentToInsertCspec]);

  const getCspecDocuments = async () => {
    const vcepId = lodashGet(affiliation, 'subgroups.vcep.id', 'none');
    try {
      if (vcepId !== 'none') {
        const url = `/cspec?affiliation=${vcepId}`;
        const response = await requestRecycler.capture(API.get(API_NAME, url));
        if (response && _isMounted.current) {
          setCspecDocuments(response);
        }
        return;
      }

      const base = '/cspec';
      const common = `affiliation=none`;
      const url1 = `${base}?${common}&date_created[between]=2021-01-01T00:00,2023-12-31T24:00`;
      const url2 = `${base}?${common}&date_created[between]=2024-01-01T00:00,2027-12-31T24:00`;

      const [batch1, batch2] = await Promise.all([
        requestRecycler.capture(API.get(API_NAME, url1)).catch(err => {
          console.log('CSpec batch 1 failed', JSON.parse(JSON.stringify(err)));
          return [];
        }),
        requestRecycler.capture(API.get(API_NAME, url2)).catch(err => {
          console.log('CSpec batch 2 failed', JSON.parse(JSON.stringify(err)));
          return [];
        }),
      ]);

      const combined = [...batch1, ...batch2];
      if (_isMounted.current) setCspecDocuments(combined);
    } catch (error) {
      if (API.isCancel(error)) {
        return;
      }
      console.log(JSON.parse(JSON.stringify(error)));
    }
  };

  const getUniqueDiseases = (genes) => {
    const uniqueDiseases = {};
    genes.forEach((gene) => {
      gene.diseases?.forEach((disease) => {
        if (!uniqueDiseases[disease.id]) {
          uniqueDiseases[disease.id] = {
            diseaseLabel: disease.label,
            diseaseId: disease.id,
            modesOfInheritance: disease.modesOfInheritance?.map(moi => ({
              label: moi.label,
              id: moi.id
            })) || []
          };
        }
      });
    });
    return Object.values(uniqueDiseases);
  };

  const addCspecToParent = async (selectedCspec, selectedGene) => {
    const parentObj = cloneDeep(parentToInsertCspec);
    const cspecId = lodashGet(selectedCspec, 'ruleSetDoc.ruleSetId', '');
    const cspecUrl = lodashGet(selectedCspec, 'ruleSetDoc.cspecInfo.cspecId', '');
    const documentName = lodashGet(selectedCspec, 'ruleSetDoc.cspecInfo.documentName', '');
    const ruleSetIri = lodashGet(selectedCspec, 'ruleSetDoc.ruleSetIri', '');
    const version = lodashGet(selectedCspec, 'ruleSetDoc.documentVersion', '');
    // Get the gene data; ncbiGeneId is only included if gene symbols match.
    const geneData = getGeneData(selectedGene, alleleRegistryGeneData);

    parentObj.cspec = {
      cspecId,
      cspecUrl,
      ruleSetIri,
      documentName,
      version,
      ...geneData
    }
    if (userPK || userPK === null) {
      parentObj.modified_by = userPK;
    }
    const params = { body: { parentObj } };
    try {
      setLoadingSave(true);
      const url = '/' + parentEndpoint + '/' + parentObj.PK;
      const response = await API.put(API_NAME, url, params);
      if (response) {
        updateParentObj(response);
        handleCspecUpdate(selectedCspec);
        handleCallbacks({
          updateCspec,
          updateCspecArg: selectedCspec,
          setLoadingSave,
          setLoadingDelete,
          setSaveError,
          onHide
        });
      }
    } catch (error) {
      console.log(`Error updating ${parentObj.item_type} with cspec doc ${error}`);
      setLoadingSave(false);
      setSaveError('Save failed!');
    }
  };

  const removeCspecFromParent = async () => {
    const parentObj = cloneDeep(parentToInsertCspec);
    parentObj.cspec = null;
    if (userPK || userPK === null) {
      parentObj.modified_by = userPK;
    }
    const params = { body: { parentObj } };
    try {
      setLoadingDelete(true);
      const url = '/' + parentEndpoint + '/' + parentObj.PK;
      const response = await API.put(API_NAME, url, params);
      if (response) {
        updateParentObj(response);
        handleCspecUpdate({});
        setPreviouslySavedCspec(null);
        setSelectedCspec(null);
        setSavedCspecInfo(null);
        setCspecGenes([]);
        setSelectedCspecGene("");
        setPreviouslySavedGene(null);
        setDeleteButtonDisabled(true);
        handleCallbacks({
          updateCspec,
          updateCspecArg: {},
          setLoadingDelete,
          setLoadingSave,
          setSaveError,
          onHide
        });
      }
    } catch (error) {
      console.log(`Error updating ${parentObj.item_type} while removing cspec doc ${error}`);
      setLoadingDelete(false);
      setSaveError('Delete failed!');
    }
  }

  const handleChange = (e) => {
    let selectedDoc = cspecDocuments.filter(doc => doc.PK === e.value)[0];

    if (selectedDoc) {
      setSelectedCspec(selectedDoc);
      const genes = lodashGet(selectedDoc, 'ruleSetDoc.genes', []);
      setCspecGenes(genes);

      if (genes.length === 1) {
        setSelectedCspecGene(genes[0].hgncSymbol);
      } else {
        setSelectedCspecGene("");
      }

    } else {
      setSelectedCspec(null);
      setCspecGenes([]);
      setSelectedCspecGene("");
    }
  };

  const handleSave = async () => {
    if (parentEndpoint) {
      addCspecToParent(selectedCspec, selectedCspecGene);
    }
  };

  const handleDelete = async () => {
    if (parentEndpoint) {
      removeCspecFromParent();
    }
  };

  const handleCallbacks = async ({
    updateCspec,
    updateCspecArg,
    setLoadingSave,
    setLoadingDelete,
    setSaveError,
    onHide
  }) => {
    // and also prevent modal from closing as well as displaying error message in the modal
    const saveErrors = [];
    if (updateCspec) {
      // check if callback uses async func
      const updateCspecErrorMessage = await resolveCallbackReturnValue(updateCspec(updateCspecArg));
      if (updateCspecErrorMessage && typeof updateCspecErrorMessage === 'string') {
        saveErrors.push(`${updateCspecErrorMessage}`);
      }
    }
    setLoadingSave(false);
    setLoadingDelete(false);
    if (saveErrors.length) {
      setSaveError(saveErrors.join('; '));
    } else {
      setSaveError(null);
      onHide();
    }
  };

  const renderGeneSelection = () => {
    if (affiliation?.affiliation_id === '10027' && selectedCspec?.subject === '135641398') {
      const mitochondrialGenes = [
        "MT-ATP6",
        "MT-ATP8",
        "MT-CO1",
        "MT-CO2",
        "MT-CO3",
        "MT-CYB",
        "MT-ND1",
        "MT-ND2",
        "MT-ND3",
        "MT-ND4",
        "MT-ND4L",
        "MT-ND5",
        "MT-ND6",
        "MT-RNR1",
        "MT-RNR2",
        "MT-TA",
        "MT-TC",
        "MT-TD",
        "MT-TE",
        "MT-TF",
        "MT-TG",
        "MT-TH",
        "MT-TI",
        "MT-TK",
        "MT-TL1",
        "MT-TL2",
        "MT-TM",
        "MT-TN",
        "MT-TP",
        "MT-TQ",
        "MT-TR",
        "MT-TS1",
        "MT-TS2",
        "MT-TT",
        "MT-TV",
        "MT-TW",
        "MT-TY"
      ];

      return (
        <div>
          <label><strong>Select from list of Mitochondrial genes:</strong></label>
          <select
            className="form-control"
            value={selectedCspecGene || ""}
            onChange={e => {
              setSelectedCspecGene(e.target.value);
            }}
          >
            <option value="">Not selected</option>
            {mitochondrialGenes.map((gene, index) => (
              <option key={index} value={gene}>
                {gene}
              </option>
            ))}
          </select>
        </div>
      );
    }
    // We have three scenarios to render: multiple genes (selection), single gene (automatically selected), or a previously saved gene
    if (cspecGenes.length > 1) {
      // Multiple genes => show dropdown
      return (
        <div>
          <label><strong>Select gene from specification document:</strong></label>
          <select
            className="form-control"
            value={selectedCspecGene || ""}
            onChange={e => {
              setSelectedCspecGene(e.target.value);
            }}
          >
            <option value="">Not selected</option>
            {cspecGenes.map((gene, i) => (
              <option key={i} value={gene.hgncSymbol}>
                {gene.hgncSymbol}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (cspecGenes.length === 1) {
      // Single gene => just display
      return (
        <div>
          <label><strong>Gene from selected specification document:</strong></label>
          <h5>{selectedCspecGene}</h5>
        </div>
      );
    } else if (previouslySavedGene) {
      // Display previously saved
      return (
        <div>
          <label><strong>Gene from document currently saved to interpretation:</strong></label>
          <h5>{previouslySavedGene}</h5>
        </div>
      );
    }
    return null;
  };

  /**
   * Get gene details from alleleRegistryGeneData.
   *
   * @param {string} selectedGeneSymbol - The gene symbol selected by the user.
   * @param {Object} alleleRegistryGeneData - Object containing geneSymbol and ncbiGeneId from the variant.
   * @returns {Object} Object containing specifiedGene and, if matching, ncbiGeneId.
   */
  const getGeneData = (selectedGeneSymbol, alleleRegistryGeneData) => {
    const geneData = {
      specifiedGene: selectedGeneSymbol
    };
    // Only add ncbiGeneId if the gene symbols match.
    if (alleleRegistryGeneData && alleleRegistryGeneData.geneSymbol === selectedGeneSymbol) {
      // Convert ncbi gene id to string before saving
      // the id is an integer and needs to be converted to a string
      geneData.ncbiGeneId = String(alleleRegistryGeneData.ncbiGeneId);
    }
    return geneData;
  };

  const handleModalClose = () => {
    setSelectedCspec(null);
    setCspecGenes([]);
    setSelectedCspecGene("");
    setSaveError(null);
    onHide();
  };

  const geneMismatch =
    !isEmpty(alleleRegistryGeneData) &&
    selectedCspecGene !== "" && // Only if a gene is selected
    alleleRegistryGeneData.geneSymbol !== selectedCspecGene;

  const mitoGeneSelectActive =
    affiliation?.affiliation_id === '10027' &&
    selectedCspec?.subject === '135641398';

  const mitoGeneNotSelected = mitoGeneSelectActive && !selectedCspecGene;
  const multiGeneNotSelected = cspecGenes.length > 1 && !selectedCspecGene;

  const saveButtonShouldBeDisabled =
    !selectedCspec ||
    multiGeneNotSelected ||
    mitoGeneNotSelected;

  return (
    <Modal
      id={id}
      show={show}
      size="lg"
      title={title}
      className="cspec-modal"
      onHide={handleModalClose}
      saveButtonText={saveButtonText}
      saveButtonDisabled={saveButtonShouldBeDisabled}
      showDeleteButton={true}
      deleteButtonText={deleteButtonText}
      deleteButtonDisabled={deleteButtonDisabled}
      onDelete={handleDelete}
      isLoadingDelete={isLoadingDelete}
      onSave={handleSave}
      isLoadingSave={isLoadingSave}
      saveError={saveError}
    >
      <div>
        <h4>To add a new specification document to the curation: </h4>
        <ol>
          <li>Enter HGNC gene symbol or VCEP name</li>
          <li>Select your specification document from drop-down menu</li>
        </ol>
        <p><strong>Note:</strong> When curating as part of an affiliation, only affiliation specification documents are shown</p>
      </div>

      <Select
        onChange={handleChange}
        options={cspecSelectOptions}
        formatOptionLabel={(e) => (
          <div>
            <strong>{e.label}</strong>
            <br />
            <small>{e.subLabel}</small>
          </div>
        )}
      />
      <br />
      <div className="form-group mt-3">
        {renderGeneSelection()}
        {geneMismatch && (
          <div className="alert alert-warning mt-2">
            <i className="icon icon-exclamation-circle" style={{ marginRight: "0.4em" }} />
            Warning: The gene specified in the document does not match the gene for this variant. Please select the correct gene before saving.
            The current variant's gene is {alleleRegistryGeneData.geneSymbol} (NCBI ID: {alleleRegistryGeneData.ncbiGeneId}).
          </div>
        )}
      </div>
      <br />
      {previouslySavedCspec && previouslySavedCspec.label
        ? <p><strong>Currently saved to Interpretation: </strong>{previouslySavedCspec.label}</p>
        : previouslySavedCspec ? <LoadingSpinner size="2x" /> : null}

      {/* Display the disease and moi when available */}
      {savedCspecInfo && savedCspecInfo.length > 0 && (
        <div>
          <h5>Disease and Mode of Inheritance Information</h5>
          {savedCspecInfo.map((disease, index) => (
            <div key={index} style={{ paddingLeft: "1em" }}>
              <p><strong>Disease:</strong> {disease.diseaseLabel} ({disease.diseaseId})</p>
              {disease.modesOfInheritance.map((moi, moiIndex) => (
                <p key={moiIndex} style={{ paddingLeft: "1.2em" }}>
                  <strong>Mode of Inheritance:</strong> {moi.label} ({moi.id})
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

CspecModal.propTypes = {
  // callback function which provides the saved cspec
  updateCspec: PropTypes.func,
  // callback function which provides the updated parent object where new cspec is saved
  updateParentObj: PropTypes.func
}

export default CspecModal;