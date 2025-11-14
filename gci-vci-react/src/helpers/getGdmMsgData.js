import { RestAPI as API } from "@aws-amplify/api-rest";
import lodashGet from "lodash/get";
import { API_NAME } from "../utils";
import { sortListByDate } from './sort';
import { getUserName } from "./getUserName";
import { getAffiliationName } from "./affiliationsHelpers";
import { getApproverNames } from "./get_approver_names";
import { convertDiseasePKToMondoId } from "../utilities/diseaseUtilities";

/**
 * Function to get GDM data that is used for UNC tracking
 */
export function getGDMData(gdm) {
    let gdmData = {};
    if (gdm && gdm.gene && gdm.disease && gdm.modeInheritance) {
        const start = gdm.modeInheritance.indexOf('(');
        const end = gdm.modeInheritance.indexOf(')');
        const hpoNumber = start > -1 && end > -1 ? gdm.modeInheritance.substring(start + 1, end) : gdm.modeInheritance;

        gdmData = {
            mode_of_inheritance: hpoNumber,
            condition: gdm.disease.PK ? convertDiseasePKToMondoId(gdm.disease.PK) : '',
            gene: gdm.gene.hgncId || ''
        };
    }
    return gdmData;
}

/**
 * Function to get gene_validity_evidence_level data that is used for UNC tracking
 * @param {object} gdm - GDM data object
 * @param {object} provisional - provisional data object
 */
export function getGeneEvidenceData(gdm, provisional) {
    return {
        genetic_condition: getGDMData(gdm),
        evidence_level: provisional && provisional.alteredClassification && provisional.alteredClassification !== 'No Modification' 
            ? provisional.alteredClassification 
            : provisional && provisional.autoClassification
                ? provisional.autoClassification
                : '',
        gene_validity_sop: provisional && provisional.sopVersion ? 'cg:gene_validity_sop_' + provisional.sopVersion : ''
    };
}

/**
 * Function to get given auth user's data that is used for UNC tracking
 * @param {object} auth - user data object
 */
export function getPerformedByUserData(auth) {
    return {
        name: getUserName(auth),
        id: lodashGet(auth, "PK", null) || '',
        email: lodashGet(auth, "email", null) || '',
        on_behalf_of: {
            id: lodashGet(auth, "currentAffiliation.affiliation_id", null) || '',
            name: lodashGet(auth, "currentAffiliation.affiliation_fullname", null) || ''
        }
    }
}

/**
 * Function to get list of user who has performed an action in gdm's current provisional classification.
 * But skip the publish/unpublish user in the snapshot with given snapshot id.
 * @param {object} gdm - GDM data object
 * @param {array} snapshots - array of snapshot objects
 * @param {string} publishSnapshotId - snapshot id
 */
export function getActionContributors(gdm, snapshots, publishSnapshotId = null, affiliationsData) {
    let contributors = [];

    // Add GDM creator
    if (gdm) {
        if (gdm.submitted_by) {
            contributors.push({
                name: getUserName(gdm.submitted_by),
                id: lodashGet(gdm, "submitted_by.PK", null) || '',
                email: lodashGet(gdm, "submitted_by.email", null) || '',
                roles: ['creator']
              });
        }
    }
    // Loop through classification snapshots to get users who performed previous actions
    if (snapshots && snapshots.length) {
        snapshots.forEach(snapshot => {
            if (snapshot && snapshot.resource && snapshot.approvalStatus) {
                // Snapshot when classification was provisionally approved
                if (snapshot.approvalStatus === 'Provisioned') {
                    if (snapshot.resource.provisionalSubmitter) {
                        contributors.push({
                            name: snapshot.resource.provisionalSubmitter,
                            roles: ['provisional approver']
                        });
                    }
                } else if (snapshot.approvalStatus === 'Approved') {
                    // Snapshot when classification was approved
                    // Add approver
                    if (snapshot.resource.approvalSubmitter) {
                        contributors.push({
                            name: snapshot.resource.approvalSubmitter,
                            roles: ['approver']
                        });
                    }
                    // Add curator who approved this classification
                    if (snapshot.resource.classificationApprover) {
                        contributors.push({
                            name: snapshot.resource.classificationApprover,
                            roles: ['secondary approver']
                        });
                    }
                    // Add secondary approver (affiliation)
                    if (snapshot.resource.additionalApprover) {
                        contributors.push({
                            id: snapshot.resource.additionalApprover,
                            name: getApproverNames(snapshot.resource.additionalApprover, affiliationsData),
                            roles: ['secondary approver']
                        });
                    }
                    // Add secondary contributors (affiliations)
                    if (snapshot.resource.classificationContributors) {
                        snapshot.resource.classificationContributors.forEach(contributorId => {
                            contributors.push({
                                id: contributorId,
                                name: getAffiliationName(contributorId, affiliationsData),
                                roles: ['secondary contributors']
                            });
                        });
                    }
                    // Get the publisher/unpublisher data if it's not to be skipped
                    if (snapshot.resource.publishDate) {
                        if (publishSnapshotId === null || publishSnapshotId !== snapshot['@id']) {
                            contributors.push({
                                name: snapshot.resource.publishSubmitter,
                                roles: snapshot.resource.publishClassification ? ['publisher'] : ['unpublisher']
                            });
                        }
                    }
                }
            }
        });
    }

    return contributors;
}

/**
 * Function to get the list of user who has made contribution to current provisional classification.
 * But skip the publish/unpublish user in the snapshot with given snapshot id.
 * @param {object} gdm - GDM data object
 * @param {array} snapshots - array of snapshot objects
 * @param {string} publishSnapshotId - snapshot id
 */
export function getGDMContributors(gdm, snapshotList, publishSnapshotId = null, affiliationsData) {
    let contributors = [];
    const snapshots = sortListByDate(snapshotList, 'date_created');

    if (gdm) {
        // Get the list of GDM contributors
        const gdmSubmitters = lodashGet(gdm, "contributors", null) || [];
        // Extract submitters to contributors list
        // No role is set in this case
        contributors = gdmSubmitters.map(user => {
            return {
                name: getUserName(user),
                id: lodashGet(user, "PK", null) || '',
                email: lodashGet(user, "email", null) || '',
                roles: []
            }
        });
        // Add users who have action role to contributors list
        const actionSubmitters = getActionContributors(gdm, snapshots, publishSnapshotId, affiliationsData);
        contributors.push(...actionSubmitters);
    }

    return contributors;
}

/**
 * Function to post data to /track-data which sends data to Data Exchange for UNC tracking system
 * @param {object} data - data object
 */
export function postTrackData (data) {
    return new Promise((resolve, reject) => {
      if (data) {
        const params = { body: {data} };
        API.post(API_NAME, '/messaging/track-data', params).then(result => {
          if (result.status === 'Success') {
            console.log('Post tracking data succeeded: %o', result);
            resolve(result);
          } else {
            console.log('Post tracking data failed: %o', result);
            reject(result);
          }
        }).catch(error => {
          console.log('Post tracking data internal data retrieval error: %o', error);
          reject(error);
        });
      } else {
        console.log('Post tracking data Error: Missing expected data');
        reject({ 'message': 'Missing expected data' });
      }
    });
}

