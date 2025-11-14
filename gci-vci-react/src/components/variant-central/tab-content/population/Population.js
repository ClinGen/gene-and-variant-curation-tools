import React, { Component } from 'react';
import Panel from '../../../common/CardPanel';
import { connect } from 'react-redux';
import { parseFloatShort } from '../../helpers/helpers';
import { populationStatic, parseAlleleMyVariant, sortObjKeys } from '../../helpers/population_data';
import { renderDataCredit } from '../../helpers/credit';
import { getHgvsNotation } from '../../helpers/hgvs_notation';
import PopulationEvaluation from './PopulationEvaluation';
import { CompleteSection } from "../CompleteSection";
import GnomADTable from './GnomADTable';
import LoadingSpinner from '../../../common/LoadingSpinner';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import Input from '../../../common/Input';
import axios from 'axios';

import { AddArticleEvidenceTableView } from '../ArticleEvidenceTableView';

// Supported categories of gnomAD data from LDH (with mapping to VCI display names)
const gnomADv4Categories = [{
  'DisplayName': 'Exomes',
  'LDHProperty': 'GnomADExomesV4.1'
}, {
  'DisplayName': 'Genomes',
  'LDHProperty': 'GnomADGenomesV4.1'
}];

class Population extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      variant: this.props.variant,
      interpretation: this.props.interpretation,
      ext_gnomadv2: false,
      ext_myVariantInfo_metadata: null,
      ext_pageData: null,
      ext_singleNucleotide: true,
      hasGnomadData: false, // flag to display gnomAD table
      hasGnomADv4Data: false, // flag to display gnomAD v4 table
      hasPageData: false, // flag to display PAGE table
      loading_pageData: true,
      gnomADv4Data: {},

      populationObj: {
        gnomAD: {
          _version: '', afr: {}, amr: {}, asj: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
        }
      }
    };
    this.state = this.initialState;

    this.axioCanceller = axios.CancelToken.source();
  }

  componentDidMount() {
    this.fetchPopData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.myVariantInfoData !== this.props.myVariantInfoData) {
      this.parseGnomadData(this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata);
    }

    if (prevProps.ldhData !== this.props.ldhData) {
      this.parseLDHgnomADData(this.props.ldhData);
    }
  }

  componentWillUnmount() {
    this.axioCanceller.cancel('Request cancelled');
  }

  fetchPopData() {
    const variant = this.state.variant;
    if (variant) {
      this.fetchPageData(variant);
      this.parseVariantType(variant);
    }
    this.fetchMyVariantInfoMetadata();
  }

  // Retrieve MyVariantInfo metadata for the src_version
  fetchMyVariantInfoMetadata() {
    // read in the myvariant.info metadata
    axios.get(EXTERNAL_API_MAP['MyVariantInfoMetadata'], { cancelToken: this.axioCanceller.token })
      .then(meta_response => {
        if (meta_response) {
          this.setState({ ext_myVariantInfo_metadata: meta_response.data });
        }
      })
      .catch(err => {
        if (axios.isCancel(err)) {
          return;
        }
        console.error(err);
      });
  }

  /**
   * Retrieve data from PAGE data
   * @param {object} variant - The variant data object
   */
  fetchPageData(variant) {
    if (variant &&
        this.props.auth && this.props.auth.email !== 'clingen.demo.curator@genome.stanford.edu' &&
        window && window.location && window.location.hostname !== 'localhost') {
      let hgvs_notation = getHgvsNotation(variant, 'GRCh37', true);
      let hgvsParts = hgvs_notation ? hgvs_notation.split(':') : [];
      let position = hgvsParts[1] ? hgvsParts[1].replace(/[^\d]/g, '') : '';
      let pageDataVariantId = hgvsParts[0] && position ? hgvsParts[0] + ':' + position : '';
      if (pageDataVariantId) {
        axios.get(EXTERNAL_API_MAP['PAGE'] + pageDataVariantId)
          .then(response => {
            this.setState({ ext_pageData: response.data, loading_pageData: false, hasPageData: true });
          }).catch(err => {
            this.setState({ loading_pageData: false });
            console.log('Page Data Fetch Error=: %o', err);
          });
      } else {
        this.setState({ loading_pageData: false });
      }
    } else {
      this.setState({ loading_pageData: false });
    }
  }

  // Update info related to selected data categories for gnomAD v4 table
  changeGnomADv4AddInfo(categoryName) {
    let gnomADv4Data = this.state.gnomADv4Data;
    let categoriesChecked = [];

    // Invert the status of the clicked checkbox
    gnomADv4Data[categoryName].checkboxChecked = !gnomADv4Data[categoryName].checkboxChecked;
    gnomADv4Data.Display = {};

    // Find all checked data categories and add them to the display data object
    gnomADv4Categories.forEach(gnomADv4Category => {
      if (gnomADv4Data[gnomADv4Category.DisplayName]?.checkboxChecked) {
        gnomADv4Data[gnomADv4Category.DisplayName].checkboxDisabled = false;

        if (!gnomADv4Data[gnomADv4Category.DisplayName].noVariant) {
          categoriesChecked.push(gnomADv4Category.DisplayName);
        }

        gnomADv4Data.Display.DataRows = this.changeGnomADv4Table(gnomADv4Data[gnomADv4Category.DisplayName].DataRows,
          gnomADv4Data.Display.DataRows, 'DataRows');
        gnomADv4Data.Display.TotalRows = this.changeGnomADv4Table(gnomADv4Data[gnomADv4Category.DisplayName].TotalRows,
          gnomADv4Data.Display.TotalRows, 'TotalRows');
      }
    });

    // If only one data category is checked, disable its checkbox (to prevent an empty table)
    if (categoriesChecked.length === 1) {
      gnomADv4Data[categoriesChecked[0]].checkboxDisabled = true;
    }

    this.setState({ gnomADv4Data: gnomADv4Data });
  }

  // Update display data in gnomAD v4 table
  changeGnomADv4Table(categoryData, displayData, rowType) {
    // If display data object is falsy (doesn't exist), assign input category data to it
    if (!displayData) {
      displayData = [];

      // Loop through each genetic ancestry within the category data
      for (let iCat = 0; iCat < categoryData.length; iCat++) {
        displayData[iCat] = {
          'AC': categoryData[iCat].AC,
          'AF': categoryData[iCat].AF,
          'AN': categoryData[iCat].AN,
          'HOM': categoryData[iCat].HOM,
          'ID': categoryData[iCat].ID,
          'Name': categoryData[iCat].Name
        };

        // If category data is subdivided (e.g. by sex), use recursion to add it to the display data object
        if (categoryData[iCat].subRows && rowType !== 'TotalRows') {
          displayData[iCat].subRows = this.changeGnomADv4Table(categoryData[iCat].subRows,
            displayData[iCat].subRows, rowType);
        }
      }

    // Add input category data to display data object
    } else {
      // Loop through each genetic ancestry within the category data
      for (let iCat = 0; iCat < categoryData.length; iCat++) {
        let iDisp = iCat;

        // Check if genetic ancestry exists in display data object
        if (!displayData[iCat]) {
          iDisp = -1;
        }  else if (categoryData[iCat].ID !== displayData[iCat].ID) {
          iDisp = displayData.findIndex(dispElement => dispElement.ID === categoryData[iCat].ID);
        }

        // Increment (or assign) category data to display data object
        if (iDisp >= 0) {
          displayData[iDisp].AC += categoryData[iCat].AC;
          displayData[iDisp].AN += categoryData[iCat].AN;
          displayData[iDisp].AF = displayData[iDisp].AC == 0 && displayData[iDisp].AN == 0
            ? 0 : parseFloat(displayData[iDisp].AC / displayData[iDisp].AN);
          displayData[iDisp].HOM += categoryData[iCat].HOM;
        } else {
          const iDispLength = displayData.push({
            'AC': categoryData[iCat].AC,
            'AF': categoryData[iCat].AF,
            'AN': categoryData[iCat].AN,
            'HOM': categoryData[iCat].HOM,
            'ID': categoryData[iCat].ID,
            'Name': categoryData[iCat].Name
          });

          iDisp = iDispLength - 1;
        }

        // If category data is subdivided (e.g. by sex), use recursion to add it to the display data object
        if (categoryData[iCat].subRows && rowType !== 'TotalRows') {
          displayData[iDisp].subRows = this.changeGnomADv4Table(categoryData[iCat].subRows,
            displayData[iDisp].subRows, rowType);
        }
      }
    }

    return (displayData);
  }

  // Method to assign gnomAD population data to global population object
  parseGnomadData(response, metadata) {
    let populationObj = this.state.populationObj;

    // Parse gnomAD exome data in myvariant.info response
    if (response.gnomad_exome && (response.gnomad_exome.ac || response.gnomad_exome.an || response.gnomad_exome.hom)) {
      let indexHOM = -2;
      let gnomADExomeAC, gnomADExomeAN, gnomADExomeHOM, gnomADExomeAF;

      populationObj.gnomAD._extra.hasExomeData = true;

      // Possible resulting values for indexHOM (and what each indicates):
      // -2  - default set above, response data either doesn't exist or isn't in tested format (variant likely isn't multi-allelic),
      //       so any homozygote numbers would be in response.gnomad_*.hom['hom_' + key] ("default" location)
      // -1  - response data exists, but current minor allele (response.gnomad_*.alt) not found within it,
      //       so homozygote numbers are not available
      // >=0 - response data exists and current minor allele (response.gnomad_*.alt) found within it,
      //       so homozygote numbers should be in response.gnomad_*.hom['hom_' + key][indexHOM]
      if (Array.isArray(response.gnomad_exome.alleles) && response.gnomad_exome.hom && Array.isArray(response.gnomad_exome.hom.hom)) {
        indexHOM = response.gnomad_exome.alleles.indexOf(response.gnomad_exome.alt);
      }

      // Retrieve allele and homozygote exome data for each population
      populationStatic.gnomAD._order.forEach(key => {
        gnomADExomeAC = response.gnomad_exome.ac ? parseInt(response.gnomad_exome.ac['ac_' + key]) : null;
        populationObj.gnomAD[key].ac = isNaN(gnomADExomeAC) ? null : gnomADExomeAC;

        gnomADExomeAN = response.gnomad_exome.an ? parseInt(response.gnomad_exome.an['an_' + key]) : null;
        populationObj.gnomAD[key].an = isNaN(gnomADExomeAN) ? null : gnomADExomeAN;

        if (indexHOM < -1) {
          gnomADExomeHOM = response.gnomad_exome.hom ? parseInt(response.gnomad_exome.hom['hom_' + key]) : null;
          populationObj.gnomAD[key].hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
        } else if (indexHOM > -1) {
          gnomADExomeHOM = parseInt(response.gnomad_exome.hom['hom_' + key][indexHOM]);
          populationObj.gnomAD[key].hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
        }

        gnomADExomeAF = populationObj.gnomAD[key].ac / populationObj.gnomAD[key].an;
        populationObj.gnomAD[key].af = isFinite(gnomADExomeAF) ? gnomADExomeAF : null;
      });

      // Retrieve allele and homozygote exome totals
      gnomADExomeAC = response.gnomad_exome.ac ? parseInt(response.gnomad_exome.ac.ac) : null;
      populationObj.gnomAD._tot.ac = isNaN(gnomADExomeAC) ? null : gnomADExomeAC;

      gnomADExomeAN = response.gnomad_exome.an ? parseInt(response.gnomad_exome.an.an) : null;
      populationObj.gnomAD._tot.an = isNaN(gnomADExomeAN) ? null : gnomADExomeAN;

      if (indexHOM < -1) {
        gnomADExomeHOM = response.gnomad_exome.hom ? parseInt(response.gnomad_exome.hom.hom) : null;
        populationObj.gnomAD._tot.hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
      } else if (indexHOM > -1) {
        gnomADExomeHOM = parseInt(response.gnomad_exome.hom.hom[indexHOM]);
        populationObj.gnomAD._tot.hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
      }

      gnomADExomeAF = populationObj.gnomAD._tot.ac / populationObj.gnomAD._tot.an;
      populationObj.gnomAD._tot.af = isFinite(gnomADExomeAF) ? gnomADExomeAF : null;

      // Retrieve variant information
      populationObj.gnomAD._extra.chrom = response.gnomad_exome.chrom;
      populationObj.gnomAD._extra.pos = response.gnomad_exome.pos;
      populationObj.gnomAD._extra.ref = response.gnomad_exome.ref;
      populationObj.gnomAD._extra.alt = response.gnomad_exome.alt;

      // Retrieve any available filter information
      if (response.gnomad_exome.filter) {
        if (Array.isArray(response.gnomad_exome.filter)) {
          populationObj.gnomAD._extra.exome_filter = response.gnomad_exome.filter;
        } else {
          populationObj.gnomAD._extra.exome_filter = [response.gnomad_exome.filter];
        }
      }
    }

    // Parse gnomAD genome data in myvariant.info response
    if (response.gnomad_genome && (response.gnomad_genome.ac || response.gnomad_genome.an || response.gnomad_genome.hom)) {
      let indexHOM = -2;
      let gnomADGenomeAC, gnomADGenomeAN, gnomADGenomeHOM, gnomADGenomeAF;
      let hasExomeData = populationObj.gnomAD._extra.hasExomeData;

      populationObj.gnomAD._extra.hasGenomeData = true;

      if (Array.isArray(response.gnomad_genome.alleles) && response.gnomad_genome.hom && Array.isArray(response.gnomad_genome.hom.hom)) {
        indexHOM = response.gnomad_genome.alleles.indexOf(response.gnomad_genome.alt);
      }

      // Retrieve allele and homozygote genome data for each population and add it to any corresponding exome data
      populationStatic.gnomAD._order.forEach(key => {
        gnomADGenomeAC = response.gnomad_genome.ac ? parseInt(response.gnomad_genome.ac['ac_' + key]) : null;
        if (!(isNaN(gnomADGenomeAC) || gnomADGenomeAC == null)) {
          if (hasExomeData) {
            populationObj.gnomAD[key].ac += gnomADGenomeAC;
          } else {
            populationObj.gnomAD[key].ac = gnomADGenomeAC;
          }
        }

        gnomADGenomeAN = response.gnomad_genome.an ? parseInt(response.gnomad_genome.an['an_' + key]) : null;
        if (!(isNaN(gnomADGenomeAN) || gnomADGenomeAN == null)) {
          if (hasExomeData) {
            populationObj.gnomAD[key].an += gnomADGenomeAN;
          } else {
            populationObj.gnomAD[key].an = gnomADGenomeAN;
          }
        }

        if (indexHOM < -1) {
          gnomADGenomeHOM = response.gnomad_genome.hom ? parseInt(response.gnomad_genome.hom['hom_' + key]) : null;
        } else if (indexHOM > -1) {
          gnomADGenomeHOM = parseInt(response.gnomad_genome.hom['hom_' + key][indexHOM]);
        }

        if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
          if (hasExomeData) {
            populationObj.gnomAD[key].hom += gnomADGenomeHOM;
          } else {
            populationObj.gnomAD[key].hom = gnomADGenomeHOM;
          }
        }

        gnomADGenomeAF = populationObj.gnomAD[key].ac / populationObj.gnomAD[key].an;
        populationObj.gnomAD[key].af = isFinite(gnomADGenomeAF) ? gnomADGenomeAF : null;
      });

      // Retrieve allele and homozygote genome totals and add them to any corresponding exome totals
      gnomADGenomeAC = response.gnomad_genome.ac ? parseInt(response.gnomad_genome.ac.ac) : null;
      if (!(isNaN(gnomADGenomeAC) || gnomADGenomeAC == null)) {
        if (hasExomeData) {
          populationObj.gnomAD._tot.ac += gnomADGenomeAC;
        } else {
          populationObj.gnomAD._tot.ac = gnomADGenomeAC;
        }
      }

      gnomADGenomeAN = response.gnomad_genome.an ? parseInt(response.gnomad_genome.an.an) : null;
      if (!(isNaN(gnomADGenomeAN) || gnomADGenomeAN == null)) {
        if (hasExomeData) {
          populationObj.gnomAD._tot.an += gnomADGenomeAN;
        } else {
          populationObj.gnomAD._tot.an = gnomADGenomeAN;
        }
      }

      if (indexHOM < -1) {
        gnomADGenomeHOM = response.gnomad_genome.hom ? parseInt(response.gnomad_genome.hom.hom) : null;
      } else if (indexHOM > -1) {
        gnomADGenomeHOM = parseInt(response.gnomad_genome.hom.hom[indexHOM]);
      }

      if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
        if (hasExomeData) {
          populationObj.gnomAD._tot.hom += gnomADGenomeHOM;
        } else {
          populationObj.gnomAD._tot.hom = gnomADGenomeHOM;
        }
      }

      gnomADGenomeAF = populationObj.gnomAD._tot.ac / populationObj.gnomAD._tot.an;
      populationObj.gnomAD._tot.af = isFinite(gnomADGenomeAF) ? gnomADGenomeAF : null;

      // Retrieve variant information (if not already collected)
      if (!populationObj.gnomAD._extra.chrom) {
        populationObj.gnomAD._extra.chrom = response.gnomad_genome.chrom;
      }

      if (!populationObj.gnomAD._extra.pos) {
        populationObj.gnomAD._extra.pos = response.gnomad_genome.pos;
      }

      if (!populationObj.gnomAD._extra.ref) {
        populationObj.gnomAD._extra.ref = response.gnomad_genome.ref;
      }

      if (!populationObj.gnomAD._extra.alt) {
        populationObj.gnomAD._extra.alt = response.gnomad_genome.alt;
      }

      // Retrieve any available filter information
      if (response.gnomad_genome.filter) {
        if (Array.isArray(response.gnomad_genome.filter)) {
          populationObj.gnomAD._extra.genome_filter = response.gnomad_genome.filter;
        } else {
          populationObj.gnomAD._extra.genome_filter = [response.gnomad_genome.filter];
        }
      }

      // Get the source version
      if (metadata && metadata.src && metadata.src.gnomad && metadata.src.gnomad.version) {
        populationObj.gnomAD._version = metadata.src.gnomad.version;
      }
    }

    if (populationObj.gnomAD._extra.hasExomeData || populationObj.gnomAD._extra.hasGenomeData) {
      this.setState({ hasGnomadData: true, populationObj: populationObj });
    }
  }

  // Parse gnomAD population data from LDH
  parseLDHgnomADPopData(gnomADSourcePopData) {
    let gnomADv4PopData = {};

    if (gnomADSourcePopData) {
      // Save allele count, number and frequency, IDs and name
      gnomADv4PopData.AC = 'focusAlleleCount' in gnomADSourcePopData ? gnomADSourcePopData.focusAlleleCount : '--';
      gnomADv4PopData.AN = 'locusAlleleCount' in gnomADSourcePopData ? gnomADSourcePopData.locusAlleleCount : '--';
      gnomADv4PopData.AF = 'alleleFrequency' in gnomADSourcePopData ? parseFloat(gnomADSourcePopData.alleleFrequency) : '--';
      gnomADv4PopData.FAFID = 'id' in gnomADSourcePopData ? gnomADSourcePopData.id : '';

      if (gnomADSourcePopData.cohort) {
        gnomADv4PopData.ID = 'id' in gnomADSourcePopData.cohort ? gnomADSourcePopData.cohort.id : gnomADv4PopData.FAFID;
        gnomADv4PopData.Name = Array.isArray(gnomADSourcePopData.cohort.characteristics) && gnomADSourcePopData.cohort.characteristics.length > 0
          && 'value' in gnomADSourcePopData.cohort.characteristics[gnomADSourcePopData.cohort.characteristics.length - 1]
          ? gnomADSourcePopData.cohort.characteristics[gnomADSourcePopData.cohort.characteristics.length - 1].value : '';
      } else {
        gnomADv4PopData.ID = '';
        gnomADv4PopData.Name = '';
      }

      // Save number of homozygotes and filtering allele frequency data
      if (gnomADSourcePopData.ancillaryResults) {
        const gnomADSourcePopDataAR = gnomADSourcePopData.ancillaryResults;

        gnomADv4PopData.HOM = 'homozygotes' in gnomADSourcePopDataAR ? gnomADSourcePopDataAR.homozygotes : '--';

        if (gnomADSourcePopDataAR.grpMaxFAF95) {
          gnomADv4PopData.GMFAF = {};
          gnomADv4PopData.GMFAF.ID = 'groupId' in gnomADSourcePopDataAR.grpMaxFAF95 ? gnomADSourcePopDataAR.grpMaxFAF95.groupId : '';
          gnomADv4PopData.GMFAF.CI = 'confidenceInterval' in gnomADSourcePopDataAR.grpMaxFAF95 ? gnomADSourcePopDataAR.grpMaxFAF95.confidenceInterval : '--';
          gnomADv4PopData.GMFAF.FAF = 'frequency' in gnomADSourcePopDataAR.grpMaxFAF95 ? parseFloat(gnomADSourcePopDataAR.grpMaxFAF95.frequency) : '--';
        }

        if (gnomADSourcePopDataAR.jointGrpMaxFAF95) {
          gnomADv4PopData.JGMFAF = {};
          gnomADv4PopData.JGMFAF.ID = 'groupId' in gnomADSourcePopDataAR.jointGrpMaxFAF95 ? gnomADSourcePopDataAR.jointGrpMaxFAF95.groupId : '';
          gnomADv4PopData.JGMFAF.CI = 'confidenceInterval' in gnomADSourcePopDataAR.jointGrpMaxFAF95 ? gnomADSourcePopDataAR.jointGrpMaxFAF95.confidenceInterval : '--';
          gnomADv4PopData.JGMFAF.FAF = 'frequency' in gnomADSourcePopDataAR.jointGrpMaxFAF95 ? parseFloat(gnomADSourcePopDataAR.jointGrpMaxFAF95.frequency) : '--';
        }

        if (gnomADSourcePopDataAR.jointFreq) {
          gnomADv4PopData.JFAF = {};
          gnomADv4PopData.JFAF.AC = 'AC' in gnomADSourcePopDataAR.jointFreq ? gnomADSourcePopDataAR.jointFreq.AC : '';
          gnomADv4PopData.JFAF.AN = 'AN' in gnomADSourcePopDataAR.jointFreq ? gnomADSourcePopDataAR.jointFreq.AN : '';
          gnomADv4PopData.JFAF.AF = 'AF' in gnomADSourcePopDataAR.jointFreq ? gnomADSourcePopDataAR.jointFreq.AF : '';
          gnomADv4PopData.JFAF.HOM = 'homozygote_count' in gnomADSourcePopDataAR.jointFreq ? gnomADSourcePopDataAR.jointFreq.homozygote_count : '';
        }
      } else {
        gnomADv4PopData.HOM = '--';
      }

      // Check if source data is subdivided (e.g. by genetic ancestry or sex)
      if (Array.isArray(gnomADSourcePopData.subcohortFrequency)) {
        gnomADv4PopData.subRows = [];

        // Use recursion to save subdivided data
        gnomADSourcePopData.subcohortFrequency.forEach(gnomADv4SubCohort => {
          const gnomADv4SubCohortData = this.parseLDHgnomADPopData(gnomADv4SubCohort);

          gnomADv4PopData.subRows.push(gnomADv4SubCohortData);

          // Check if source data is at sex subdivision (and save allele counts and homozygotes in sex totals)
          if (gnomADv4SubCohortData.Name === 'XX' || gnomADv4SubCohortData.Name === 'XY') {
            if (!gnomADv4PopData.sexTotals) {
              gnomADv4PopData.sexTotals = [];
            }

            const gnomADv4SexSubTotal = {
              'AC': Number(gnomADv4SubCohortData.AC) && gnomADv4SubCohortData.AC !== true ? Number(gnomADv4SubCohortData.AC) : 0,
              'AN': Number(gnomADv4SubCohortData.AN) && gnomADv4SubCohortData.AN !== true ? Number(gnomADv4SubCohortData.AN) : 0,
              'HOM': Number(gnomADv4SubCohortData.HOM) && gnomADv4SubCohortData.HOM !== true ? Number(gnomADv4SubCohortData.HOM) : 0,
              'Name': gnomADv4SubCohortData.Name
            };

            gnomADv4PopData.sexTotals.push(gnomADv4SexSubTotal);

          // If sex totals exist, source data expected to be at genetic ancestry subdivision
          } else if (gnomADv4SubCohortData.sexTotals) {
            // If IDs match, set filtering allele frequency name (to genetic ancestry)
            if (gnomADv4PopData?.GMFAF?.ID === gnomADv4SubCohortData.FAFID) {
              gnomADv4PopData.GMFAF.Name = gnomADv4SubCohortData.Name;
            }

            if (gnomADv4PopData?.JGMFAF?.ID === gnomADv4SubCohortData.FAFID) {
              gnomADv4PopData.JGMFAF.Name = gnomADv4SubCohortData.Name;
            }

            // Add allele counts and homozygotes to sex totals
            if (!gnomADv4PopData.sexTotals) {
              gnomADv4PopData.sexTotals = gnomADv4SubCohortData.sexTotals;

            } else {
              for (let iSex = 0; iSex < gnomADv4SubCohortData.sexTotals.length; iSex++) {
                let iTotal = iSex;

                if (gnomADv4SubCohortData.sexTotals[iSex].Name !== gnomADv4PopData.sexTotals[iSex].Name) {
                  iTotal = gnomADv4PopData.sexTotals.findIndex(sexElement =>
                    sexElement.Name === gnomADv4SubCohortData.sexTotals[iSex].Name
                  );
                }

                if (iTotal >= 0) {
                  gnomADv4PopData.sexTotals[iTotal].AC += gnomADv4SubCohortData.sexTotals[iSex].AC;
                  gnomADv4PopData.sexTotals[iTotal].AN += gnomADv4SubCohortData.sexTotals[iSex].AN;
                  gnomADv4PopData.sexTotals[iTotal].HOM += gnomADv4SubCohortData.sexTotals[iSex].HOM;
                } else {
                  gnomADv4PopData.sexTotals.push(gnomADv4SubCohortData.sexTotals[iSex]);
                }
              }
            }
          }
        });
      }
    }

    return (gnomADv4PopData);
  }

  // Parse gnomAD data from LDH
  parseLDHgnomADData(response) {
    // Identify the data to pull out (by LDH ID)
    const gnomADv4DatasetID = 'gnomAD4.1';
    const gnomADv4TotalsID = 'ALL';

    // Set saved data defaults
    let gnomADv4Data = this.state.gnomADv4Data;
    let categoriesChecked = [];
    let FAFTotalColumn = {
      'AC': 0,
      'ACCalc': 0,
      'AN': 0,
      'ANCalc': 0,
      'AF': 0,
      'AFCalc': 0,
      'Filter': [],
      'HOM': 0,
      'HOMCalc': 0,
      'Name': 'Total',
      'fromLDH': false
    };
    let getgnomADv4Metadata = true;
    let gnomADv4MissingVariants = [];

    gnomADv4Data.Display = {};
    gnomADv4Data.FAF = [
      [''],
      ['Filters'],
      ['Allele Count'],
      ['Allele Number'],
      ['Allele Frequency'],
      [(<span key="grpmax-filter-af">Grpmax Filtering AF<a className="no-external-link"
        href="https://gnomad.broadinstitute.org/help/faf" title="Filtering allele frequency help"
        target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faQuestionCircle}
        className="ml-1 mr-1" /></a><br />(95% confidence)</span>)],
      ['Grpmax Filtering AF Group'],
      ['Number of homozygotes']
    ];

    if (response?.ld) {
      // Find all supported data categories
      gnomADv4Categories.forEach(gnomADv4Category => {
        if (Array.isArray(response.ld[gnomADv4Category.LDHProperty])) {
          // Looping through all elements of a category, but only expecting one
          response.ld[gnomADv4Category.LDHProperty].forEach(gnomADv4Dataset => {
            if (gnomADv4Dataset?.entContent?.gks_va_freq?.derivedFrom?.id === gnomADv4DatasetID) {
              // Save metadata (only once)
              if (getgnomADv4Metadata) {
                gnomADv4Data.ID = 'entId' in gnomADv4Dataset ? gnomADv4Dataset.entId : '';
                gnomADv4Data.DisplayID = gnomADv4Data.ID.match(/^chr/) ? gnomADv4Data.ID.substring(3) : gnomADv4Data.ID;
                gnomADv4Data.IRI = 'entIri' in gnomADv4Dataset ? gnomADv4Dataset.entIri : '';
                gnomADv4Data.Label = 'label' in gnomADv4Dataset.entContent.gks_va_freq.derivedFrom
                  ? gnomADv4Dataset.entContent.gks_va_freq.derivedFrom.label : '';
                gnomADv4Data.Version = 'version' in gnomADv4Dataset.entContent.gks_va_freq.derivedFrom
                  ? gnomADv4Dataset.entContent.gks_va_freq.derivedFrom.version : '';

                if (gnomADv4Dataset.entContent.locus) {
                  gnomADv4Data.Chr = 'contig' in gnomADv4Dataset.entContent.locus
                    ? gnomADv4Dataset.entContent.locus.contig.match(/^chr/)
                      ? gnomADv4Dataset.entContent.locus.contig.substring(3) : gnomADv4Dataset.entContent.locus.contig
                    : '';
                  gnomADv4Data.Pos = 'position' in gnomADv4Dataset.entContent.locus
                    ? gnomADv4Dataset.entContent.locus.position : '';
                }

                getgnomADv4Metadata = false;
              }

              // Save filtering allele frequency column name and filters
              // For filters, if "qcFilters" is empty and "noVariant" is absent, default to "Pass"
              let FAFColumn = {
                'Name': gnomADv4Category.DisplayName,
                'Filters': Array.isArray(gnomADv4Dataset.entContent.gks_va_freq?.qualityMeasures?.qcFilters)
                  ? gnomADv4Dataset.entContent.gks_va_freq.qualityMeasures.qcFilters.length > 0
                    ? gnomADv4Dataset.entContent.gks_va_freq.qualityMeasures.qcFilters
                    : gnomADv4Dataset.entContent.noVariant ? 'No variant' : 'Pass'
                  : gnomADv4Dataset.entContent.noVariant ? 'No variant' : ''
              };

              // Save population data
              const gnomADv4CategoryData = this.parseLDHgnomADPopData(gnomADv4Dataset.entContent.gks_va_freq);

              // If sex totals are present in population data, set allele frequency and ID for each
              if (Array.isArray(gnomADv4CategoryData.sexTotals)) {
                for (let sexElement of gnomADv4CategoryData.sexTotals) {
                  sexElement.AF = sexElement.AC == 0 && sexElement.AN == 0
                    ? 0 : parseFloat(sexElement.AC / sexElement.AN);
                  sexElement.ID = 'Total.' + sexElement.Name;
                }
              }

              // Save all category data together
              gnomADv4Data[gnomADv4Category.DisplayName] = {
                'DataRows': gnomADv4CategoryData.subRows ? gnomADv4CategoryData.subRows : [],
                'Filters': FAFColumn.Filters,
                'ID': gnomADv4CategoryData.ID,
                'Name': gnomADv4CategoryData.Name,
                'TotalRows': gnomADv4CategoryData.sexTotals ? gnomADv4CategoryData.sexTotals : []
              };

              // If group max is present in population data, save in filtering allele frequency column
              if (gnomADv4CategoryData.GMFAF) {
                FAFColumn.GMF = 'FAF' in gnomADv4CategoryData.GMFAF ? gnomADv4CategoryData.GMFAF.FAF : '';
                FAFColumn.GMN = 'Name' in gnomADv4CategoryData.GMFAF ? gnomADv4CategoryData.GMFAF.Name : '';
              }

              // If joint group max is present in population data (and greater than previously-saved frequency),
              // save in filtering allele frequency total column
              if (gnomADv4CategoryData.JGMFAF) {
                if (FAFTotalColumn.GMF) {
                  if (Number(gnomADv4CategoryData.JGMFAF.FAF) && gnomADv4CategoryData.JGMFAF.FAF > FAFTotalColumn.GMF) {
                    FAFTotalColumn.GMF = gnomADv4CategoryData.JGMFAF.FAF;
                    FAFTotalColumn.GMN = 'Name' in gnomADv4CategoryData.JGMFAF ? gnomADv4CategoryData.JGMFAF.Name : '';
                  }
                } else {
                  FAFTotalColumn.GMF = 'FAF' in gnomADv4CategoryData.JGMFAF ? gnomADv4CategoryData.JGMFAF.FAF : '';
                  FAFTotalColumn.GMN = 'Name' in gnomADv4CategoryData.JGMFAF ? gnomADv4CategoryData.JGMFAF.Name : '';
                }
              }

              // If joint frequency is present in population data, save in filtering allele frequency total column
              if (gnomADv4CategoryData.JFAF && !FAFTotalColumn.fromLDH) {
                FAFTotalColumn.AC = gnomADv4CategoryData.JFAF.AC;
                FAFTotalColumn.AN = gnomADv4CategoryData.JFAF.AN;
                FAFTotalColumn.AF = gnomADv4CategoryData.JFAF.AF;
                FAFTotalColumn.HOM = gnomADv4CategoryData.JFAF.HOM;
                FAFTotalColumn.fromLDH = true;
              }

              // Add display flags to category data
              if (gnomADv4Data[gnomADv4Category.DisplayName].DataRows.length > 0) {
                gnomADv4Data[gnomADv4Category.DisplayName].checkboxChecked = true;
                gnomADv4Data[gnomADv4Category.DisplayName].checkboxDisabled = false;

                if (gnomADv4Dataset.entContent.noVariant) {
                  gnomADv4Data[gnomADv4Category.DisplayName].noVariant = true;
                } else {
                  categoriesChecked.push(gnomADv4Category.DisplayName);
                }
              } else {
                gnomADv4Data[gnomADv4Category.DisplayName].checkboxChecked = false;
                gnomADv4Data[gnomADv4Category.DisplayName].checkboxDisabled = true;
              }

              // Save allele and homozygote data as category and filtering allele frequency totals
              // For the "all" category, there's no need to sum the data
              if (gnomADv4CategoryData.ID === gnomADv4TotalsID) {
                gnomADv4Data[gnomADv4Category.DisplayName].TotalRows.push({
                  'AC': gnomADv4CategoryData.AC,
                  'AN': gnomADv4CategoryData.AN,
                  'AF': gnomADv4CategoryData.AF,
                  'HOM': gnomADv4CategoryData.HOM,
                  'ID': 'Total',
                  'Name': 'Total'
                });

                FAFColumn.AC = gnomADv4CategoryData.AC;
                FAFColumn.AN = gnomADv4CategoryData.AN;
                FAFColumn.AF = gnomADv4CategoryData.AF;
                FAFColumn.HOM = gnomADv4CategoryData.HOM;
              } else {
                let categoryTotals = {
                  'AC': 0,
                  'AN': 0,
                  'AF': 0,
                  'HOM': 0,
                  'ID': 'Total',
                  'Name': 'Total'
                };

                for (const categoryElement of gnomADv4CategoryData.subRows) {
                  categoryTotals.AC += Number(categoryElement.AC) && categoryElement.AC !== true ? Number(categoryElement.AC) : 0;
                  categoryTotals.AN += Number(categoryElement.AN) && categoryElement.AN !== true ? Number(categoryElement.AN) : 0;
                  categoryTotals.HOM += Number(categoryElement.HOM) && categoryElement.HOM !== true ? Number(categoryElement.HOM) : 0;
                }

                categoryTotals.AF = categoryTotals.AC == 0 && categoryTotals.AN == 0
                  ? 0 : parseFloat(categoryTotals.AC / categoryTotals.AN);
                gnomADv4Data[gnomADv4Category.DisplayName].TotalRows.push(categoryTotals);

                FAFColumn.AC = categoryTotals.AC;
                FAFColumn.AN = categoryTotals.AN;
                FAFColumn.AF = categoryTotals.AF;
                FAFColumn.HOM = categoryTotals.HOM;
              }

              // Add filtering allele frequency totals (for category) to display array and total column
              gnomADv4Data.FAF[0].push(FAFColumn.Name);
              gnomADv4Data.FAF[1].push(FAFColumn.Filters);
              gnomADv4Data.FAF[2].push(FAFColumn.AC);
              gnomADv4Data.FAF[3].push(FAFColumn.AN);
              gnomADv4Data.FAF[4].push(FAFColumn.AF);
              gnomADv4Data.FAF[5].push('GMF' in FAFColumn ? FAFColumn.GMF : '');
              gnomADv4Data.FAF[6].push('GMN' in FAFColumn ? FAFColumn.GMN : '');
              gnomADv4Data.FAF[7].push(FAFColumn.HOM);

              FAFTotalColumn.ACCalc += FAFColumn.AC;
              FAFTotalColumn.ANCalc += FAFColumn.AN;
              FAFTotalColumn.AFCalc = FAFTotalColumn.ACCalc == 0 && FAFTotalColumn.ANCalc == 0
                ? 0 : parseFloat(FAFTotalColumn.ACCalc / FAFTotalColumn.ANCalc);
              FAFTotalColumn.HOMCalc += FAFColumn.HOM;

              gnomADv4Data.Display.DataRows = this.changeGnomADv4Table(gnomADv4Data[gnomADv4Category.DisplayName].DataRows,
                gnomADv4Data.Display.DataRows, 'DataRows');
              gnomADv4Data.Display.TotalRows = this.changeGnomADv4Table(gnomADv4Data[gnomADv4Category.DisplayName].TotalRows,
                gnomADv4Data.Display.TotalRows, 'TotalRows');
            }
          });

        // Data category not present, update display array and filtering allele frequency total column
        } else {
          gnomADv4MissingVariants.push(gnomADv4Data.FAF[0].length);

          gnomADv4Data.FAF[0].push(gnomADv4Category.DisplayName);
          gnomADv4Data.FAF[1].push('No data');
          gnomADv4Data.FAF[2].push('');
          gnomADv4Data.FAF[3].push('');
          gnomADv4Data.FAF[4].push('');
          gnomADv4Data.FAF[5].push('');
          gnomADv4Data.FAF[6].push('');
          gnomADv4Data.FAF[7].push('');

          FAFTotalColumn.Filter.push('Not in ' + gnomADv4Category.DisplayName.toLowerCase());
        }
      });

      // If filtering allele frequency totals provided (via joint frequency), only update allele data (of absent data category)
      if (FAFTotalColumn.fromLDH) {
        if (gnomADv4MissingVariants.length === 1) {
          gnomADv4Data.FAF[2][gnomADv4MissingVariants[0]] = FAFTotalColumn.AC - FAFTotalColumn.ACCalc;
          gnomADv4Data.FAF[3][gnomADv4MissingVariants[0]] = FAFTotalColumn.AN - FAFTotalColumn.ANCalc;
        }

      // Otherwise, add calculated totals to filtering allele frequency total column
      } else {
        FAFTotalColumn.AC = FAFTotalColumn.ACCalc;
        FAFTotalColumn.AN = FAFTotalColumn.ANCalc;
        FAFTotalColumn.AF = FAFTotalColumn.AFCalc;
        FAFTotalColumn.HOM = FAFTotalColumn.HOMCalc;
      }

      // Add filtering allele frequency totals to display array
      gnomADv4Data.FAF[0].push(FAFTotalColumn.Name);
      gnomADv4Data.FAF[1].push(FAFTotalColumn.Filter);
      gnomADv4Data.FAF[2].push(FAFTotalColumn.AC);
      gnomADv4Data.FAF[3].push(FAFTotalColumn.AN);
      gnomADv4Data.FAF[4].push(FAFTotalColumn.AF);
      gnomADv4Data.FAF[5].push('GMF' in FAFTotalColumn ? FAFTotalColumn.GMF : '');
      gnomADv4Data.FAF[6].push('GMN' in FAFTotalColumn ? FAFTotalColumn.GMN : '');
      gnomADv4Data.FAF[7].push(FAFTotalColumn.HOM);

      // If only one data category is checked, disable its checkbox (to prevent an empty table)
      if (categoriesChecked.length === 1) {
        gnomADv4Data[categoriesChecked[0]].checkboxDisabled = true;
      }
    }

    // If metadata not provided, get info for gnomAD link from variant object
    if (getgnomADv4Metadata && this.state.variant?.hgvsNames?.GRCh38) {
      const Chr = this.state.variant.hgvsNames.GRCh38.substring(7, 9);
      const Pos = this.state.variant.hgvsNames.GRCh38.match(/:g.(\d+)\D/);

      if (Chr) {
        if (Chr.indexOf('0') === 0) {
          gnomADv4Data.Chr = Chr.substring(1);
        } else if (Chr === '23') {
          gnomADv4Data.Chr = 'X';
        } else if (Chr === '24') {
          gnomADv4Data.Chr = 'Y';
        } else {
          gnomADv4Data.Chr = Chr;
        }
      }

      if (Pos?.length > 1) {
        gnomADv4Data.Pos = Pos[1];
      }
    }

    if (Object.keys(gnomADv4Data.Display).length) {
      this.setState({ hasGnomADv4Data: true, gnomADv4Data: gnomADv4Data });
    }
  }

  // Method to parse variant type
  // Won't show population/predictor data if subject is not single nucleotide variant or indel
  parseVariantType(variant) {
    if (variant) {
      // Reference to http://www.hgvs.org/mutnomen/recs-DNA.html
      const popVariantTypes = ['single nucleotide variant', 'deletion', 'insertion', 'duplication']
      let seqChangeTypes = ['del', 'dup', 'ins', 'indels', 'inv', 'con'];
      let genomicHGVS, ncGenomic;

      if (variant.hgvsNames && variant.hgvsNames.GRCh37) {
        genomicHGVS = variant.hgvsNames.GRCh37;
      } else if (variant.hgvsNames && variant.hgvsNames.GRCh38) {
        genomicHGVS = variant.hgvsNames.GRCh38;
      }
      // Filter variant by its change type
      // Look for the <VariantType> node value in first pass
      // Then look into HGVS term for non-SNV type patterns
      if (variant.variationType) {
        if (popVariantTypes.indexOf(variant.variationType.toLowerCase()) > -1) {
          this.setState({ ext_gnomadv2: true })
        }
      }
      if (variant.variationType && variant.variationType !== 'single nucleotide variant') {
        this.setState({ ext_singleNucleotide: false });
      } else if (genomicHGVS) {
        ncGenomic = genomicHGVS.substring(genomicHGVS.indexOf(':'));
        seqChangeTypes.forEach(type => {
          if (ncGenomic.indexOf(type) > 0) {
            this.setState({ ext_singleNucleotide: false });
          }
        });
      }
    }
  }

  // Method to render additional information (data sources, filter status) in gnomAD population tables
  // If filter(s) not provided by myvariant.info, assume there was a "Pass"; if no data is provided, assume there was a "No variant"
  renderGnomadAddlInfo(dataset, datasetName) {
    if (datasetName === 'gnomAD') {
      return (
        <table className="table additional-info">
          <tbody>
            {dataset._extra.hasExomeData ?
              <tr>
                <td className="included-data"><i className="icon icon-check-circle" /><span>Exomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>
                    {dataset._extra.exome_filter ?
                      dataset._extra.exome_filter.map((filter, index) => {
                        return (this.renderGnomadFilter(filter, (filter + '-' + index), 'warning'));
                      })
                      :
                      this.renderGnomadFilter('Pass', 'Pass', 'success')}
                  </ul>
                </td>
              </tr>
              :
              <tr>
                <td className="included-data"><i className="icon icon-times-circle" /><span>Exomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>{this.renderGnomadFilter('No variant', 'No variant', 'danger')}</ul>
                </td>
              </tr>
            }{dataset._extra.hasGenomeData ?
              <tr>
                <td className="included-data"><i className="icon icon-check-circle" /><span>Genomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>
                    {dataset._extra.genome_filter ?
                      dataset._extra.genome_filter.map((filter, index) => {
                        return (this.renderGnomadFilter(filter, (filter + '-' + index), 'warning'));
                      })
                      :
                      this.renderGnomadFilter('Pass', 'Pass', 'success')}
                  </ul>
                </td>
              </tr>
              :
              <tr>
                <td className="included-data"><i className="icon icon-times-circle" /><span>Genomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>{this.renderGnomadFilter('No variant', 'No variant', 'danger')}</ul>
                </td>
              </tr>
            }
          </tbody>
        </table>
      );
    } else if (datasetName === 'gnomADv4') {
      return (
        <table className="table additional-info">
          <tbody>
            {gnomADv4Categories.map(gnomADv4Category => {
              if (dataset[gnomADv4Category.DisplayName]) {
                return (
                  <tr key={'gnomADv4-checkbox-' + gnomADv4Category.DisplayName}>
                    <td className="included-data">
                      <Input type="checkbox" onChange={() => this.changeGnomADv4AddInfo(gnomADv4Category.DisplayName)}
                        checked={dataset[gnomADv4Category.DisplayName].checkboxChecked}
                        disabled={dataset[gnomADv4Category.DisplayName].checkboxDisabled} />
                      <span>{gnomADv4Category.DisplayName}</span>
                    </td>
                    <td className="filter">
                      <span>Filter:</span>
                      {this.renderGnomADv4Filters(dataset[gnomADv4Category.DisplayName].Filters)}
                    </td>
                  </tr>
                )
              } else {
                return (
                  <tr key={'gnomADv4-checkbox-' + gnomADv4Category.DisplayName}>
                    <td className="included-data">
                      <Input type="checkbox" disabled />
                      <span>{gnomADv4Category.DisplayName}</span>
                    </td>
                    <td className="filter">
                      <span>Filter:</span>
                      {this.renderGnomADv4Filters('No data')}
                    </td>
                  </tr>
                )
              }
            })}
          </tbody>
        </table>
      );
    } else {
      return;
    }
  }

  // Method to render a single filter status in gnomAD population table
  renderGnomadFilter(filter, filterKey, filterClass) {
    return (<li key={filterKey} className={'label label-' + filterClass}>{filter}</li>);
  }

  // Method to render filters in gnomAD tables (filtering allele frequency and population)
  renderGnomADv4Filters(filters) {
    const gnomADv4FilterText = {
      'AC0': 'Allele count is zero due to removal of low quality genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls) at this site',
      'AS_VQSR': 'Failed allele-specific VQSR filter',
      'discrepant_frequencies': 'Has discrepant frequencies between genomes and exomes',
      'InbreedingCoeff': 'Has an inbreeding coefficient < -0.3',
      'not_called_in_exomes': 'This variant was not called in the gnomAD exome callset; no exome samples had any genotype call (no reference or alternate calls)',
      'not_called_in_genomes': 'This variant was not called in the gnomAD genome callset; no genome samples had any genotype call (no reference or alternate calls)',
      'RF': 'Failed random forest filters'
    };

    if (Array.isArray(filters)) {
      if (filters.length > 0) {
        return (
          <ul>
            {filters.map((filter, i) => {
              return (<li key={filter + '-' + i} className="label label-warning" title={filter in gnomADv4FilterText ? gnomADv4FilterText[filter] : ''}>{filter}</li>);
            })}
          </ul>
        );
      } else {
        return ('');
      }
    } else if (filters !== '') {
      const labelType = filters === 'Pass' ? 'success' : 'danger';

      return (
        <ul>
          <li className={'label label-' + labelType}>{filters}</li>
        </ul>
      );
    } else {
      return ('');
    }
  }

  // Method to render gnomAD v2 population table header content
  renderGnomadHeader(datasetCheck, loading_myVariantInfo, dataset, gnomadv2, response, metadata, datasetName) {
    let datasetVariant = '';
    let datasetLink;
    let version;

    if (datasetCheck) {
      datasetVariant = ' ' + dataset._extra.chrom + '-' + dataset._extra.pos + '-' + dataset._extra.ref + '-' + dataset._extra.alt + ' (GRCh37)';
    } else if (response) {
      let alleleData = parseAlleleMyVariant(response);

      if (Object.keys(alleleData).length) {
        datasetVariant = ' ' + alleleData.chrom + '-' + alleleData.pos + '-' + alleleData.ref + '-' + alleleData.alt + ' (GRCh37)';
      }
    }

    // Set the source version
    if (metadata && metadata.src) {
      version = (datasetName === 'gnomAD' && metadata.src.gnomad && metadata.src.gnomad.version) ? '2.1.1 (' + metadata.src.gnomad.version + ')' : '';
    }

    if (datasetCheck && !loading_myVariantInfo && gnomadv2) {
      const datasetParameterValue = (datasetName === 'gnomAD') ? 'gnomad_r2_1' : '';
      const datasetURL = EXTERNAL_API_MAP['gnomADHome'] + 'variant/' + dataset._extra.chrom + '-' + dataset._extra.pos + '-' + dataset._extra.ref + '-' + dataset._extra.alt + '?dataset=' + datasetParameterValue;
      datasetLink = <a className="panel-subtitle ml-2" href={datasetURL} title={`${datasetName} v${version}`} target="_blank" rel="noopener noreferrer">See data in {datasetName}</a>
    }

    return (
      <div>
        {datasetName}{datasetVariant} {version ? <span className="gnomad-version">Version: {version}</span> : null}
        <a href="#credit-myvariant-population" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
        {datasetLink}
      </div>
    );
  }

  // Method to render external gnomAD linkout when no relevant population data is found
  renderGnomadLinkout(response, datasetName) {
    let datasetCheck, datasetLink, datasetParameterValue;
    let linkText = 'Search ' + datasetName;
    // If no gnomAD population data, construct external linkout for one of the following:
    // 1) clinvar/cadd data found & the variant type is substitution
    // 2) clinvar/cadd data found & the variant type is NOT substitution
    // 3) no data returned by myvariant.info
    if (datasetName === 'gnomAD') {
      datasetCheck = this.state.hasGnomadData;
      datasetParameterValue = 'gnomad_r2_1';
      // For "Search gnomAD" link, default to latest version (instead of v2)
      datasetLink = EXTERNAL_API_MAP['gnomADHome'];
    }
    if (response) {
      let chrom = response.chrom;
      const regionStart = response.hg19 ? parseInt(response.hg19.start) - 30 :
        (response.clinvar && response.clinvar.hg19 ? parseInt(response.clinvar.hg19.start) - 30 :
          (response.cadd && response.cadd.hg19 ? parseInt(response.cadd.hg19.start) - 30 : ''));
      const regionEnd = response.hg19 ? parseInt(response.hg19.end) + 30 :
        (response.clinvar && response.clinvar.hg19 ? parseInt(response.clinvar.hg19.end) + 30 :
          (response.cadd && response.cadd.hg19 ? parseInt(response.cadd.hg19.end) + 30 : ''));

      // Applies to 'Duplication', 'Deletion', 'Insertion', 'Indel' (deletion + insertion)
      // Or there is no gnomAD data object in the returned myvariant.info JSON response
      if ((!this.state.ext_gnomadv2 || !datasetCheck) && chrom && regionStart && regionEnd) {
        datasetLink = EXTERNAL_API_MAP['gnomADRegion'] + chrom + '-' + regionStart + '-' + regionEnd + '?dataset=' + datasetParameterValue;
        linkText = ' View the coverage of this region (+/- 30 bp) in ' + datasetName;
      }
    }
    return (
      <span>
        <a href={datasetLink} target="_blank" rel="noopener noreferrer">{linkText}</a> for this variant.
      </span>
    );
  }

  // Method to render external link to gnomAD (when no population data is found)
  renderGnomADv4Linkout(dataset) {
    const datasetParameterValue = 'gnomad_r4';
    const position = dataset?.Chr && parseInt(dataset?.Pos);
    const bpSpread = 30;
    let datasetLink = EXTERNAL_API_MAP['gnomADHome'];
    let linkText = 'Search gnomAD';

    if (!this.state.hasGnomADv4Data && position) {
      datasetLink = EXTERNAL_API_MAP['gnomADRegion'] + dataset.Chr + '-' + (position - bpSpread) + '-'
        + (position + bpSpread) + '?dataset=' + datasetParameterValue;
      linkText = 'View the coverage of this region (+/- ' + bpSpread + ' bp) in gnomAD';
    }

    return (
      <span>
        <a href={datasetLink} target="_blank" rel="noopener noreferrer">{linkText}</a> for this variant.
      </span>
    );
  }

  // Method to render a row of data for the gnomAD v2 table
  renderGnomadRow(key, dataset, datasetStatic, rowNameCustom, className) {
    let rowName = datasetStatic._labels[key];
    if (key === '_tot') {
      rowName = rowNameCustom;
    }
    return (
      <tr key={key} className={className ? className : ''}>
        <td>{rowName}</td>
        <td>{dataset[key].ac || dataset[key].ac === 0 ? dataset[key].ac : '--'}</td>
        <td>{dataset[key].an || dataset[key].an === 0 ? dataset[key].an : '--'}</td>
        <td>{dataset[key].hom || dataset[key].hom === 0 ? dataset[key].hom : '--'}</td>
        <td>{dataset[key].af || dataset[key].af === 0 ? parseFloatShort(dataset[key].af) : '--'}</td>
      </tr>
    );
  }

  /**
   * Method to render PAGE population table header content
   * @param {boolean} hasPageData - Flag for response from querying PAGE Rest api
   * @param {boolean} loading_pageData - Flag for status on receiving/loading data
   * @param {object} pageVariant - Data object abstracted from PAGE response
   * @param (boolean) singleNucleotide - Flag for  single nucleotide variant
   */
  renderPageHeader(hasPageData, loading_pageData, pageVariant, singleNucleotide) {
    const variantData = this.state.variant;
    const nc_genomic = variantData && variantData.hgvsNames && variantData.hgvsNames.GRCh37 ? variantData.hgvsNames.GRCh37 : null;
    if (hasPageData && !loading_pageData && singleNucleotide) {
      // const variantPage = pageVariant.chrom + ':' + pageVariant.pos + ' ' + pageVariant['alleles'][0] + '/' + pageVariant['alleles'][1];
      return (
        <div>PAGE: {nc_genomic} (GRCh37)
          <a href="#credit-pagestudy-population" className="credit-pagestudy" title="pagestudy.org"><i className="icon icon-info-circle"></i> <span>PAGE Study</span></a>
          <a className="panel-subtitle ml-2" href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">GGV Browser</a>
        </div>
      );
    } else {
      return (
        <div>PAGE: {nc_genomic} (GRCh37)
          <a href="#credit-pagestudy-population" className="credit-pagestudy" title="pagestudy.org"><i className="icon icon-info-circle"></i> <span>PAGE Study</span></a>
        </div>
      );
    }
  }

  /**
   * Method to render a row of data for the PAGE table
   * @param {object} pageObj - Individual PAGE population data object (e.g. African American)
   * @param {number} key - Unique number
   */
  renderPageRow(pageObj, key) {
    let popKey = pageObj['pop'];
    return (
      <tr key={key} className="page-data-item">
        <td>{populationStatic.page._labels[popKey]}</td>
        <td>{pageObj['nobs']}</td>
        <td>{pageObj['alleles'][1] + ': ' + parseFloatShort(1 - parseFloat(pageObj['rawfreq']))}</td>
        <td>{pageObj['alleles'][0] + ': ' + parseFloatShort(pageObj['rawfreq'])}</td>
      </tr>
    );
  }

  render() {
    const gnomADStatic = populationStatic.gnomAD;
    const gnomadv2 = this.state.ext_gnomadv2;
    const singleNucleotide = this.state.ext_singleNucleotide;
    const gnomAD = this.state.populationObj && this.state.populationObj.gnomAD ? this.state.populationObj.gnomAD : null; // Get gnomAD data from global population object
    const pageData = this.state.ext_pageData && this.state.ext_pageData.data ? this.state.ext_pageData.data : []; // Get PAGE data from response
    const pageVariant = this.state.ext_pageData && this.state.ext_pageData.variant ? this.state.ext_pageData.variant : null; // Get PAGE data from response
    const gnomADSortedAlleleFrequency = sortObjKeys(gnomAD);


    return (
      <>
        <PopulationEvaluation {...this.props} populationData={this.state.populationObj} variant={this.state.variant} />
        <div className="bs-callout bs-callout-info clearfix filtering-allele-frequency">
          <h4>gnomAD v4 GroupMax Filtering Allele Frequency</h4>
          {this.state.hasGnomADv4Data && this.state.gnomADv4Data.FAF ?
            <table>
              <tbody>
                {this.state.gnomADv4Data.FAF.map((FAFRow, i) => (
                  <tr key={"FAF-Row-" + i} className={i === 0 ? "faf-column-heading" : ""}>
                    {i === 1 ?
                      FAFRow.map((FAFCol, j) => (
                        j === 0 ?
                          <td key={"FAF-Col-" + i + "-" + j} className={j === 0 ? "faf-row-heading" : ""}>{FAFCol}</td>
                          :
                          <td key={"FAF-Col-" + i + "-" + j} className="faf-filter">{this.renderGnomADv4Filters(FAFCol)}</td>
                      ))
                      :
                      FAFRow.map((FAFCol, j) => (
                        <td key={"FAF-Col-" + i + "-" + j} className={j === 0 ? "faf-row-heading" : ""}>{FAFCol}</td>
                      ))
                    }
                  </tr>
                ))}
              </tbody>
            </table>
            :
            <span>No population data was found for this allele in gnomAD.</span>
          }
          <div className="faf-clingen-guidance">
            <a href="https://clinicalgenome.org/docs/clingen-guidance-to-vceps-regarding-the-use-of-gnomad-v4/"
              title="ClinGen guidance for using gnomAD v4 data" target="_blank"
              rel="noopener noreferrer">ClinGen guidance for using gnomAD v4 data</a>
          </div>
        </div>
        <section className="population-table">
          <Panel title={
            this.state.hasGnomADv4Data ?
              <div>gnomAD {this.state.gnomADv4Data.DisplayID} {this.state.gnomADv4Data.Version >= 3 ? '(GRCh38) ' : '(GRCh37) '}
                <span className="gnomad-version">Version: {this.state.gnomADv4Data.Version} </span>
                <a href="#credit-ldh-population" className="credit-ldh" title="ClinGen Linked Data Hub"><span>ClinGen Linked Data Hub</span></a>
                <a className="panel-subtitle ml-2" href={this.state.gnomADv4Data.IRI} title={this.state.gnomADv4Data.Label}
                  target="_blank" rel="noopener noreferrer">See data in gnomAD</a>
              </div>
              :
              <div>gnomAD v4
                <a href="#credit-ldh-population" className="credit-ldh" title="ClinGen Linked Data Hub"><span>ClinGen Linked Data Hub</span></a>
              </div>
          }>
            {this.props.isLoadingLDHData ? LoadingSpinner(this.props) : null}
            <div>
              {this.state.hasGnomADv4Data ?
                <div>
                  {this.renderGnomadAddlInfo(this.state.gnomADv4Data, 'gnomADv4')}
                  <GnomADTable gnomADv4Data={this.state.gnomADv4Data.Display.DataRows} gnomADv4Totals={this.state.gnomADv4Data.Display.TotalRows} />
                </div>
                :
                <div className="no-pop-data">
                  <span>
                    No population data was found for this allele in gnomAD. {
                      this.renderGnomADv4Linkout(this.state.gnomADv4Data)}
                  </span>
                </div>
              }
            </div>
          </Panel>
        </section>
        <section className="population-table">
          <Panel title={this.renderGnomadHeader(this.state.hasGnomadData, this.props.isLoadingMyVariantInfo, gnomAD, gnomadv2, this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata, 'gnomAD')}>
            {this.props.isLoadingMyVariantInfo ? LoadingSpinner(this.props) : null}
            {!gnomadv2 ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants and for some small duplications, insertions, and deletions. {this.renderGnomadLinkout(this.props.myVariantInfoData, 'gnomAD')}</span>
              </div>
              :
              <div>
                {this.state.hasGnomadData ?
                  <div>
                    {this.renderGnomadAddlInfo(gnomAD, 'gnomAD')}
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Population</th>
                          <th>Allele Count</th>
                          <th>Allele Number</th>
                          <th>Number of Homozygotes</th>
                          <th>Allele Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gnomADSortedAlleleFrequency.map(key => {
                          return (this.renderGnomadRow(key, gnomAD, gnomADStatic));
                        })}
                      </tbody>
                      <tfoot>
                        {this.renderGnomadRow('_tot', gnomAD, gnomADStatic, 'Total', 'count')}
                      </tfoot>
                    </table>
                  </div>
                  :
                  <div className="no-pop-data">
                    <span>
                      No population data was found for this allele in gnomAD.
                      {this.renderGnomadLinkout(this.props.myVariantInfoData, 'gnomAD')}
                    </span>
                  </div>
                }
              </div>
            }
          </Panel>
        </section>
        <section className="population-table">
          <Panel title={this.renderPageHeader(this.state.hasPageData, this.state.loading_pageData, pageVariant, singleNucleotide)}>
            {this.state.loading_pageData ? LoadingSpinner(this.props) : null}
            {!singleNucleotide ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants. <a href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">Search GGV</a> for this variant.</span>
              </div>
              :
              <div>
                {this.state.hasPageData ?
                  <div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Population</th>
                          <th>Allele Number</th>
                          <th colSpan="2">Allele Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageData.length ?
                          pageData.map((item, i) => {
                            return (this.renderPageRow(item, i));
                          })
                          : null}
                      </tbody>
                    </table>
                  </div>
                  :
                  <div className="no-pop-data">
                    {this.props.auth && this.props.auth.email === 'clingen.demo.curator@genome.stanford.edu' ?
                      <span>PAGE population data is not available to demo users. Please login or request an account for the ClinGen interfaces by emailing the <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</span>
                      :
                      <span>No population data was found for this allele in PAGE. <a href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">Search GGV</a> for this variant.</span>
                    }
                  </div>
                }
              </div>
            }
          </Panel>
        </section>
        <section>
          <Panel title="Curated Literature Evidence (Population)">
            <AddArticleEvidenceTableView 
              category="population" subcategory="population" 
              criteriaList={['BA1', 'BS1', 'PM2']} 
            />
          </Panel>
        </section>

        {this.props.view === "Interpretation" && (
          <CompleteSection tabName="population" updateTab={this.props.updateTab} />
        )}

        {renderDataCredit('ldh', 'population')}

        {renderDataCredit('pagestudy', 'population')}

        {renderDataCredit('myvariant', 'population')}
      </>
    )
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  variant: state.variant,
  interpretation: state.interpretation
});

export default connect(mapStateToProps)(Population);
