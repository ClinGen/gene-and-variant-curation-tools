
import { parseKeyValue } from './helpers';
export const populationStatic = {
    page: {
        _labels: {
            AfricanAmerican: 'African American', Asian: 'Asian', CentralAmerican: 'Central American', Cuban: 'Cuban', Dominican: 'Dominican', Mexican: 'Mexican',
            NativeAmerican: 'Native American', NativeHawaiian: 'Native Hawaiian', PuertoRican: 'Puerto Rican', SouthAmerican: 'South American', SouthAsian: 'South Asian'
        }
    },
    exac: {
        _order: ['afr', 'amr', 'sas', 'nfe', 'eas', 'fin', 'oth'],
        _labels: { afr: 'African', amr: 'Latino', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian' }
    },
    gnomAD: {
        _order: ['afr', 'amr', 'asj', 'sas', 'nfe', 'eas', 'fin', 'oth'],
        _labels: { afr: 'African', amr: 'Latino', asj: 'Ashkenazi Jewish', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian' }
    },
    tGenomes: {
        _order: ['afr', 'amr', 'eas', 'eur', 'sas', 'espaa', 'espea'],
        _labels: { afr: 'AFR', amr: 'AMR', eas: 'EAS', eur: 'EUR', sas: 'SAS', espaa: 'ESP6500: African American', espea: 'ESP6500: European American' }
    },
    esp: {
        _order: ['ea', 'aa'],
        _labels: { ea: 'EA Allele', aa: 'AA Allele' }
    }
};

// Method to run through dictionary/Object's values and convert them to Int
export const dictValuesToInt = (dict) => {
    for (var key in dict) {
        dict[key] = parseInt(dict[key]);
    }
    return dict;
}

export const parseAlleleMyVariant = (response) => {
    let alleleData = {};
    let chrom = parseKeyValue(response, 'chrom'),
        hg19 = parseKeyValue(response, 'hg19'),
        ref = parseKeyValue(response, 'ref'),
        alt = parseKeyValue(response, 'alt');
    if (response) {
        alleleData = {
            chrom: (chrom && typeof chrom === 'string') ? chrom : null,
            pos: (hg19 && typeof hg19 === 'object' && hg19.start) ? hg19.start : null,
            ref: (ref && typeof ref === 'string') ? ref : null,
            alt: (alt && typeof alt === 'string') ? alt : null
        };
    }
    return alleleData;
}

// NORMSINV implementation taken from http://stackoverflow.com/a/8843728
// used for CI calculation
export const normSInv = (p) => {
    let a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    let a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    let b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    let b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
    let c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
    let c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
    let d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
    let p_low = 0.02425, p_high = 1 - p_low;
    let q, r;
    let retVal;

    if ((p < 0) || (p > 1)) {
        alert("NormSInv: Argument out of range.");
        retVal = 0;
    } else if (p < p_low) {
        q = Math.sqrt(-2 * Math.log(p));
        retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
        q = p - 0.5;
        r = q * q;
        retVal = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    return retVal;
}

// Sort population data table by allele frequency from highest to lowest
export const sortObjKeys = (obj) => {
    let arr = []; // Array converted from object
    let filteredArray = []; // filtered array without the '_tot' and '_extra' key/value pairs
    let sortedArray = []; // Sorting the filtered array from highest to lowest allele frequency
    let sortedKeys = []; // Sorted order for the rendering of populations
    if (Object.keys(obj).length) {
        arr = Object.entries(obj);
        filteredArray = arr.filter(item => {
            return item[0].indexOf('_') < 0;
        });
        sortedArray = filteredArray.sort((x, y) => y[1]['af'] - x[1]['af']);
        sortedArray.forEach(item => {
            sortedKeys.push(item[0]);
        });
    }
    return sortedKeys;
}