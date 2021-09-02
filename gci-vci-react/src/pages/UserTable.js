import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  useTable,
  useFilters,
  useGlobalFilter,
  usePagination,
  useSortBy,
} from 'react-table';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Toast from 'react-bootstrap/Toast';
import Select from 'react-select';
import { RestAPI as API } from '@aws-amplify/api-rest';
import moment from 'moment';
import cloneDeep from 'lodash/cloneDeep';

import { API_NAME } from '../utils';
import { useAmplifyAPIRequestRecycler } from '../utilities/fetchUtilities';
import { TableFilters, TableContent, Pagination } from '../components/common/TableComponents';
import Alert from "../components/common/Alert";
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LoadingButton } from '../components/common/LoadingButton';
import exportCSV from '../helpers/export_csv';

const UserTable = () => {
  const requestRecycler = useAmplifyAPIRequestRecycler();

  const auth = useSelector(state => state.auth);
  const isAdmin = auth && Array.isArray(auth.groups) && auth.groups.includes('admin');
  
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setLoadingUsers] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [modifiedUsers, setModifiedUsers] = useState([]);
  const [isLoadingSave, setLoadingSave] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState({});

  const headers = [
    { key: 'email', text: 'Email', sort: true },
    { key: 'affiliations', text: 'Affiliations', sort: true },
    { key: 'name', text: 'First Name', sort: true },
    { key: 'family_name', text: 'Last Name', sort: true },
    { key: 'date_created', text: 'Date Created', sort: true },
    { key: 'user_status', text: 'User Status', sort: true }
  ];

  const userStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'requested activation', label: 'Requested Activation' }
  ];

  const EditableCell = ({
    value: initialValue,
    column: { id },
    row,
    updateData
  }) => {
    const [value, setValue] = React.useState(initialValue);

    const onChange = e => {
      setValue(e.target.value)
    }

    // We'll only update the external data when the input is blurred
    const onBlur = () => {
      updateData(row, id, value)
    }

    // If the initialValue is changed external, sync it up with our state
    React.useEffect(() => {
      setValue(initialValue)
    }, [initialValue])

    return <input type="text" className="border-0 bg-transparent w-100" value={value || ''} onChange={onChange} onBlur={onBlur} />
  }

  const columns = headers.map((item) => {
    if (item.key === 'email') {
      return {
        Header: item.text,
        accessor: item.key,
      };
    } else if (item.key === 'affiliations') {
      return {
        Header: item.text,
        accessor: item.key,
        style: { width: 210 },
        // eslint-disable-next-line react/display-name
        Cell: ({ value, row, column, updateData }) => {
          const valueString = Array.isArray(value) ? value.join(', ') : value;
          return EditableCell({ value: valueString, column, row, updateData });
        }
      };
    } else if (item.key === 'name' || item.key === 'family_name') {
      return {
        Header: item.text,
        accessor: item.key,
        style: { width: 150 },
        Cell: EditableCell
      };
    } else if (item.key === 'date_created') {
      return {
        Header: item.text,
        accessor: item.key,
        style: { width: 200 },
        Cell: ({ value }) => moment(value).format('YYYY-MM-DD h:mm:ssa')
      };
    } else if (item.key === 'user_status') {
      return {
        Header: item.text,
        accessor: item.key,
        style: { width: 215 },
        // eslint-disable-next-line react/display-name
        Cell: (cell) => (
          <Select
            name="userStatus"
            id={`${cell.row.original.email}-select`}
            options={userStatusOptions}
            onChange={(e) => handleUserStatusChange(e, cell)}
            defaultValue={userStatusOptions.find(option => option.value === cell.value)}
          />
        )
      };
    } else {
      return {
        Header: item.text,
        accessor: item.key,
      };
    }
  });

  // filters data based on currently selected filters. If no filter, just returns normal data.
  const filterData = useCallback(() => {
    const data = []
    if (statusFilters.length === 0) {
        setFilteredData(users);
        return
    }
    if (users && users.length) {
      users.forEach(user => {
        const match = statusFilters.find(filter => filter === user.user_status);
        if (match) {
          data.push(user);
        }
      });
    }
    setFilteredData(data);
  }, [statusFilters, users]);

  useEffect(() => {
    let mounted = true;
    setLoadingUsers(true);
    const getUsers = async () => {
      try {
        const url = '/users';
        const response = await requestRecycler.capture(API.get(API_NAME, url));
        if (response && response.length && mounted) {
          setUsers(response);
        }
        setLoadingUsers(false);
      } catch (error) {
        if (API.isCancel(error)) {
          return;
        }
        console.log(JSON.parse(JSON.stringify(error)));
        setLoadingUsers(false);
      }
    };
    if (isAdmin) {
      getUsers();
    }
    return () => {
      mounted = false;
    }
  }, [requestRecycler]);

  useEffect(() => {
    filterData();
  }, [filterData]);

  const handleStatusFilterChange = (e) => {
    const statuses = [];
    if (e && e.length) {
      e.forEach(status => {
        statuses.push(status.value);
      });
    }
    setStatusFilters(statuses);
  };

  const updateData = (row, id, value) => {
    const user = row && cloneDeep(row.original);
    user[id] = value;
    if (id === 'affiliations') {
      user[id] = value ? value.replace(/\s/g, '').split(',') : null;
    }
    setModifiedUsers(prevModifiedUsers => {
      const existingRowIndex = prevModifiedUsers.findIndex(obj => obj.PK === user.PK);
      if (existingRowIndex > -1) {
        const modifiedUsersCopy = cloneDeep(prevModifiedUsers);
        modifiedUsersCopy.splice(existingRowIndex, 1, user);
        return modifiedUsersCopy;
      }
      return [...prevModifiedUsers, user];
    });
  }

  const handleUserStatusChange = (e, cell) => {
    const user = cell && cell.row && cloneDeep(cell.row.original);
    user.user_status = e.value;
    setModifiedUsers(prevModifiedUsers => {
      const existingRowIndex = prevModifiedUsers.findIndex(obj => obj.PK === user.PK);
      if (existingRowIndex > -1) {
        const modifiedUsersCopy = cloneDeep(prevModifiedUsers);
        modifiedUsersCopy.splice(existingRowIndex, 1, user);
        return modifiedUsersCopy;
      }
      return [...prevModifiedUsers, user];
    });
  };

  const handleSaveUsers = () => {
    if (modifiedUsers && modifiedUsers.length) {
      setLoadingSave(true);
      const userPromises = modifiedUsers.map(async user => {
        const url = `/users/${user.PK}`;
        delete user['custom:institution']
        const params = {
          body: { user }
        };
        return await API.put(API_NAME, url, params);
      });
      Promise.all(userPromises).then(() => {
        setSaveFeedback({ type: 'Saved', message: 'User(s) have been updated!'});
        setLoadingSave(false);
      }).catch((error) => {
        console.log(JSON.parse(JSON.stringify(error)));
        setSaveFeedback({ type: 'Error', message: 'Save was not successful!'});
        setLoadingSave(false);
      }).finally(() => {
        setModifiedUsers([]);
        setShowToast(true);
      });
    }
  }

  /**
   * Generates data format for CSV export based on @rows and triggers a download of the CSV
   * This function is specific to exporting a CSV for users in /users/
   * @param {array} users Desired users for CSV export
   */
  const handleExportCSV = (usersToExport) => {
    const formattedUsers = [];
    if (usersToExport.length) {
      usersToExport.forEach(row => {
        const user = row.original;
        formattedUsers.push({
          'Email': user.email,
          'Affiliation': user.affiliations && user.affiliations.length ? user.affiliations.join('; ') : '',
          'First Name': user.name,
          'Last Name': user.family_name,
          'User Status': user.user_status,
          'Creation Date': moment(user.date_created).format('YYYY-MM-DD h:mm:ssa')
        });
      });
      exportCSV(formattedUsers, { filename: 'users-export.csv' });
    }
  }

  // eslint-disable-next-line
  const memoColumns = React.useMemo(() => columns, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    state: { globalFilter },
    preGlobalFilteredRows,
    setGlobalFilter,
    rows,
    pageOptions,
    page,
    pageCount,
    state: { pageIndex, pageSize },
    gotoPage,
    previousPage,
    nextPage,
    setPageSize,
    canPreviousPage,
    canNextPage,
  } = useTable(
    {
      columns: memoColumns,
      data: filteredData, // Note that we're using the filteredData here, NOT the passed in props.data
      initialState: {
        // first sort by user_status, then date_created
        sortBy: [
          { id: 'user_status' },
          { id: 'date_created' }
        ],
        pageIndex: 0
      },
      updateData,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const pageSizeOptions = [10, 20, 30, 50, 100];

  const toggleShowToast = () => setShowToast(!showToast);

  return (
    isAdmin
      ? (
        <>
          <div className="container mt-5 pl-3">
            <Row noGutters>
              <Col xs={12} className="pl-3">
                <div className="card mb-3">
                  <h5 className="card-header">
                    <div className="row no-gutter align-items-center">
                      <div className="col-sm-6">
                        <h3 className="mb-0">
                          ClinGen Curation Users {!isLoadingUsers && users && <span>({users.length})</span>}
                        </h3>
                      </div>
                      <div className="col-sm-6 text-right">
                        <button
                          onClick={()=> handleExportCSV(rows)}
                          className="btn btn-primary"
                        >
                          Download (.CSV)
                        </button>
                        <LoadingButton
                          variant="primary"
                          className="ml-2"
                          onClick={handleSaveUsers}
                          textWhenLoading="Saving"
                          isLoading={isLoadingSave}
                          text="Save"
                          disabled={isLoadingSave}
                        />
                      </div>
                    </div>
                  </h5>
                  <div className="card-body p-0">
                    {isLoadingUsers
                      ? <LoadingSpinner className="mt-5 mb-5" />
                      : (
                        <>
                          <TableFilters
                            preGlobalFilteredRows={preGlobalFilteredRows}
                            globalFilter={globalFilter}
                            setGlobalFilter={  setGlobalFilter}
                            statusFilterOptions={userStatusOptions}
                            handleStatusChange={handleStatusFilterChange}
                            hideStatusFilters
                          />
                          <TableContent
                            getTableProps={getTableProps}
                            headerGroups={headerGroups}
                            getTableBodyProps={getTableBodyProps}
                            page={page}
                            prepareRow={prepareRow}
                          />
                          <Pagination
                            pageIndex={pageIndex}
                            pageOptions={pageOptions}
                            gotoPage={gotoPage}
                            canPreviousPage={canPreviousPage}
                            previousPage={previousPage}
                            nextPage={nextPage}
                            canNextPage={canNextPage}
                            pageCount={pageCount}
                            pageSize={pageSize}
                            setPageSize={setPageSize}
                            pageSizeOptions={pageSizeOptions}
                          />
                        </>
                      )
                    }
                  </div>
                </div>
              </Col>
            </Row>
          </div>
          <Toast className="bg-white" show={showToast} onClose={toggleShowToast} style={{ position: 'fixed', bottom: 10, right: 10 }}>
            <Toast.Header className={`${saveFeedback.type === 'Error' ? 'bg-danger' : 'bg-success'}`}>
              <strong className="mr-auto text-light">{saveFeedback && saveFeedback.type}</strong>
            </Toast.Header>
            <Toast.Body className="bg-white">{saveFeedback && saveFeedback.message}</Toast.Body>
          </Toast>
        </>
      ) : (
        <Alert className="m-4 text-center" heading="Not Authorized">
          <p>You are not authorized to view this page.</p>
          <p>
            {'If you have any questions, please contact us at '}
            <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</p>
        </Alert>
      )
  );

};

export default UserTable;