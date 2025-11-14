import React, { useContext } from "react";
import PropTypes from "prop-types";
import lodashGet from 'lodash/get';
import { useSelector } from "react-redux";
import { CardGroup, Card } from "react-bootstrap";
import { OmimModalButton } from "./OmimModalButton";
import { ExternalLink } from "../common/ExternalLink";
import { EXTERNAL_API_MAP } from "../../constants/externalApis";
import { getFormattedDateTime } from "../../utilities/dateTimeUtilities";
import { displayObsoleteDiseaseIcon } from '../../utilities/diseaseUtilities';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons";
import { AffilsContext, getAffiliationByID } from "../../helpers/affiliationsHelpers";

export const GdmDetails = () => {
  const gdm = useSelector((state) => state.gdm.entity);
  const { affiliationsData } = useContext(AffilsContext);
  const gdmAffiliation = gdm.affiliation ? getAffiliationByID(gdm.affiliation, affiliationsData) : null;
  const geneTrackerURL = gdm.precurationId ? `${EXTERNAL_API_MAP['geneTrackerCurations']}/${gdm.precurationId}`
        : `${EXTERNAL_API_MAP['geneTrackerCurations']}/${gdm.PK}`;
  return (
    <>
      <CardGroup className="mt-3">
        <Card className="col-3 px-0">
          <Card.Body>
            <Card.Title as="strong">{gdm.gene.PK}</Card.Title>
            <Card.Text>
              HGNC Symbol:{" "}
              <ExternalLink
                href={`${EXTERNAL_API_MAP["HGNC"]}${gdm.gene.hgncId}`}
                title={`HGNC page for ${gdm.gene.hgncId} in a new window'`}
              >
                {gdm.gene.PK}
              </ExternalLink>
              <br />
              NCBI Gene ID:{" "}
              <ExternalLink
                href={`${EXTERNAL_API_MAP["Entrez"]}${gdm.gene.entrezId}`}
                title={`'NCBI page for gene ${gdm.gene.entrezId} in a new window'`}
              >
                {gdm.gene.entrezId}
              </ExternalLink>
            </Card.Text>
          </Card.Body>
        </Card>
        <Card className="col-4 px-0">
          <Card.Body>
            <Card.Title as="strong">
              {displayObsoleteDiseaseIcon(lodashGet(gdm, "disease.term", ""), "gdm")}
              {lodashGet(gdm, "disease.term", "--")}
            </Card.Title>
            <Card.Text>
              Disease ID:{" "}
              <ExternalLink
                href={`${EXTERNAL_API_MAP["MondoSearch"]}${gdm.disease.PK}`}
                title={`Ontology lookup for ${gdm.disease.PK} in a new window.`}
              >
                {gdm.disease.PK}
              </ExternalLink>{" "}
              <br />
              <ExternalLink href="http://omim.org/">OMIM</ExternalLink> ID:
              {gdm.omimId ? (
                <ExternalLink
                  className="ml-1"
                  href={`${EXTERNAL_API_MAP["OMIM"]}${gdm.omimId}`}
                  title={`Open Online Mendelian Inheritance in Man page for OMIM ID ${gdm.omimId} in a new window`}
                >
                  {gdm.omimId}
                </ExternalLink>
              ) : null}
              <OmimModalButton className="ml-2" initialOmidId={gdm.omimId} />
            </Card.Text>
          </Card.Body>
        </Card>
        <Card className="px-0">
          <Card.Body className="d-flex flex-column">
            <CuratorMetaDisplay
              label="Creator"
              user={gdm.submitted_by}
              affiliation={gdmAffiliation}
              dateTime={gdm.date_created}
            />
            <CuratorMetaDisplay
              label="Contributors"
              userList={gdm.contributors}
            />
            <CuratorMetaDisplay
              label="Last edited"
              user={gdm.modified_by}
              dateTime={gdm.last_modified}
              // TODO: get last edited record (i.e., evidence, classification, etc), and pass in its affiliation here
              // affiliation={}
            />
            <a href={geneTrackerURL} target="_blank" rel="noopener noreferrer">
              Precuration within Gene Tracker
            </a>
          </Card.Body>
        </Card>
      </CardGroup>
    </>
  );
};



const CuratorMetaDisplay = ({
  label,
  user,
  affiliation,
  userList,
  dateTime
}) => {
  return (
    <div>
      <strong>{label}: </strong>

      {user ? <CuratorNameDisplay user={user} /> : null}
      {affiliation ? <>({affiliation.affiliation_fullname}) </> : null}

      {Array.isArray(userList) && userList.length
        ? userList.map((user, index) => {
            return (
              <CuratorNameDisplay
                key={index}
                user={user}
                comma={index !== userList.length - 1}
              />
            );
          })
        : null}

      {dateTime && (user || userList) ? <><FontAwesomeIcon className="ml-1" icon={faCalendarAlt} /> </> : null}

      {dateTime ? <>{getFormattedDateTime(dateTime, 'lll', true)}</> : null}
    </div>
  );
};
CuratorMetaDisplay.propTypes = {
  label: PropTypes.string.isRequired,
  user: PropTypes.object,
  dateTime: PropTypes.string,
};

const CuratorNameDisplay = ({ user, comma }) => {
  return (
    <>
      <a href={`mailto:${user.email}`}>
        {user.name} {user.family_name}
      </a>
      {comma ? "," : null}{" "}
    </>
  );
};
