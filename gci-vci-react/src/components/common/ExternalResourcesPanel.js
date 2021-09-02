import React from 'react';

import CardPanel from './CardPanel';

const urls = {
  'VariationViewerHome': 'https://www.ncbi.nlm.nih.gov/variation/view/',
  'UCSCBrowserHome': 'https://genome.ucsc.edu/cgi-bin/hgGateway',
  'EnsemblBrowserHome': 'http://uswest.ensembl.org/Homo_sapiens/Info/Index',
};

const ExternalResourcesPanel = ({
  gRCh38,
  gRCh37,
  gRCh38Links,
  gRCh37Links,
  view,
}) => {
  const renderLinks = () => (
    <div className={`d-flex ${view === 'card' ? 'flex-column' : ''}`}>
      {(gRCh38Links || gRCh37Links)
        ? (
          <dd className="mr-4">
            {'UCSC ['}
            {gRCh38Links && (
              <a
                href={gRCh38Links.ucsc_url_38}
                target="_blank"
                rel="noopener noreferrer"
                title={`UCSC Genome Browser for ${gRCh38} in a new window`}
              >
                GRCh38/hg38
              </a>
            )}
            {(gRCh38Links && gRCh37Links) && <span>&nbsp;|&nbsp;</span> }
            {gRCh37Links && (
              <a
                href={gRCh37Links.ucsc_url_37}
                target="_blank"
                rel="noopener noreferrer"
                title={'UCSC Genome Browser for ' + gRCh37 + ' in a new window'}
              >
                GRCh37/hg19
              </a>
            )}
            {']'}
          </dd>
        ) : (
          <dd className="mr-4">
            <a
              href={urls['UCSCBrowserHome']}
              target="_blank"
              rel="noopener noreferrer"
            >
              UCSC Browser
            </a>
          </dd>
        )
      }
      {(gRCh38Links || gRCh37Links)
        ? (
          <dd className="mr-4">
            {'Variation Viewer ['}
            {gRCh38Links && (
              <a
                href={gRCh38Links.viewer_url_38}
                target="_blank"
                rel="noopener noreferrer"
                title={`Variation Viewer page for ${gRCh38} in a new window`}
              >
                GRCh38
              </a>
            )}
            {(gRCh38Links && gRCh37Links) && <span>&nbsp;|&nbsp;</span>}
            {gRCh37Links && (
              <a
                href={gRCh37Links.viewer_url_37}
                target="_blank"
                rel="noopener noreferrer"
                title={`Variation Viewer page for ${gRCh37} in a new window`}
              >
                GRCh37
              </a>
            )}
            {']'}
          </dd>
        ) : (
          <dd className="mr-4">
            <a
              href={urls['VariationViewerHome']}
              target="_blank"
              rel="noopener noreferrer"
            >
              Variation Viewer
            </a>
          </dd>
        )
      }
      {(gRCh38Links || gRCh37Links)
        ? (
          <dd>
            {'Ensembl Browser ['}
            {gRCh38Links && (
              <a
                href={gRCh38Links.ensembl_url_38}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ensembl Browser page for ${gRCh38} in a new window`}
              >
                GRCh38
              </a>
            )}
            {(gRCh38Links && gRCh37Links) ? <span>&nbsp;|&nbsp;</span> : null }
            {gRCh37Links && (
              <a
                href={gRCh37Links.ensembl_url_37}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ensembl Browser page for ${gRCh37} in a new window`}
              >
                GRCh37
              </a>
            )}
            {']'}
          </dd>
        ) : (
          <dd className="mr-4">
            <a
              href={urls['EnsemblBrowserHome']}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ensembl Browser
            </a>
          </dd>
        )
      }
    </div>
  );
  
  return (
    view === 'card'
      ? renderLinks()
      : (
        <CardPanel title="Links to External Resources">
          {renderLinks()}
        </CardPanel>
      )
  );
};

export default ExternalResourcesPanel;