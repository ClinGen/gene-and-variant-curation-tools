//
// Helper Functions to be used throughout variant-central
//
import {codeStripValues} from '../mapping/CodeStripValues';

import { EXTERNAL_API_MAP } from "../../../constants/externalApis";


// Check if more than 1 select "Not Met" or "Not Evaluated" across form groups
// and return True or False
export const compareFormGroupValues = (values, groups) => {
    let invalid = false;
    groups.forEach(group => {
        let metCount = 0;
        group.forEach(item => {
            if (item === values[item].criteria && values[item].criteriaStatus === "met") {
                metCount++;
            }
        });
        if (metCount > 1) {
            invalid = true;
        }
    });
    return invalid;
}


// Return Array of Code Strip Objects by Code value
export const filterCodeStripObjects = (codes) => {
    const objects = codes.map(code => {
        return codeStripValues.filter(value => value.code === code)
    }).flat();
    return objects;
}

// Helper function to shorten display of imported float values to 5 decimal places;
// if float being displayed has less than 5 decimal places, just show the value with no changes
// Returns a string for display purposes.
export const parseFloatShort = (float) => {
  let splitFloat = (float + "").split('.');
  if (splitFloat.length > 1 && splitFloat[1].length > 5) {
    return float.toFixed(5) + '';
  } else {
    return float.toString();
  }
}

// Scrolls a given ID into view, offset by 50px
export const scrollIDIntoView = (activeID) => {
    const id = activeID;
    const element = document.getElementById(id);

    if (element){
        const y = element.getBoundingClientRect().top + window.pageYOffset -50;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

// Return evaluation objects by group
export const evaluationsByGroup = (groups, evaluations) => {
    const groupedEvaluations = {};
    groups.flat().forEach(group => {
        if (evaluations[group]){
            groupedEvaluations[group] = evaluations[group];
        }
    })
    return groupedEvaluations;
}

// # JSON response helper: Getter Method
// # Parameters: JSON response, key/property
// # Usage: parseKeyValue(response, 'hg19')

// Traverse JSON object tree to find a property and its value
// Primarily written to parse myvariant.info response
export const parseKeyValue = (response, prop) => {
    let result; // types of object, array, string or number

    if (typeof response === 'object' && Object.keys(response).length) {
        if (response.hasOwnProperty(prop)) {
            // Found key at object's root level
            result = response[prop];
            return result;
        } else {
            for (let key in response) {
                if (typeof response[key] === 'object') {
                    if (response[key].hasOwnProperty(prop)) {
                        // Found key at object's second level
                        result = response[key][prop];
                        return result;
                    }
                }
            }
            // The key has not been found
            return false;
        }
    }
}

export const getGenomicLinkouts = (variant) => {
  let gRCh38, gRCh37;
  if (variant && variant.hgvsNames) {
    const { hgvsNames } = variant;
    gRCh38 = hgvsNames && hgvsNames.GRCh38
      ? variant.hgvsNames.GRCh38
      : variant.hgvsNames.gRCh38
        ? variant.hgvsNames.gRCh38
        : null;
    gRCh37 = hgvsNames && hgvsNames.GRCh37
      ? variant.hgvsNames.GRCh37
      : variant.hgvsNames.gRCh37
        ? variant.hgvsNames.gRCh37
        : null;
  }
  return { gRCh38, gRCh37 };
};


export function setContextLinks(nc_hgvs, ref) {
    // get Chromosome
    let chr = nc_hgvs.substr(7, 2);
    if (chr.indexOf('0') === 0) {
        chr = chr.substr(1, 1);
    } else if (chr === '23') {
        chr = 'x';
    } else if (chr === '24') {
        chr = 'y';
    }

    // set start and stop points for +/- 30 bp length centered at variation point
    let start = null;
    let end = null;
    const re = /:[g].(\d+)\D/;

    if (nc_hgvs.match(re) && nc_hgvs.match(re).length > 1) {
        const point = nc_hgvs.match(re)[1];
        start = (parseInt(point) - 30).toString();
        end = (parseInt(point) + 30).toString();

        //debugger;
        // set links and return
        if (ref === 'GRCh38') {
            return {
                ucsc_url_38: EXTERNAL_API_MAP['UCSCGRCh38'] + chr + '%3A' + start + '-' + end,
                viewer_url_38: EXTERNAL_API_MAP['VariationViewerGRCh38'] + chr + '&assm=GCF_000001405.28&from=' + start + '&to=' + end,
                ensembl_url_38: EXTERNAL_API_MAP['EnsemblGRCh38'] + chr + ':' + start + '-' + end
            };
        } else if (ref === 'GRCh37') {
            return {
                ucsc_url_37: EXTERNAL_API_MAP['UCSCGRCh37'] + chr + '%3A' + start + '-' + end,
                viewer_url_37: EXTERNAL_API_MAP['VariationViewerGRCh37'] + chr + '&assm=GCF_000001405.25&from=' + start + '&to=' + end,
                ensembl_url_37: EXTERNAL_API_MAP['EnsemblGRCh37'] + chr + ':' + start + '-' + end
            };
        }
    }
}
