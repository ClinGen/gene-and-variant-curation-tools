import React, { Component } from 'react';
import Panel from '../../../common/CardPanel';
import { connect } from 'react-redux';
import { parseFloatShort } from '../../helpers/helpers';
import { populationStatic, dictValuesToInt, normSInv, parseAlleleMyVariant, sortObjKeys } from '../../helpers/population_data';
import { renderDataCredit } from '../../helpers/credit';
import { getHgvsNotation } from '../../helpers/hgvs_notation';
import PopulationEvaluation from './PopulationEvaluation';
import { CompleteSection } from "../CompleteSection";
import LoadingSpinner from '../../../common/LoadingSpinner';
import { EXTERNAL_API_MAP } from '../../../../constants/externalApis'
import Input from '../../../common/Input';
import mock_page_data from '../mock_page_data.json';
import axios from 'axios';

import { AddArticleEvidenceTableView } from '../ArticleEvidenceTableView';

const CI_DEFAULT = 95;

class Population extends Component {
  constructor(props) {
    super(props);
    this.initialState = {
      variant: this.props.variant,
      interpretation: this.props.interpretation,
      ext_gnomadExac: false,
      ext_myVariantInfo_metadata: null,
      ext_ensemblVariation: null,
      ext_pageData: null,
      ext_singleNucleotide: true,
      hasEspData: false, // flag to display ESP table
      hasExacData: false, // flag to display ExAC table
      hasGnomadData: false, // flag to display gnomAD table
      hasPageData: false, // flag to display PAGE table
      hasTGenomesData: false, // flag to display 1000 Genomes table
      loading_ensemblVariation: true,
      loading_pageData: true,
      desiredCI: CI_DEFAULT,
      CILow: null,
      CIHigh: null,

      populationObj: {
        highestMAF: null,
        desiredCI: 95,
        mafCutoff: 5,
        exac: {
          _version: '', afr: {}, amr: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
        },
        gnomAD: {
          _version: '', afr: {}, amr: {}, asj: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
        },
        tGenomes: {
          afr: { ac: {}, af: {}, gc: {}, gf: {} },
          amr: { ac: {}, af: {}, gc: {}, gf: {} },
          eas: { ac: {}, af: {}, gc: {}, gf: {} },
          eur: { ac: {}, af: {}, gc: {}, gf: {} },
          sas: { ac: {}, af: {}, gc: {}, gf: {} },
          espaa: { ac: {}, af: {}, gc: {}, gf: {} },
          espea: { ac: {}, af: {}, gc: {}, gf: {} },
          _tot: { ac: {}, af: {}, gc: {}, gf: {} },
          _extra: {}
        },
        esp: {
          aa: { ac: {}, gc: {} },
          ea: { ac: {}, gc: {} },
          _tot: { ac: {}, gc: {} },
          _extra: {}
        }
      }
    };
    this.state = this.initialState;

    this.axioCanceller = axios.CancelToken.source();
  }

  componentDidMount() {
    this.fetchPopData();
    if (this.state.interpretation) {
      // set desired CI if previous data for it exists
      this.getPrevSetDesiredCI(this.state.interpretation);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.myVariantInfoData !== this.props.myVariantInfoData) {
      this.parseEspData(this.props.myVariantInfoData);
      this.parseExacData(this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata);
      this.parseGnomadData(this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata);
      this.calculateHighestMAF();
    }

    if (prevState.ext_ensemblVariation !== this.state.ext_ensemblVariation) {
      this.parseTGenomesData(this.state.ext_ensemblVariation);
      this.calculateHighestMAF();
    }
  }

  componentWillUnmount() {
    this.axioCanceller.cancel('Request cancelled');
  }

  fetchPopData() {
    const variant = this.state.variant;
    if (variant) {
      this.fetchEnsemblVariation(variant);
      this.fetchPageData(variant);
      this.parseVariantType(variant);
    }
    this.fetchMyVariantInfoMetadata();
  }

  // Retrieve data from Ensembl Variation
  fetchEnsemblVariation(variant) {
    if (variant) {
      // Extract only the number portion of the dbSNP id
      const numberPattern = /\d+/g;
      const rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
      if (rsid) {
        axios.get(EXTERNAL_API_MAP['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1', { cancelToken: this.axioCanceller.token })
          .then(response => {
            this.setState({ ext_ensemblVariation: response.data, loading_ensemblVariation: false });
          })
          .catch(err => {
            if (axios.isCancel(err)) {
              return;
            }
            this.setState({ loading_ensemblVariation: false });
            console.log('Ensembl Fetch Error=: %o', err);
          });
      } else {
        this.setState({ loading_ensemblVariation: false });
      }
    }
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

  /* the following methods are related to the desired CI field and its related calculated values */
  // method to determine desired CI value from previously saved interpretation
  getPrevSetDesiredCI(interpretation) {
    if (interpretation && interpretation.evaluations && interpretation.evaluations.length > 0) {
      for (let i = 0; i < interpretation.evaluations.length; i++) {
        if (interpretation.evaluations[i].criteria === 'BA1') {
          let tempPopulationObj = this.state.populationObj;
          tempPopulationObj.desiredCI = interpretation.evaluations[i].population.populationData.desiredCI;
          this.setState({ populationObj: tempPopulationObj });
          break;
        }
      }
    }
    if (!this.state.populationObj.desiredCI) {
      // previously saved value does not exist for some reason... set it to default value
      let tempPopulationObj = this.state.populationObj;
      tempPopulationObj.desiredCI = CI_DEFAULT;
      this.setState({ populationObj: tempPopulationObj });
    }
    // update CI low and high values
    this.changeDesiredCI();
  }

  // calculate highest MAF value and related info from external data
  calculateHighestMAF() {
    let populationObj = this.state.populationObj;
    let highestMAFObj = { af: 0 };
    // check gnomAD data
    populationStatic.gnomAD._order.forEach(pop => {
      if (populationObj.gnomAD[pop].af > highestMAFObj.af) {
        highestMAFObj.pop = pop;
        highestMAFObj.popLabel = populationStatic.gnomAD._labels[pop];
        highestMAFObj.ac = populationObj.gnomAD[pop].ac;
        highestMAFObj.ac_tot = populationObj.gnomAD[pop].an;
        highestMAFObj.source = 'gnomAD';
        highestMAFObj.af = populationObj.gnomAD[pop].af;
      }
    });
    // check against exac data
    populationStatic.exac._order.forEach(pop => {
      if (populationObj.exac[pop].af && populationObj.exac[pop].af) {
        if (populationObj.exac[pop].af > highestMAFObj.af) {
          highestMAFObj.pop = pop;
          highestMAFObj.popLabel = populationStatic.exac._labels[pop];
          highestMAFObj.ac = populationObj.exac[pop].ac;
          highestMAFObj.ac_tot = populationObj.exac[pop].an;
          highestMAFObj.source = 'ExAC';
          highestMAFObj.af = populationObj.exac[pop].af;
        }
      }
    });
    // check against esp data - done before 1000g's so that it takes precedence in case of tie
    // due to 1000g also carrying esp data
    populationStatic.esp._order.forEach(pop => {
      // let alt = populationObj.esp._extra.alt;
      if (populationObj.esp[pop].ac) {
        let ref = populationObj.esp._extra.ref,
          alt = populationObj.esp._extra.alt;
        // esp does not report back frequencies, so we have to calculate it off counts
        let tempMAF = parseFloat(populationObj.esp[pop].ac[alt] / (populationObj.esp[pop].ac[ref] + populationObj.esp[pop].ac[alt]));
        if (tempMAF > highestMAFObj.af) {
          highestMAFObj.pop = pop;
          highestMAFObj.popLabel = populationStatic.esp._labels[pop];
          highestMAFObj.ac = populationObj.esp[pop].ac[alt];
          highestMAFObj.ac_tot = populationObj.esp[pop].ac[ref] + populationObj.esp[pop].ac[alt];
          highestMAFObj.source = 'ESP';
          highestMAFObj.af = tempMAF;
        }
      }
    });
    // check against 1000g data
    populationStatic.tGenomes._order.forEach(pop => {
      let ref = populationObj.tGenomes._extra.ref,
        alt = populationObj.tGenomes._extra.alt;
      if (populationObj.tGenomes[pop].af && populationObj.tGenomes[pop].af[alt]) {
        if (populationObj.tGenomes[pop].af[alt] > highestMAFObj.af) {
          highestMAFObj.pop = pop;
          highestMAFObj.popLabel = populationStatic.tGenomes._labels[pop];
          highestMAFObj.ac = populationObj.tGenomes[pop].ac[alt];
          highestMAFObj.ac_tot = populationObj.tGenomes[pop].ac[ref] + populationObj.tGenomes[pop].ac[alt];
          highestMAFObj.source = (pop === 'espaa' || pop === 'espea') ? 'ESP (provided by 1000 Genomes)' : '1000 Genomes';
          highestMAFObj.af = populationObj.tGenomes[pop].af[alt];
        }
      }
    });
    // embed highest MAF and related data into population obj, and update to state
    populationObj.highestMAF = highestMAFObj;
    this.setState({ populationObj: populationObj }, () => {
      this.changeDesiredCI(); // we have highest MAF data, so calculate the CI ranges
    });
  }

  // wrapper function to calculateCI on value change
  changeDesiredCI() {
    if (this.state.desiredCI) {
      this.calculateCI(parseInt(this.state.desiredCI), this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null);
    }
  }

  // checking for empty text when clicking away from desired CI field
  onBlurDesiredCI(event) {
    let desiredCI = parseInt(this.state.desiredCIRef);
    if (desiredCI === '' || isNaN(desiredCI)) {
      // if the user clicks away from the desired CI field, but it is blank/filled with
      // bad input, re-set it to the default value
      let tempPopulationObj = this.state.populationObj;
      this.setState({ desiredCI: CI_DEFAULT });
      tempPopulationObj.desiredCI = CI_DEFAULT;
      this.setState({ populationObj: tempPopulationObj });
      this.changeDesiredCI();
    }
  }

  // function to calculate confidence intervals (CI). Formula taken from Steven's excel spreadsheet
  calculateCI(CIp, highestMAF) {
    // store user-input desired CI value into population object
    let populationObj = this.state.populationObj;
    populationObj.desiredCI = CIp;
    if (highestMAF) {
      if (isNaN(CIp) || CIp < 0 || CIp > 100) {
        // the field is blank... clear CI low and high values
        // note that the user did not necessary navigate away from field just yet, so do not
        // automatically set value to default here
        this.setState({ populationObj: populationObj, CILow: null, CIHigh: null });
      } else if (highestMAF.ac && highestMAF.ac_tot) {
        // calculate CI
        let xp = highestMAF.ac,
          np = highestMAF.ac_tot;
        let zp = -normSInv((1 - CIp / 100) / 2),
          pp = xp / np,
          qp = 1 - pp;
        let CILow = ((2 * np * pp) + (zp * zp) - zp * Math.sqrt((zp * zp) + (4 * np * pp * qp))) / (2 * (np + (zp * zp))),
          CIHigh = ((2 * np * pp) + (zp * zp) + zp * Math.sqrt((zp * zp) + (4 * np * pp * qp))) / (2 * (np + (zp * zp)));
        this.setState({ populationObj: populationObj, CILow: CILow, CIHigh: CIHigh });
      } else {
        this.setState({ populationObj: populationObj, CILow: 'N/A', CIHigh: 'N/A' });
      }
    } else {
      this.setState({ populationObj: populationObj, CILow: 'N/A', CIHigh: 'N/A' });
    }
  }

  // Method to assign ESP population data to global population object
  parseEspData(response) {
    // Not all variants return the evs{...} object from myvariant.info
    if (response.evs) {
      let populationObj = this.state.populationObj;
      // get relevant numbers and extra information from ESP
      populationObj.esp.aa.ac = dictValuesToInt(response.evs.allele_count.african_american);
      populationObj.esp.aa.gc = dictValuesToInt(response.evs.genotype_count.african_american);
      populationObj.esp.ea.ac = dictValuesToInt(response.evs.allele_count.european_american);
      populationObj.esp.ea.gc = dictValuesToInt(response.evs.genotype_count.european_american);
      populationObj.esp._tot.ac = dictValuesToInt(response.evs.allele_count.all);
      populationObj.esp._tot.gc = dictValuesToInt(response.evs.genotype_count.all_genotype);
      populationObj.esp._extra.avg_sample_read = response.evs.avg_sample_read;
      populationObj.esp._extra.rsid = response.evs.rsid;
      populationObj.esp._extra.chrom = response.evs.chrom + ''; // ensure that the chromosome is stored as a String
      populationObj.esp._extra.hg19_start = parseInt(response.evs.hg19.start);
      populationObj.esp._extra.ref = response.evs.ref;
      populationObj.esp._extra.alt = response.evs.alt;
      // update populationObj, and set flag indicating that we have ESP data
      this.setState({ hasEspData: true, populationObj: populationObj });
    }
  }

  // Method to assign ExAC population data to global population object
  parseExacData(response, metadata) {
    // Not all variants can be found in ExAC
    // Do nothing if the exac{...} object is not returned from myvariant.info
    if (response.exac) {
      let populationObj = this.state.populationObj;
      // get the allele count, allele number, and homozygote count for desired populations
      populationStatic.exac._order.forEach(key => {
        populationObj.exac[key].ac = parseInt(response.exac.ac['ac_' + key]);
        populationObj.exac[key].an = parseInt(response.exac.an['an_' + key]);
        populationObj.exac[key].hom = parseInt(response.exac.hom['hom_' + key]);
        populationObj.exac[key].af = populationObj.exac[key].ac / populationObj.exac[key].an;
      });
      // get the allele count, allele number, and homozygote count totals
      populationObj.exac._tot.ac = parseInt(response.exac.ac.ac_adj);
      populationObj.exac._tot.an = parseInt(response.exac.an.an_adj);
      populationObj.exac._tot.hom = response.exac.ac.ac_hom ? parseInt(response.exac.ac.ac_hom) : parseInt(response.exac.hom.ac_hom);
      populationObj.exac._tot.af = populationObj.exac._tot.ac / populationObj.exac._tot.an;
      // get extra ExAC information
      populationObj.exac._extra.chrom = response.exac.chrom + ''; // ensure that the chromosome is stored as a String
      populationObj.exac._extra.pos = parseInt(response.exac.pos);
      populationObj.exac._extra.ref = response.exac.ref;
      populationObj.exac._extra.alt = response.exac.alt;
      // get filter information
      if (response.exac.filter) {
        if (Array.isArray(response.exac.filter)) {
          populationObj.exac._extra.filter = response.exac.filter;
        } else {
          populationObj.exac._extra.filter = [response.exac.filter];
        }
      }
      // get the source version
      if (metadata && metadata.src && metadata.src.exac && metadata.src.exac.version) {
        populationObj.exac._version = metadata.src.exac.version;
      }
      // update populationObj, and set flag indicating that we have ExAC data
      this.setState({ hasExacData: true, populationObj: populationObj });
    }
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

  // parse 1000Genome data
  parseTGenomesData(response) {
    // not all variants are SNPs. Do nothing if variant is not a SNP
    if (response.var_class && response.var_class === 'SNP') {
      let hgvs_GRCh37 = '';
      let hgvs_GRCh38 = '';
      let populationObj = this.state.populationObj;
      let updated1000GData = false;
      // FIXME: this GRCh vs gRCh needs to be reconciled in the data model and data import
      // update off of this.props.data as it is more stable, and this.state.data does not contain relevant updates
      if (this.state.variant && this.state.variant.hgvsNames) {
        hgvs_GRCh37 = this.state.variant.hgvsNames.GRCh37 ? this.state.variant.hgvsNames.GRCh37 :
          (this.state.variant.hgvsNames.gRCh37 ? this.state.variant.hgvsNames.gRCh37 : '');
        hgvs_GRCh38 = this.state.variant.hgvsNames.GRCh38 ? this.state.variant.hgvsNames.GRCh38 :
          (this.state.variant.hgvsNames.gRCh38 ? this.state.variant.hgvsNames.gRCh38 : '');
      }
      // get extra 1000Genome information
      populationObj.tGenomes._extra.name = response.name;
      populationObj.tGenomes._extra.var_class = response.var_class;
      if (hgvs_GRCh37.indexOf('>') > -1 || hgvs_GRCh38.indexOf('>') > -1) {
        // if SNP variant, extract allele information from hgvs names, preferring grch38
        populationObj.tGenomes._extra.ref = hgvs_GRCh38 ? hgvs_GRCh38.charAt(hgvs_GRCh38.length - 3) : hgvs_GRCh37.charAt(hgvs_GRCh37.length - 3);
        populationObj.tGenomes._extra.alt = hgvs_GRCh38 ? hgvs_GRCh38.charAt(hgvs_GRCh38.length - 1) : hgvs_GRCh37.charAt(hgvs_GRCh37.length - 1);
      } else {
        // fallback for non-SNP variants
        populationObj.tGenomes._extra.ref = response.ancestral_allele;
        populationObj.tGenomes._extra.alt = response.minor_allele;
      }
      // get the allele count and frequencies...
      if (response.populations) {
        response.populations.forEach(population => {
          // extract 20 characters and forward to get population code (not always relevant)
          let populationCode = population.population.substring(20).toLowerCase();
          if (population.population.indexOf('1000GENOMES:phase_3') === 0 &&
            populationStatic.tGenomes._order.indexOf(populationCode) > -1) {
            // ... for specific populations =
            populationObj.tGenomes[populationCode].ac[population.allele] = parseInt(population.allele_count);
            populationObj.tGenomes[populationCode].af[population.allele] = parseFloat(population.frequency);
            updated1000GData = true;
          } else if (population.population === '1000GENOMES:phase_3:ALL') {
            // ... and totals
            populationObj.tGenomes._tot.ac[population.allele] = parseInt(population.allele_count);
            populationObj.tGenomes._tot.af[population.allele] = parseFloat(population.frequency);
            updated1000GData = true;
          } else if (population.population === 'ESP6500:African_American') {
            // ... and ESP AA
            populationObj.tGenomes.espaa.ac[population.allele] = parseInt(population.allele_count);
            populationObj.tGenomes.espaa.af[population.allele] = parseFloat(population.frequency);
            updated1000GData = true;
          } else if (population.population === 'ESP6500:European_American') {
            // ... and ESP EA
            populationObj.tGenomes.espea.ac[population.allele] = parseInt(population.allele_count);
            populationObj.tGenomes.espea.af[population.allele] = parseFloat(population.frequency);
            updated1000GData = true;
          }
        });
      }
      // get the genotype counts and frequencies...
      if (response.population_genotypes) {
        response.population_genotypes.forEach(population_genotype => {
          // extract 20 characters and forward to get population code (not always relevant)
          let populationCode = population_genotype.population.substring(20).toLowerCase();
          if (population_genotype.population.indexOf('1000GENOMES:phase_3:') === 0 &&
            populationStatic.tGenomes._order.indexOf(populationCode) > -1) {
            // ... for specific populations
            populationObj.tGenomes[populationCode].gc[population_genotype.genotype] = parseInt(population_genotype.count);
            populationObj.tGenomes[populationCode].gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
            updated1000GData = true;
          } else if (population_genotype.population === '1000GENOMES:phase_3:ALL') {
            // ... and totals
            populationObj.tGenomes._tot.gc[population_genotype.genotype] = parseInt(population_genotype.count);
            populationObj.tGenomes._tot.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
            updated1000GData = true;
          } else if (population_genotype.population === 'ESP6500:African_American') {
            // ... and ESP AA
            populationObj.tGenomes.espaa.gc[population_genotype.genotype] = parseInt(population_genotype.count);
            populationObj.tGenomes.espaa.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
            updated1000GData = true;
          } else if (population_genotype.population === 'ESP6500:European_American') {
            // ... and ESP EA
            populationObj.tGenomes.espea.gc[population_genotype.genotype] = parseInt(population_genotype.count);
            populationObj.tGenomes.espea.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
            updated1000GData = true;
          }
        });
      }
      if (updated1000GData) {
        // update populationObj, and set flag indicating that we have 1000Genomes data
        this.setState({ hasTGenomesData: true, populationObj: populationObj });
      }
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
          this.setState({ ext_gnomadExac: true })
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

  // Method to render ESP population table header content
  renderEspHeader(hasEspData, loading_myVariantInfo, esp, singleNucleotide) {
    if (hasEspData && !loading_myVariantInfo && singleNucleotide) {
      const variantEsp = esp._extra.rsid + '; ' + esp._extra.chrom + '.' + esp._extra.hg19_start + '; Alleles ' + esp._extra.ref + '>' + esp._extra.alt;
      const linkoutEsp = EXTERNAL_API_MAP['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0';
      return (
        <div>Exome Sequencing Project (ESP): {variantEsp} (GRCh37)
          <a href="#credit-myvariant-population" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
          <a className="panel-subtitle ml-2" href={linkoutEsp} target="_blank" rel="noopener noreferrer">See data in ESP</a>
        </div>
      );
    } else {
      return (
        <div>Exome Sequencing Project (ESP)
          <a href="#credit-myvariant-population" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
        </div>
      );
    }
  }

  // Method to render a row of data for the ESP table
  renderEspRow(key, esp, espStatic, rowNameCustom, className) {
    let rowName = espStatic._labels[key];
    // generate genotype strings from reference and alt allele information
    let g_ref = esp._extra.ref + esp._extra.ref,
      g_alt = esp._extra.alt + esp._extra.alt,
      g_mixed = esp._extra.alt + esp._extra.ref;
    if (key === '_tot') {
      rowName = rowNameCustom;
    }
    return (
      <tr key={key} className={className ? className : ''}>
        <td>{rowName}</td>
        <td>{esp[key].ac[esp._extra.ref] || esp[key].ac[esp._extra.ref] === 0 ? esp._extra.ref + ': ' + esp[key].ac[esp._extra.ref] : '--'}</td>
        <td>{esp[key].ac[esp._extra.alt] || esp[key].ac[esp._extra.alt] === 0 ? esp._extra.alt + ': ' + esp[key].ac[esp._extra.alt] : '--'}</td>
        <td>{esp[key].gc[g_ref] || esp[key].gc[g_ref] ? g_ref + ': ' + esp[key].gc[g_ref] : '--'}</td>
        <td>{esp[key].gc[g_alt] || esp[key].gc[g_alt] ? g_alt + ': ' + esp[key].gc[g_alt] : '--'}</td>
        <td>{esp[key].gc[g_mixed] || esp[key].gc[g_mixed] ? g_mixed + ': ' + esp[key].gc[g_mixed] : '--'}</td>
      </tr>
    );
  }

  // Method to render additional information (data sources, filter status) in ExAC/gnomAD population table
  // If filter(s) not provided by myvariant.info, assume there was a "Pass"; if no data is provided, assume there was a "No variant"
  renderExacGnomadAddlInfo(dataset, datasetName) {
    if (datasetName === 'ExAC') {
      return (
        <table className="table additional-info">
          <tbody>
            <tr>
              <td className="filter">
                <span>Filter:</span>
                <ul>
                  {dataset._extra.filter ?
                    dataset._extra.filter.map((filter, index) => {
                      return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'danger'));
                    })
                    :
                    this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      );
    } else if (datasetName === 'gnomAD') {
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
                        return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'warning'));
                      })
                      :
                      this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                  </ul>
                </td>
              </tr>
              :
              <tr>
                <td className="included-data"><i className="icon icon-times-circle" /><span>Exomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>{this.renderExacGnomadFilter('No variant', 'No variant', 'danger')}</ul>
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
                        return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'warning'));
                      })
                      :
                      this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                  </ul>
                </td>
              </tr>
              :
              <tr>
                <td className="included-data"><i className="icon icon-times-circle" /><span>Genomes</span></td>
                <td className="filter">
                  <span>Filter:</span>
                  <ul>{this.renderExacGnomadFilter('No variant', 'No variant', 'danger')}</ul>
                </td>
              </tr>
            }
          </tbody>
        </table>
      );
    } else {
      return;
    }
  }

  // Method to render a single filter status in ExAC/gnomAD population table
  renderExacGnomadFilter(filter, filterKey, filterClass) {
    return (<li key={filterKey} className={'label label-' + filterClass}>{filter}</li>);
  }

  // Method to render ExAC/gnomAD population table header content
  renderExacGnomadHeader(datasetCheck, loading_myVariantInfo, dataset, gnomadExac, response, metadata, datasetName) {
    let datasetVariant = '';
    let datasetLink;
    let version;

    if (datasetCheck) {
      datasetVariant = ' ' + dataset._extra.chrom + ':' + dataset._extra.pos + ' ' + dataset._extra.ref + '/' + dataset._extra.alt + ' (GRCh37)';
    } else if (response) {
      let alleleData = parseAlleleMyVariant(response);

      if (Object.keys(alleleData).length) {
        datasetVariant = ' ' + alleleData.chrom + ':' + alleleData.pos + ' ' + alleleData.ref + '/' + alleleData.alt + ' (GRCh37)';
      }
    }

    // Set the source version
    if (metadata && metadata.src) {
      version = (datasetName === 'ExAC' && metadata.src.exac && metadata.src.exac.version) ? metadata.src.exac.version :
        (datasetName === 'gnomAD' && metadata.src.gnomad && metadata.src.gnomad.version) ? metadata.src.gnomad.version : '';
    }

    if (datasetCheck && !loading_myVariantInfo && gnomadExac) {
      const datasetVariantURLKey = (datasetName === 'ExAC') ? 'EXACHome' : (datasetName === 'gnomAD') ? 'gnomADHome' : null;
      const datasetURL = EXTERNAL_API_MAP[datasetVariantURLKey] + 'variant/' + dataset._extra.chrom + '-' + dataset._extra.pos + '-' + dataset._extra.ref + '-' + dataset._extra.alt;
      datasetLink = <a className="panel-subtitle ml-2" href={datasetURL} title={`${datasetName} v${version}`} target="_blank" rel="noopener noreferrer">See data in {datasetName}</a>
    }

    return (
      <div>
        {datasetName}{datasetVariant} {version ? <span className="exac-gnomad-version">Version: {version}</span> : null}
        <a href="#credit-myvariant-population" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
        {datasetLink}
      </div>
    );
  }

  // Method to render external ExAC/gnomAD linkout when no relevant population data is found
  renderExacGnomadLinkout(response, datasetName) {
    let datasetCheck, datasetLink, datasetRegionURLKey;
    let linkText = 'Search ' + datasetName;
    // If no ExAC/gnomAD population data, construct external linkout for one of the following:
    // 1) clinvar/cadd data found & the variant type is substitution
    // 2) clinvar/cadd data found & the variant type is NOT substitution
    // 3) no data returned by myvariant.info
    switch (datasetName) {
      case 'ExAC':
        datasetCheck = this.state.hasExacData;
        datasetLink = EXTERNAL_API_MAP['EXACHome'];
        datasetRegionURLKey = 'ExACRegion';
        break;
      case 'gnomAD':
        datasetCheck = this.state.hasGnomadData;
        datasetLink = EXTERNAL_API_MAP['gnomADHome'];
        datasetRegionURLKey = 'gnomADRegion';
        break;

      // no default    
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
      // Or there is no ExAC/gnomAD data object in the returned myvariant.info JSON response
      if ((!this.state.ext_gnomadExac || !datasetCheck) && chrom && regionStart && regionEnd) {
        datasetLink = EXTERNAL_API_MAP[datasetRegionURLKey] + chrom + '-' + regionStart + '-' + regionEnd;
        linkText = ' View the coverage of this region (+/- 30 bp) in ' + datasetName;
      }
    }
    return (
      <span>
        <a href={datasetLink} target="_blank" rel="noopener noreferrer">{linkText}</a> for this variant.
      </span>
    );
  }

  // Method to render a row of data for the ExAC/gnomAD table
  renderExacGnomadRow(key, dataset, datasetStatic, rowNameCustom, className) {
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

  // Method to render 1000 Genomes population table header content
  renderTGenomesHeader(hasTGenomesData, loading_ensemblVariation, tGenomes, singleNucleotide) {
    if (hasTGenomesData && !loading_ensemblVariation && singleNucleotide) {
      const variantTGenomes = tGenomes._extra.name + ' ' + tGenomes._extra.var_class;
      const linkoutEnsembl = EXTERNAL_API_MAP['EnsemblPopulationPage'] + tGenomes._extra.name;
      return (
        <div>1000 Genomes: {variantTGenomes} (GRCh38)
          <a href="#credit-vep-population" className="credit-vep" title="VEP"><span>VEP</span></a>
          <a className="panel-subtitle ml-2" href={linkoutEnsembl} target="_blank" rel="noopener noreferrer">See data in Ensembl</a>
        </div>
      );
    } else {
      return (
        <div>1000 Genomes
          <a href="#credit-vep-population" className="credit-vep" title="VEP"><span>VEP</span></a>
        </div>
      );
    }
  }

  // Method to render a row of data for the 1000Genomes table
  renderTGenomesRow(key, tGenomes, tGenomesStatic, rowNameCustom, className) {
    let rowName = tGenomesStatic._labels[key];
    // for when generating difference object:
    //let tGenomesDiff = this.state.populationObjDiff && this.state.populationObjDiff.tGenomes ? this.state.populationObjDiff.tGenomes : null; // this null creates issues when populationObjDiff is not set because it compraes on null later
    // generate genotype strings from reference and alt allele information
    let g_ref = tGenomes._extra.ref + '|' + tGenomes._extra.ref,
      g_alt = tGenomes._extra.alt + '|' + tGenomes._extra.alt,
      g_mixed = tGenomes._extra.ref + '|' + tGenomes._extra.alt;
    if (key === '_tot') {
      rowName = rowNameCustom;
    }
    return (
      <tr key={key} className={className ? className : ''}>
        <td>{rowName}</td>
        <td>{tGenomes[key].af[tGenomes._extra.ref] || tGenomes[key].af[tGenomes._extra.ref] === 0 ? tGenomes._extra.ref + ': ' + parseFloatShort(tGenomes[key].af[tGenomes._extra.ref]) : '--'}{tGenomes[key].ac[tGenomes._extra.ref] ? ' (' + tGenomes[key].ac[tGenomes._extra.ref] + ')' : ''}</td>
        <td>{tGenomes[key].af[tGenomes._extra.alt] || tGenomes[key].af[tGenomes._extra.alt] === 0 ? tGenomes._extra.alt + ': ' + parseFloatShort(tGenomes[key].af[tGenomes._extra.alt]) : '--'}{tGenomes[key].ac[tGenomes._extra.alt] ? ' (' + tGenomes[key].ac[tGenomes._extra.alt] + ')' : ''}</td>
        <td>{tGenomes[key].gf[g_ref] || tGenomes[key].gf[g_ref] === 0 ? g_ref + ': ' + parseFloatShort(tGenomes[key].gf[g_ref]) : '--'}{tGenomes[key].gc[g_ref] ? ' (' + tGenomes[key].gc[g_ref] + ')' : ''}</td>
        <td>{tGenomes[key].gf[g_alt] || tGenomes[key].gf[g_alt] === 0 ? g_alt + ': ' + parseFloatShort(tGenomes[key].gf[g_alt]) : '--'}{tGenomes[key].gc[g_alt] ? ' (' + tGenomes[key].gc[g_alt] + ')' : ''}</td>
        <td>{tGenomes[key].gf[g_mixed] || tGenomes[key].gf[g_mixed] === 0 ? g_mixed + ': ' + parseFloatShort(tGenomes[key].gf[g_mixed]) : '--'}{tGenomes[key].gc[g_mixed] ? ' (' + tGenomes[key].gc[g_mixed] + ')' : ''}</td>
      </tr>
    );
  }

  render() {
    const espStatic = populationStatic.esp;
    const exacStatic = populationStatic.exac;
    const gnomADStatic = populationStatic.gnomAD;
    const tGenomesStatic = populationStatic.tGenomes;
    const gnomadExac = this.state.ext_gnomadExac;
    const singleNucleotide = this.state.ext_singleNucleotide;
    const highestMAF = this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null;
    const desiredCI = this.state.populationObj && this.state.populationObj.desiredCI ? this.state.populationObj.desiredCI : CI_DEFAULT;
    const esp = this.state.populationObj && this.state.populationObj.esp ? this.state.populationObj.esp : null; // Get ESP data from global population object
    const exac = this.state.populationObj && this.state.populationObj.exac ? this.state.populationObj.exac : null; // Get ExAC data from global population object
    const gnomAD = this.state.populationObj && this.state.populationObj.gnomAD ? this.state.populationObj.gnomAD : null; // Get gnomAD data from global population object
    const pageData = this.state.ext_pageData && this.state.ext_pageData.data ? this.state.ext_pageData.data : []; // Get PAGE data from response
    const pageVariant = this.state.ext_pageData && this.state.ext_pageData.variant ? this.state.ext_pageData.variant : null; // Get PAGE data from response
    const tGenomes = this.state.populationObj && this.state.populationObj.tGenomes ? this.state.populationObj.tGenomes : null; // Get 1000 Genomes data from global population object
    const exacSortedAlleleFrequency = sortObjKeys(exac);
    const gnomADSortedAlleleFrequency = sortObjKeys(gnomAD);


    return (
      <>
        <PopulationEvaluation {...this.props} populationData={this.state.populationObj} variant={this.state.variant} />
        <div className="bs-callout bs-callout-info clearfix">
          <h4>Subpopulation with Highest Minor Allele Frequency</h4>
          <p className="header-note">Note: this calculation does not currently include PAGE study minor allele data</p>
          <p>This reflects the highest MAF observed, as calculated by the interface, across all subpopulations in the versions of gnomAD, ExAC, 1000 Genomes, and ESP shown below.</p>
          <div className="clearfix">
            <div className="bs-callout-content-container">
              <dl className="inline-dl clearfix">
                <dt>Subpopulation: </dt><dd>{highestMAF && highestMAF.popLabel ? highestMAF.popLabel : 'N/A'}</dd>
                <dt># Variant Alleles: </dt><dd>{highestMAF && highestMAF.ac ? highestMAF.ac : 'N/A'}</dd>
                <dt>Total # Alleles Tested: </dt><dd>{highestMAF && highestMAF.ac_tot ? highestMAF.ac_tot : 'N/A'}</dd>
              </dl>
            </div>
            <div className="bs-callout-content-container">
              <dl className="inline-dl clearfix">
                <dt>Source: </dt><dd>{highestMAF && highestMAF.source ? highestMAF.source : 'N/A'}</dd>
                <dt>Allele Frequency: </dt><dd>{highestMAF && (highestMAF.af || highestMAF.af === 0) ? parseFloatShort(highestMAF.af) : 'N/A'}</dd>
                {(this.state.interpretation && highestMAF) ?
                  <span>
                    <dt className="dtFormLabel">Desired CI:</dt>
                    <dd className="ddFormInput">
                      <Input type="number" className="desired-ci-input" value={desiredCI} onChange={this.changeDesiredCI} disabled={true}
                        onBlur={this.onBlurDesiredCI} minval={0} maxval={100} maxLength="2" placeholder={CI_DEFAULT.toString()} />
                    </dd>
                    <dt>CI - lower: </dt><dd>{this.state.CILow || this.state.CILow === 0 ? parseFloatShort(this.state.CILow) : ''}</dd>
                    <dt>CI - upper: </dt><dd>{this.state.CIHigh || this.state.CIHigh === 0 ? parseFloatShort(this.state.CIHigh) : ''}</dd>
                  </span>
                  : null}
              </dl>
            </div>
          </div>
          <br />
          <p className="exac-pop-note">Note: ExAC Constraint Scores displayed on the Gene-centric tab</p>
        </div>
        <section className="population-table">
          <Panel title={this.renderExacGnomadHeader(this.state.hasGnomadData, this.props.isLoadingMyVariantInfo, gnomAD, gnomadExac, this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata, 'gnomAD')}>
            {this.props.isLoadingMyVariantInfo ? LoadingSpinner(this.props) : null}
            {!gnomadExac ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants and for some small duplications, insertions, and deletions. {this.renderExacGnomadLinkout(this.props.myVariantInfoData, 'gnomAD')}</span>
              </div>
              :
              <div>
                {this.state.hasGnomadData ?
                  <div>
                    {this.renderExacGnomadAddlInfo(gnomAD, 'gnomAD')}
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
                          return (this.renderExacGnomadRow(key, gnomAD, gnomADStatic));
                        })}
                      </tbody>
                      <tfoot>
                        {this.renderExacGnomadRow('_tot', gnomAD, gnomADStatic, 'Total', 'count')}
                      </tfoot>
                    </table>
                  </div>
                  :
                  <div className="no-pop-data">
                    <span>
                      No population data was found for this allele in gnomAD.
                      {this.renderExacGnomadLinkout(this.props.myVariantInfoData, 'gnomAD')}
                    </span>
                  </div>
                }
              </div>
            }
          </Panel>
        </section>
        <section className="population-table">
          <Panel title={this.renderExacGnomadHeader(this.state.hasExacData, this.props.isLoadingMyVariantInfo, exac, gnomadExac, this.props.myVariantInfoData, this.state.ext_myVariantInfo_metadata, 'ExAC')}>
            {this.props.isLoadingMyVariantInfo ? LoadingSpinner(this.props) : null}
            {!gnomadExac ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants and for some small duplications, insertions, and deletions. {this.renderExacGnomadLinkout(this.props.myVariantInfoData, 'ExAC')}</span>
              </div>
              :
              <div>
                {this.state.hasExacData ?
                  <div>
                    {this.renderExacGnomadAddlInfo(exac, 'ExAC')}
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
                        {exacSortedAlleleFrequency.map(key => {
                          return (this.renderExacGnomadRow(key, exac, exacStatic));
                        })}
                      </tbody>
                      <tfoot>
                        {this.renderExacGnomadRow('_tot', exac, exacStatic, 'Total', 'count')}
                      </tfoot>
                    </table>
                  </div>
                  :
                  <div className="no-pop-data">
                    <span>No population data was found for this allele in ExAC. {this.renderExacGnomadLinkout(this.props.myVariantInfoData, 'ExAC')}</span>
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
        <section className="population-table">
          <Panel title={this.renderTGenomesHeader(this.state.hasTGenomesData, this.state.loading_ensemblVariation, tGenomes, singleNucleotide)}>
            {this.state.loading_ensemblVariation ? LoadingSpinner(this.props) : null}
            {!singleNucleotide ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants. <a href={EXTERNAL_API_MAP['1000GenomesHome']} target="_blank" rel="noopener noreferrer">Search 1000 Genomes</a> for this variant.</span>
              </div>
              :
              <div className="datasource-1000G">
                {this.state.hasTGenomesData ?
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Population</th>
                        <th colSpan="2">Allele Frequency (count)</th>
                        <th colSpan="3">Genotype Frequency (count)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.renderTGenomesRow('_tot', tGenomes, tGenomesStatic, 'ALL')}
                      {tGenomesStatic._order.map(key => {
                        return (this.renderTGenomesRow(key, tGenomes, tGenomesStatic));
                      })}
                    </tbody>
                  </table>
                  :
                  <div className="no-pop-data">
                    <span>No population data was found for this allele in 1000 Genomes. <a href={EXTERNAL_API_MAP['1000GenomesHome']} target="_blank" rel="noopener noreferrer">Search 1000 Genomes</a> for this variant.</span>
                  </div>
                }
              </div>
            }
          </Panel>
        </section>
        <section className="population-table">
          <Panel title={this.renderEspHeader(this.state.hasEspData, this.props.isLoadingMyVariantInfo, esp, singleNucleotide)}>
            {this.props.isLoadingMyVariantInfo ? LoadingSpinner(this.props) : null}
            {!singleNucleotide ?
              <div className="no-pop-data">
                <span>Data is currently only returned for single nucleotide variants. <a href={EXTERNAL_API_MAP['SPHome']} target="_blank" rel="noopener noreferrer">Search ESP</a> for this variant.</span>
              </div>
              :
              <div className="datasource-ESP">
                {this.state.hasEspData ?
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Population</th>
                        <th colSpan="2">Allele Count</th>
                        <th colSpan="3">Genotype Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {espStatic._order.map(key => {
                        return (this.renderEspRow(key, esp, espStatic));
                      })}
                      {this.renderEspRow('_tot', esp, espStatic, 'All Allele', 'count')}
                    </tbody>
                    <tfoot>
                      <tr className="count">
                        <td colSpan="6">Average Sample Read Depth: {esp._extra.avg_sample_read}</td>
                      </tr>
                    </tfoot>
                  </table>
                  :
                  <div className="no-pop-data">
                    <span>No population data was found for this allele in ESP. <a href={EXTERNAL_API_MAP['ESPHome']} target="_blank" rel="noopener noreferrer">Search ESP</a> for this variant.</span>
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

        {renderDataCredit('pagestudy', 'population')}

        {renderDataCredit('myvariant', 'population')}

        {renderDataCredit('vep', 'population')}
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
