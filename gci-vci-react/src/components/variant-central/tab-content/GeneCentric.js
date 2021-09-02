import React, { useState, useEffect } from 'react';
import axios from 'axios';
import lodashGet from "lodash/get";
import LoadingSpinner from '../../common/LoadingSpinner';
import Panel from '../../common/CardPanel';
import { parseFloatShort } from '../helpers/helpers';
import { renderDataCredit } from '../helpers/credit';
import { LoadingStatus, useAxiosRequestRecycler } from '../../../utilities/fetchUtilities';
import { EXTERNAL_API_MAP } from '../../../constants/externalApis'

function GeneCentric(props) {
  const axiosRequestRecycler = useAxiosRequestRecycler();

  const [geneId, setGeneId] = useState('');
  const [geneSymbol, setGeneSymbol] = useState('');
  const [geneSynonyms, setGeneSynonyms] = useState([]);
  const [ensemblGeneId, setEnsemblGeneId] = useState('');
  const [myGeneInfo, setMyGeneInfo] = useState(null);
  const [loadingMyGeneInfo, geneInfoIsLoading] = useState(false);
  const [loadingGeneSynonyms, setGeneSynonymsIsLoading] = useState(false);

  useEffect(() => {
    // Set Gene Id and Symbol from props
    if (Array.isArray(props.externalAPIData.refSeqTranscripts)) {
      lodashGet(props.externalAPIData, 'refSeqTranscripts[0].gene_symbol') && setGeneSymbol(props.externalAPIData.refSeqTranscripts[0].gene_symbol);
      lodashGet(props.externalAPIData, 'refSeqTranscripts[0].gene_id') && setGeneId(props.externalAPIData.refSeqTranscripts[0].gene_id);
      lodashGet(props.externalAPIData, 'ensemblTranscripts[0].gene_id') && setEnsemblGeneId(props.externalAPIData.ensemblTranscripts[0].gene_id);
    }
  }, [props.externalAPIData, props.externalAPIData.refSeqTranscripts]);

  // Method to fetch Gene-centric data from mygene.info
  useEffect(() => {
    if (geneSymbol) {
      setGeneSynonymsIsLoading(true);
      axios.get(EXTERNAL_API_MAP['HGNCFetch'] + geneSymbol, { cancelToken: axiosRequestRecycler.token })
        .then(result => {
          const synonyms = result.data.response.docs.length && result.data.response.docs[0].alias_symbol ? result.data.response.docs[0].alias_symbol : null;
          setGeneSynonyms(synonyms);
          setGeneSynonymsIsLoading(false);
        })
        .catch(err => {
          if (axios.isCancel(err)) {
            return;
          }
          console.log('Local Gene Symbol Fetch ERROR=: %o', err);
          setGeneSynonymsIsLoading(false);
        });
    } else {
      setGeneSynonymsIsLoading(props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.LOADING);
    }
  }, [geneSymbol, props.basicInfoTabExternalAPILoadingStatus, axiosRequestRecycler.token]);

  useEffect(() => {
    if (geneId) {
      geneInfoIsLoading(true);
      const fields = 'fields=entrezgene,exac,HGNC,MIM,homologene.id,interpro,name,pathway.kegg,pathway.netpath,pathway.pid,pdb,pfam,pharmgkb,prosite,uniprot.Swiss-Prot,summary,symbol';
      axios.get(EXTERNAL_API_MAP['MyGeneInfo'] + geneId + '&species=human&' + fields, { cancelToken: axiosRequestRecycler.token })
        .then(result => {
          setMyGeneInfo(result.data.hits[0]);
          geneInfoIsLoading(false)
        })
        .catch(err => {
          if (axios.isCancel(err)) {
            return;
          }
          console.log('MyGeneInfo Fetch Error=: %o', err);
          geneInfoIsLoading(false)
        });
    } else {
      geneInfoIsLoading(props.basicInfoTabExternalAPILoadingStatus === LoadingStatus.LOADING);
    }
  }, [geneId, props.basicInfoTabExternalAPILoadingStatus, axiosRequestRecycler.token]);

  // Method to render constraint scores table
  const renderConstraintScores = (myGeneInfo) => {
    if (myGeneInfo.exac) {
      let allExac = myGeneInfo.exac.all,
        nonPsych = myGeneInfo.exac.nonpsych,
        nonTcga = myGeneInfo.exac.nontcga;
      return (
        <tbody>
          {allExac ?
            <tr>
              <td>All ExAC</td>
              <td>{parseFloatShort(allExac.p_li)}</td>
              <td>{parseFloatShort(allExac.p_rec)}</td>
              <td>{parseFloatShort(allExac.p_null)}</td>
              <td>{parseFloatShort(allExac.syn_z)}</td>
              <td>{parseFloatShort(allExac.mis_z)}</td>
            </tr>
            : null}
          {nonPsych ?
            <tr>
              <td>Non-psych</td>
              <td>{parseFloatShort(nonPsych.p_li)}</td>
              <td>{parseFloatShort(nonPsych.p_rec)}</td>
              <td>{parseFloatShort(nonPsych.p_null)}</td>
              <td>{parseFloatShort(nonPsych.syn_z)}</td>
              <td>{parseFloatShort(nonPsych.mis_z)}</td>
            </tr>
            : null}
          {nonTcga ?
            <tr>
              <td>Non-TCGA</td>
              <td>{parseFloatShort(nonTcga.p_li)}</td>
              <td>{parseFloatShort(nonTcga.p_rec)}</td>
              <td>{parseFloatShort(nonTcga.p_null)}</td>
              <td>{parseFloatShort(nonTcga.syn_z)}</td>
              <td>{parseFloatShort(nonTcga.mis_z)}</td>
            </tr>
            : null}
        </tbody>
      );
    }
  }

  const renderExacHeader = () => {
    return (
      <div>ExAC Constraint Scores
        <a href="#credit-mygene" className="credit-mygene" title="MyGene.info"><span>MyGene</span></a>
      </div>
    );
  }

  return (
    <>
      <section className="gene-centric-table">
        <Panel title={renderExacHeader()}>
          {loadingMyGeneInfo ? <LoadingSpinner /> :
            <div>
              {(myGeneInfo && myGeneInfo.exac) ?
                <table className="table">
                  <thead>
                    <tr>
                      <th>&nbsp;</th>
                      <th>pLI</th>
                      <th>pRec</th>
                      <th>pNull</th>
                      <th>syn Z</th>
                      <th>mis Z</th>
                    </tr>
                  </thead>

                  {renderConstraintScores(myGeneInfo)}

                  <tfoot>
                    <tr className="footnote">
                      <td colSpan="6">
                        <dl className="inline-dl clearfix">
                          <dt>pLI:</dt><dd>the probability of being loss-of-function intolerant (intolerant of both heterozygous and homozygous LOF variants)</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                          <dt>pRec:</dt><dd>the probability of being intolerant of homozygous, but not heterozygous LOF variants</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                          <dt>pNull:</dt><dd>the probability of being tolerant of both heterozygous and homozygous LOF variants</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                          <dt>syn Z:</dt><dd>corrected synonymous Z score</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                          <dt>mis Z:</dt><dd>corrected missense Z score</dd>
                        </dl>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                :
                <div><span>No ExAC constraint scores found for this variant.</span></div>
              }
            </div>
          }
        </Panel>
      </section>
      <section className="gene-centric-table">
        <Panel title="Other ClinVar Variants in Same Gene">
          {loadingMyGeneInfo ? <LoadingSpinner /> :
            <div>
              {(myGeneInfo) ?
                <a href={EXTERNAL_API_MAP['ClinVar'] + '?term=' + myGeneInfo.symbol + '%5Bgene%5D'}
                  target="_blank" rel="noopener noreferrer">Search ClinVar for variants in this gene</a>
                :
                <span>No other variants found in this gene at ClinVar.</span>
              }
            </div>
          }
        </Panel>
      </section>
      <section className="gene-centric-table">
        <Panel title="Gene Resources">
          {loadingMyGeneInfo ? <LoadingSpinner /> :
            <div>
              {(myGeneInfo) ?
                <div>
                  <dl className="inline-dl clearfix">
                    <dt>HGNC</dt>
                    <dd>
                      Symbol: <a href={EXTERNAL_API_MAP['HGNC'] + myGeneInfo.HGNC} target="_blank" rel="noopener noreferrer">{myGeneInfo.symbol}</a><br />
                      Approved Name: {myGeneInfo.name ? myGeneInfo.name : 'None'}<br />
                      {loadingGeneSynonyms ? <span>Synonyms: <LoadingSpinner /></span> : (
                        geneSynonyms ? <span>Synonyms: {geneSynonyms.join(', ')}</span> : null 
                      )}
                    </dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>Entrez Gene:</dt>
                    <dd>
                      {myGeneInfo.entrezgene ?
                        <a href={EXTERNAL_API_MAP['Entrez'] + myGeneInfo.entrezgene.toString()} target="_blank" rel="noopener noreferrer">{myGeneInfo.entrezgene}</a>
                        : 'None'}
                    </dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>Ensembl:</dt>
                    <dd>
                      {ensemblGeneId ?
                        <a href={EXTERNAL_API_MAP['ENSEMBL'] + ensemblGeneId + ';db=core'} target="_blank" rel="noopener noreferrer">{ensemblGeneId}</a>
                        :
                        <a href="http://ensembl.org" target="_blank" rel="noopener noreferrer">Search Ensembl</a>
                      }
                    </dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>GeneCards:</dt>
                    <dd><a href={EXTERNAL_API_MAP['HGNCGeneCards'] + myGeneInfo.symbol} target="_blank" rel="noopener noreferrer">{myGeneInfo.symbol}</a></dd>
                  </dl>
                </div>
                :
                <div><span>No gene resources found for this gene.</span></div>
              }
            </div>
          }
        </Panel>
      </section>
      <section className="gene-centric-table">
        <Panel title="Protein Resources">
          {loadingMyGeneInfo ? <LoadingSpinner /> :
            <div>
              {(myGeneInfo && myGeneInfo.uniprot && myGeneInfo.uniprot['Swiss-Prot']) ?
                <div>
                  <dl className="inline-dl clearfix">
                    <dt>UniProtKB:</dt>
                    <dd><a href={EXTERNAL_API_MAP['UniProtKB'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank" rel="noopener noreferrer">{myGeneInfo.uniprot['Swiss-Prot']}</a></dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>Domains:</dt>
                    <dd><a href={EXTERNAL_API_MAP['InterPro'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank" rel="noopener noreferrer">InterPro</a></dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>Structure:</dt>
                    <dd><a href={EXTERNAL_API_MAP['PDBe'] + '?uniprot_accession:(' + myGeneInfo.uniprot['Swiss-Prot'] + ')'} target="_blank" rel="noopener noreferrer">PDBe</a></dd>
                  </dl>
                  <dl className="inline-dl clearfix">
                    <dt>Gene Ontology (Function/Process/Cellular Component):</dt>
                    <dd>
                      <a href={EXTERNAL_API_MAP['AmiGO2'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank" rel="noopener noreferrer">AmiGO2</a>
                      <span className="gene-linkout-span">|</span>
                      <a href={EXTERNAL_API_MAP['QuickGO'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank" rel="noopener noreferrer">QuickGO</a>
                    </dd>
                  </dl>
                </div>
                :
                <div><span>No protein resources found for this gene.</span></div>
              }
            </div>
          }
        </Panel>
      </section>
      {renderDataCredit('mygene')}
    </>
  );
}

export default GeneCentric;