/**
 * This file consolidates all frontend affiliation helpers into one file.
 */

import React, { useState, useEffect } from "react";
import { REACT_APP_AFFILS_ENDPOINT, REACT_APP_AFFILS_API_KEY } from "../utilities/siteUtilities.js";

/**
 * Create custom context and provider to manage API response state and provide
 * access to necessary components.
 */
export const AffilsContext = React.createContext();

export const AffilsContextProvider = (props) => {
  const [affiliationsData, setAffiliationsData] = useState([]);

  useEffect(() => {
    async function fetchAffiliations() {
      let affiliations = [];
      try {
        affiliations = await fetchAffiliationsList();
      } catch(error) {
        alert(
          `Failed to retrieve associated affiliations. 
          \n${error}. 
          \nIf error persists, please reach out to the helpdesk for assistance.`);
        console.error(error);
      }
      if (affiliations?.length > 0) {
        setAffiliationsData(affiliations);
      }
    }
    fetchAffiliations();
  }, []);

  return (
    <AffilsContext.Provider value={{ affiliationsData }}>
      {props.children}
    </AffilsContext.Provider>
  );
};

/**
 * Function to call the Affiliations API and get all affiliations
 * back in the original JSON format.
 * @returns {Array} - Array of objects
 */
export async function fetchAffiliationsList() {
  const url = REACT_APP_AFFILS_ENDPOINT + 'affiliations_list/';
  try {
    const response = await fetch(
      url, {
        credentials: 'include',
        method: 'GET',
        headers: {
          'X-Api-Key': REACT_APP_AFFILS_API_KEY,
        },
      });
    if (!response.ok) {
      throw new Error(`Network Response: ${response.status}`);
    }
    const affils = await response.json();
    return affils
  } catch (error) {
    console.error(error.message);
  }
}

/**
 * Method to return the affiliation object by affiliation id.
 * @param {string} affiliation_id
 * @param {object} affiliationsData
 * @returns {string|undefined} - Affiliation ID string or undefined
 */
export function getAffiliationByID(affiliation_id, affiliationsData) {
  if (affiliation_id && affiliationsData) {
    return affiliationsData.find(
      (affiliation) =>
        affiliation.affiliation_id === affiliation_id
    );
  } else {
    return undefined;
  }
}

/**
 * Method to return an affiliation subgroup's full name given the subgroup ID
 * @param {string} subgroup - Affiliation subgroup
 * @param {string} subgroup_id - Affiliation subgroup ID
 * @param {object} affiliationsData
 * @returns {string|undefined} - Affiliation name string or undefined
 */
export function getAffiliationNameBySubgroupID(subgroup, subgroup_id, affiliationsData) {
  let name = undefined;
  if (subgroup && subgroup_id && affiliationsData) {
    const affiliation = affiliationsData.find(
      (affil) =>
        affil.subgroups &&
        affil.subgroups[subgroup] &&
        affil.subgroups[subgroup].id === subgroup_id
    );
    if (affiliation) {
      name = affiliation.subgroups[subgroup].fullname;
    }
  }
  return name;
}

/**
 * Method to return all affiliations by fullname
 * @param {object} affiliationsData
 * @returns {Array} - Array of objects of affiliation IDs and names
 */
export function getAllAffiliations(affiliationsData) {
  let affiliations = [];
  affiliationsData.forEach((affiliation) => {
    affiliations.push({
      id: affiliation.affiliation_id,
      fullName: affiliation.affiliation_fullname,
    });
  });
  return affiliations;
}

/**
 * Method to return affiliation subgroups from all affiliations
 * @param {object} affiliationsData
 * @returns {Array} - Array of strings of affiliation subgroup IDs
 */
export function getAffiliationSubgroups(affiliationsData) {
  let subgroupList = [];
  affiliationsData.forEach((affiliation) => {
    if (affiliation.subgroups) {
      subgroupList.push(affiliation.subgroups);
    }
  });
  return subgroupList;
}

/**
 * Method to return a list of designated classification approvers
 * with an affiliation given the affiliation ID
 * @param {string} id - Affiliation ID
 * @param {object} affiliationsData
 * @returns {Array} - Array of strings
 */
export function getAffiliationApprover(id, affiliationsData) {
  let approvers = [];
  if (id && affiliationsData) {
    const affiliation = affiliationsData.find(
      (affil) => affil.affiliation_id === id
    );
    if (affiliation?.approver?.length) {
      approvers = affiliation.approver;
    }
  }
  return approvers;
}

/**
 * Method to return the affiliation fullname given the affiliation ID
 * @param {string} id - Affiliation ID
 * @param {object} affiliationsData
 * @param {string} subgroup - Affiliation subgroup (optional)
 * @returns {string|undefined} - Affiliation name or undefined
 */
export function getAffiliationName(id, affiliationsData, subgroup = "") {
  let name = undefined;
  if (id && affiliationsData) {
    const affiliation = affiliationsData.find(
      (affil) => affil.affiliation_id === id
    );
    if (affiliation) {
      if (subgroup &&
        affiliation.subgroups &&
        affiliation.subgroups[subgroup]
      ) {
        name = affiliation.subgroups[subgroup].fullname;
      } else {
        name = affiliation.affiliation_fullname;
      }
    }
  }
  return name;
}
