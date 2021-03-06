// # Static method to render credits of data source
// # Parameters: data source identifier
// # Usage: renderDataCredit('myvariant')
// # Dependency: None

import React from 'react';

export function renderDataCredit(source, tab) {
    if (source === 'myvariant') {
        return (
            <div className="credits">
                <div className="credit credit-myvariant" id={`credit-myvariant-${tab}`}>
                    <span className="credit-myvariant"><span>MyVariant</span></span> - When available, data in this table was retrieved using:
                    MyVariant.info (<a href="http://myvariant.info" target="_blank" rel="noopener noreferrer">http://myvariant.info</a>)
                    Xin J, Mark A, Afrasiabi C, Tsueng G, Juchler M, Gopal N, Stupp GS, Putman TE, Ainscough BJ,
                    Griffith OL, Torkamani A, Whetzel PL, Mungall CJ, Mooney SD, Su AI, Wu C (2016)
                    High-performance web services for querying gene and variant annotation. Genome Biology 17(1):1-7.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/27154141" target="_blank" rel="noopener noreferrer">27154141</a>&nbsp;
                PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4858870/" target="_blank" rel="noopener noreferrer">PMC4858870</a>&nbsp;
                DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0953-9" target="_blank" rel="noopener noreferrer">10.1186/s13059-016-0953-9</a>
                </div>
            </div>
        );
    } else if (source === 'mygene') {
        return (
            <div className="credits">
                <div className="credit credit-mygene" id={`credit-mygene-${tab}`}>
                    <span className="credit-mygene"><span>MyGene</span></span> - When available, data in this table was retrieved using:
                    MyGene.info (<a href="http://mygene.info" target="_blank" rel="noopener noreferrer">http://mygene.info</a>)
                    Xin J, Mark A, Afrasiabi C, Tsueng G, et al. (2016) High-performance web services for querying gene and variant annotation. Genome Biology 17(1):1-7.
                    PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/27154141" target="_blank" rel="noopener noreferrer">27154141</a>&nbsp;
                    PMCID: <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC4858870/" target="_blank" rel="noopener noreferrer">PMC4858870</a>&nbsp;
                    DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0953-9" target="_blank" rel="noopener noreferrer">10.1186/s13059-016-0953-9</a>.&nbsp;
                    Wu C, MacLeod I, Su AI (2013) BioGPS and MyGene.info: organizing online, gene-centric information. Nucl. Acids Res. 41(D1): D561-D565.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/23175613" target="_blank" rel="noopener noreferrer">23175613</a>&nbsp;
                    PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3531157/" target="_blank" rel="noopener noreferrer">PMC3531157</a>&nbsp;
                    DOI: <a href="http://nar.oxfordjournals.org/content/41/D1/D561" target="_blank" rel="noopener noreferrer">10.1093/nar/gks1114</a>
                </div>
            </div>
        );
    } else if (source === 'vep') {
        return (
            <div className="credits">
                <div className="credit credit-vep" id={`credit-vep-${tab}`}>
                    <span className="credit-vep"><span>VEP</span></span> - When available, data in this table was retrieved using:
                    The Ensembl Variant Effect Predictor (<a href="http://www.ensembl.org/Homo_sapiens/Tools/VEP" target="_blank" rel="noopener noreferrer">www.ensembl.org/Homo_sapiens/Tools/VEP</a>)
                    McLaren W, Gil L, Hunt SE, Riat HS, Ritchie GR, Thormann A, Flicek P, Cunningham F.
                    Genome Biol. 2016 Jun 6;17(1):122.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/27268795" target="_blank" rel="noopener noreferrer">27268795</a>&nbsp;
                    PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4893825/" target="_blank" rel="noopener noreferrer">PMC4893825</a>&nbsp;
                    DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0974-4" target="_blank" rel="noopener noreferrer">10.1186/s13059-016-0974-4</a>
                </div>
            </div>
        );
    } else if (source === 'pagestudy') {
        return (
            <div className="credits">
                <div className="credit credit-pagestudy" id={`credit-pagestudy-${tab}`}>
                    <span className="credit-pagestudy"><span>PAGE</span></span> - When available, data in this table was retrieved using:
                    GGV (<a href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">http://popgen.uchicago.edu/ggv/</a>) Marcus JH, Novembre J (2017). Visualizing the
                    geography of genetic variants. Bioinformatics. Feb 15;33(4):594-595.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/27742697" target="_blank" rel="noopener noreferrer">27742697</a>&nbsp;
                    PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5408806" target="_blank" rel="noopener noreferrer">PMC5408806</a>&nbsp;
                    DOI: <a href="https://academic.oup.com/bioinformatics/article-lookup/doi/10.1093/bioinformatics/btw643" target="_blank" rel="noopener noreferrer">10.1093/bioinformatics/btw643</a>&nbsp;
                    The data shown in the table was generated by the PAGE study (<a href="https://www.pagestudy.org/" target="_blank" rel="noopener noreferrer">https://www.pagestudy.org/</a>).
                    Pre-print available: <a href="https://www.biorxiv.org/content/early/2017/09/15/188094" target="_blank" rel="noopener noreferrer">https://www.biorxiv.org/content/early/2017/09/15/188094</a>.
                </div>
            </div>
        );
    }
}