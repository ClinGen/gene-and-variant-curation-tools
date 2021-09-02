import React from 'react';
import { Nav } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faList, faTable, faHome } from '@fortawesome/free-solid-svg-icons'


function TableNavBar() {
  const history = useHistory();
  return (
      <Nav activeKey="/dashboard" className="justify-content-center border-bottom-nav">
          <Nav.Item>
              <Nav.Link onClick={() => history.push('/interpretation-all')}>
                  <FontAwesomeIcon icon={faList} className="mr-1"/> All Variant Interpretations</Nav.Link>
          </Nav.Item>
          <Nav.Item>
              <Nav.Link onClick={() => history.push('/dashboard')}>
                  <FontAwesomeIcon icon={faHome} className="mr-1"/> My Variant and Gene Interpretations</Nav.Link>
          </Nav.Item>
          <Nav.Item>
              <Nav.Link onClick={() => history.push('/gdm-all')}>
                  <FontAwesomeIcon icon={faTable} className="mr-1"/> All Gene-Disease Records</Nav.Link>
          </Nav.Item>
      </Nav>
  );
}

export default TableNavBar;
