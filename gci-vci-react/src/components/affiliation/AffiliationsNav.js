import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faLightbulb } from '@fortawesome/free-solid-svg-icons';

import AffiliationsModal from './AffiliationsModal';

const AffiliationsNav = ({
  auth,
  ...props
}) => {
  const history = useHistory();
  const [showModal, setShowModal] = useState(false);
  const [shouldDisplay, setDisplay] = useState(false);
  
  useEffect(() => {
    setDisplay(auth && auth.email);
  }, [auth]);

  return (
    <Navbar variant="dark" className={`affiliation-nav ${shouldDisplay ? '' : 'affiliation-nav-hidden'}`}>
      <Navbar.Collapse className="justify-content-end">
        <Navbar.Text className="text-white">
          {auth && auth.currentAffiliation && auth.currentAffiliation.affiliation_fullname
            ? `Affiliation: ${auth.currentAffiliation.affiliation_fullname}`
            : auth && auth.name && auth.family_name
              ? `Affiliation: No Affiliation (${auth.name} ${auth.family_name})`
              : `Affiliation: No Affiliation${auth && auth.email ? ` (${auth.email})` : ''}`
          }
        </Navbar.Text>
        {props.location.pathname === '/dashboard'
          ? (
            <Button
              variant="outline-light"
              className="ml-2"
              onClick={() => setShowModal(true)}
            >
              Change Affiliation
            </Button>
          ) : (
            <span className="text-light ml-3">
              <FontAwesomeIcon className="mr-2" icon={faLightbulb} />
              To change your affiliation, go to
              <button
                className="ml-2 icon-button text-light"
                onClick={() => history.push('/dashboard')}
              >
                <FontAwesomeIcon icon={faHome} />
              </button>
            </span>
          )

        }
        <AffiliationsModal
          show={showModal}
          onHide={() => setShowModal(false)}
        />
      </Navbar.Collapse>
    </Navbar>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth
});

export default connect(mapStateToProps)(AffiliationsNav);