export const EXTERNAL_API_MAP = {
  'PubMedSearch': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=PubMed&retmode=xml&id=',
  'PubMed': 'https://www.ncbi.nlm.nih.gov/pubmed/',
  'OrphaNet': 'http://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=EN&Expert=',
  'OrphanetHome': 'http://www.orpha.net/',
  'HGNC': 'http://www.genenames.org/cgi-bin/gene_symbol_report?hgnc_id=',
  'HGNCFetch': 'https://rest.genenames.org/fetch/symbol/',
  'HGNCHome': 'http://www.genenames.org/',
  'HGNCGeneCards': 'http://www.genecards.org/cgi-bin/carddisp.pl?gene=',
  'Entrez': 'https://www.ncbi.nlm.nih.gov/gene/',
  'MedGen': 'https://www.ncbi.nlm.nih.gov/medgen/',
  'OMIM': 'http://omim.org/',
  'OMIMEntry': 'http://www.omim.org/entry/',
  'ClinVar': 'https://www.ncbi.nlm.nih.gov/clinvar/',
  'ClinVarSearch': 'https://www.ncbi.nlm.nih.gov/clinvar/variation/',
  'ClinVarEfetch': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=clinvar',
  'ClinVarEutils': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=clinvar&rettype=variation&id=',
  'ClinVarEutilsVCV': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?api_key=&db=clinvar&rettype=vcv&is_variationid&from_esearch=true&id=',
  'ClinVarEsearch': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?api_key=&',
  'HPO': 'https://hpo.jax.org/app/browse/term/',
  'HPOBrowser': 'https://hpo.jax.org/app/browse/term/HP:0000118',
  'Uberon': 'http://www.ebi.ac.uk/ols/ontologies/uberon',
  'UberonSearch': 'http://www.ebi.ac.uk/ols/ontologies/uberon/terms?iri=http://purl.obolibrary.org/obo/',
  'GO_Slim': 'http://bit.ly/1fxDvhV',
  'InterPro': 'http://www.ebi.ac.uk/interpro/protein/',
  'UniProtKB': 'http://www.uniprot.org/uniprot/',
  'PDBe': 'http://www.ebi.ac.uk/pdbe/entry/search/index',
  'AmiGO2': 'http://amigo.geneontology.org/amigo/gene_product/UniProtKB:',
  'QuickGO': 'https://www.ebi.ac.uk/QuickGO/GProtein?ac=',
  'QuickGoSearch': 'http://www.ebi.ac.uk/QuickGO/GTerm?id=',
  'GO': 'http://www.ebi.ac.uk/ols/ontologies/go',
  'GOSearch': 'http://www.ebi.ac.uk/ols/ontologies/go/terms?iri=http://purl.obolibrary.org/obo/',
  'OLS': 'http://www.ebi.ac.uk/ols/index',
  'OLSSearch': 'https://www.ebi.ac.uk/ols/ontologies/',
  'CL': 'http://www.ebi.ac.uk/ols/ontologies/cl',
  'CLSearch': 'http://www.ebi.ac.uk/ols/ontologies/cl/terms?iri=http://purl.obolibrary.org/obo/',
  'EFO': 'http://www.ebi.ac.uk/ols/ontologies/efo',
  'EFOSearch': 'http://www.ebi.ac.uk/ols/ontologies/efo/terms?iri=http://www.ebi.ac.uk/efo/',
  'Mondo': 'https://www.ebi.ac.uk/ols/ontologies/mondo',
  'MondoSearch': 'https://www.ebi.ac.uk/ols/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/',
  'MondoApi': 'https://www.ebi.ac.uk/ols/api/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/',
  'HPOApi': 'https://hpo.jax.org/api/hpo/term/',
  'dbSNP': 'https://www.ncbi.nlm.nih.gov/snp/',
  'CAR': 'http://reg.genome.network/site/cg-registry',
  'CARallele': 'https://reg.genome.network/allele/',
  'CAR-test': 'http://reg.test.genome.network/site/registry',
  'CARallele-test': 'https://reg.test.genome.network/allele/',
  "ENSEMBL": "http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=",
  'EnsemblVEP': 'https://rest.ensembl.org/vep/human/id/',
  'EnsemblHgvsVEP': 'https://rest.ensembl.org/vep/human/hgvs/',
  'EnsemblVariation': 'https://rest.ensembl.org/variation/human/',
  'EnsemblPopulationPage': 'http://ensembl.org/Homo_sapiens/Variation/Population?db=core;v=',
  'UCSCGenomeBrowser': 'https://genome.ucsc.edu/cgi-bin/hgTracks',
  'NCBIVariationViewer': 'https://www.ncbi.nlm.nih.gov/variation/view/',
  'MyVariantInfo': 'https://myvariant.info/v1/variant/',
  'MyVariantInfoMetadata': 'https://myvariant.info/v1/metadata',
  'MyGeneInfo': 'https://mygene.info/v3/query?q=',
  'EXAC': 'https://exac.broadinstitute.org/variant/',
  'EXACHome': 'https://exac.broadinstitute.org/',
  'ExACGene': 'https://exac.broadinstitute.org/gene/',
  'ExACRegion': 'https://exac.broadinstitute.org/region/',
  'ESP_EVS': "http://evs.gs.washington.edu/EVS/PopStatsServlet?",
  'ESPHome': 'http://evs.gs.washington.edu/EVS/',
  '1000GenomesHome': 'http://browser.1000genomes.org/',
  'mutalyzer': 'https://mutalyzer.nl/',
  'mutalyzerSnpConverter': 'https://mutalyzer.nl/snp-converter',
  'UCSCBrowserHome': 'https://genome.ucsc.edu/cgi-bin/hgGateway',
  'UCSCGRCh38': 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr',
  'UCSCGRCh37': 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr',
  'VariationViewerHome': 'https://www.ncbi.nlm.nih.gov/variation/view/',
  'VariationViewerGRCh38': 'https://www.ncbi.nlm.nih.gov/variation/view/?chr=',
  'VariationViewerGRCh37': 'https://www.ncbi.nlm.nih.gov/variation/view/?chr=',
  'EnsemblBrowserHome': 'http://uswest.ensembl.org/Homo_sapiens/Info/Index',
  'EnsemblGRCh38': 'https://uswest.ensembl.org/Homo_sapiens/Location/View?db=core;r=',
  'EnsemblGRCh37': 'https://grch37.ensembl.org/Homo_sapiens/Location/View?db=core;r=',
  'Bustamante': 'https://predictvar.bustamante-lab.net/variant/position/',
  'MeSH': 'https://www.ncbi.nlm.nih.gov/mesh?term=',
  'gnomAD': 'https://gnomad.broadinstitute.org/variant/',
  'gnomADHome': 'http://gnomad.broadinstitute.org/',
  'gnomADRegion': 'http://gnomad.broadinstitute.org/region/',
  'PAGE': 'https://popgen.uchicago.edu/dev-integrated/api/variant/PAGE-broad-filtered/',
  'CIViC': 'https://www.civicdb.org/links/allele_registry/'
};
