// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import _ from 'lodash';
import React from 'react';
import { decorate, observable, action, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Segment, Label, Sidebar, Header, Icon, Button, Dropdown, Message } from 'semantic-ui-react';
import ReactTable from 'react-table-6';
import checkboxHOC from "react-table-6/lib/hoc/selectTable";

import { niceNumber } from '../../../helpers/utils';
import { displayError } from '../../../helpers/notification';
import { maxVariantsToExport, enableExport } from '../../../helpers/settings';

import ViewButtons from './ViewButtons';
import Export from './Export';
import TableSettings from './TableSettings';

// see https://react-table.js.org/#/story/hoc-readme
// to see the internal properties (instance) of the table, see https://react-table.js.org/#/story/functional-rendering
const CheckboxTable = checkboxHOC(ReactTable);

const PlaceHolder = (props) => (<Segment placeholder>
  <Header icon color="grey"><Icon color="grey" name="shipping fast" />
    This feature is coming soon!  
  </Header>
  <Segment.Inline className="mt2">
    <Button onClick={props.onCancel}>Cancel</Button>
  </Segment.Inline>
</Segment>);

// expected props
/// - app (vai injection)
// - searchSession (via injection)
// - className (optional)
class Table extends React.Component {

  constructor(props) {
    super(props);
    runInAction(() => {
      this.sidebarName = '';
      this.sidebarVisible = false;
      this.reactTableChangeCounter = 0; // this is a little trick to help force calculating a few properties
      const searchSession = this.props.searchSession;

      // lets prepare everything we need for the table model
      this.tableModel = searchSession.tableModel;
    });
  }

  componentDidMount() {
    runInAction(() => {
      this.reactTableChangeCounter += 1;
    });
  }

  getSearchSession() {
    return this.props.searchSession;
  }

  getSelectionModel() {
    const searchSession = this.getSearchSession();
    return searchSession.selectionModel;
  }

  getColumnsManager() {
    const searchSession = this.getSearchSession();
    return searchSession.columnsManager;
  }

  getFiltersManager() {
    const searchSession = this.getSearchSession();
    return searchSession.filtersManager;
  }

  getTableModel() {
    return this.tableModel;
  }

  getApp() {
    return this.props.app;
  }

  isSelected = (rowId) => {
    const model = this.getTableModel();
    return model.isSelected(rowId);
  };

  toggleSelection = (rowId, shift, row) => {
    const model = this.getTableModel();
    const size = model.selectionSize;
    if (!model.isSelected(rowId) && size >= maxVariantsToExport ) {
      displayError(`You can only select up to ${maxVariantsToExport} variants`);
      return;
    }
    return model.toggle(rowId);    
  };

  showSidebar = action((name = '') => {
    this.sidebarVisible = true;
    this.sidebarName = name;
  });

  hideSidebar = action(() => {
    this.sidebarVisible = false;
  });
    
  handleDropDownSelectionChange = action((actionName) => {
    const model = this.getTableModel();
    switch (actionName) {
      case 'selectAll':
        model.selectAll();
        break;

      case 'selectPage':
        const unselectedItems = this.getPageItems().unselected;
        unselectedItems.forEach((item) => model.select(`select-${item._id}`));
        break;

      case 'unselectAll':
        model.unselectAll();
        break;

      case 'unselectPage':
        const selectedItems = this.getPageItems().selected;
        selectedItems.forEach((item) => model.unselect(`select-${item._id}`));
        break;

      default:
    };
  });

  onReactTablePageChange = action(() => {
    this.reactTableChangeCounter += 1; // this is a little trick to help force calculating a few properties
  });

  // returns the list of items that are either selected or not selected that are shown on the current page
  // return shape is { selected: [], unselected: [] }
  getPageItems() {
    if (this.reactTableChangeCounter === 0) return { selected: [], unselected: []};
    const model = this.getTableModel();
    const data = model.sortedData.rows;
    const dataSize = _.size(data);
    // for a list of internal properties see https://react-table.js.org/#/story/functional-rendering
    const wrappedInstance = this.checkboxTable.getWrappedInstance().getResolvedState();
    const page = wrappedInstance.page; 
    const pageSize = wrappedInstance.pageSize;

    let currentIndex = page * pageSize;
    let counter = 0;
    const selected = [];
    const unselected = [];
    while ((currentIndex < dataSize) && (counter < pageSize)) {
      const item = data[currentIndex]; 
      if (this.isSelected(item._id)) selected.push(item);
      else unselected.push(item);
      currentIndex +=1;
      counter +=1;
    }

    return { selected, unselected, pageSize };
  }

  render() {
    const disabled = this.sidebarVisible || this.props.disabled;
    const tableModel = this.getTableModel();
    const sortedData = tableModel.sortedData;
    const selectionSize = tableModel.selectionSize;
    const emptySelection = selectionSize === 0;
    const errors = _.get(tableModel.searchResult, 'errors', []);
    const hasErrors = errors.length > 0;
    const errorTitle = hasErrors? `${errors.length === 1? 'The following issue is detected': 'The following issues are detected'}`: '';
    const columnsManager = this.getColumnsManager();
    const filtersManager = this.getFiltersManager();

    return (
      <div className={this.props.className}>
        { hasErrors &&  <Message negative className="mb2">
          <Message.Header>{errorTitle}</Message.Header>
            <Message.List items={errors} />
          </Message>
        }
        <TableSettings columnsManager={columnsManager} filtersManager={filtersManager} filtersStats={sortedData.filtersStats} className="mb3 mt3"/>
        <div className="mb3 clearfix">
            { this.renderSelectionDropDown() }
            <Button size="mini" content="Transfer" color="orange" floated="right" className="mt1 ml1" disabled={emptySelection || disabled || !enableExport} onClick={() => this.showSidebar('export')}/>
            <ViewButtons tableModel={tableModel} disabled={disabled}/>
        </div>
        {this.renderTableWithSideBar()}
      </div>
    );
  }

  renderSelectionDropDown() {
    const disabled = this.sidebarVisible;

    if (this.reactTableChangeCounter === 0) return (<Dropdown disabled={disabled} text="Selection" floating className="ml1 mt2 mr3">
      <Dropdown.Menu>
        <Message warning content="This option is not ready yet" />
      </Dropdown.Menu>
    </Dropdown>);


    const model = this.getTableModel();
    const data = model.sortedData.rows;
    const dataSize = _.size(data);
    const noData = dataSize === 0;
    const selectionSize = model.selectionSize;
    const pageItems = this.getPageItems();
    const pageUnselectedCount = _.size(pageItems.unselected);
    const pageSelectedCount = _.size(pageItems.selected);
    const pageItemsCount = pageUnselectedCount + pageSelectedCount;
    const exceedsAllLimit = (dataSize > maxVariantsToExport) || ((selectionSize + pageUnselectedCount) > maxVariantsToExport);
    const exceedsLimit = ((selectionSize + pageUnselectedCount) > maxVariantsToExport);
    const nice = (num) => niceNumber(num);
    const maxNice = nice(maxVariantsToExport);
    const variants = (num) => `(${nice(num)} ${num === 1? 'variant': 'variants'})`;
    const label = (message, color) => <Label color={color} size="mini" className="ml2">{message}</Label>;
    const disabledButton = (text, message, color) => <Dropdown.Item disabled={true}>{text}{label(message, color)}</Dropdown.Item>;
    const enabledButton = (text, actionName) => <Dropdown.Item onClick={() => this.handleDropDownSelectionChange(actionName)}>{text}</Dropdown.Item>;

    const selectAllButton = () => {
      if (noData) return disabledButton(`Select all (0 variants)`, 'Nothing to select');
      if (exceedsAllLimit) return disabledButton(`Select all ${variants(dataSize)}`, `Exceeds total limit of ${maxNice}`, 'red');
      if (dataSize === selectionSize) return disabledButton(`Select all ${variants(dataSize)}`, 'Already selected');
      return enabledButton(`Select all ${variants(dataSize)}`, 'selectAll');
    };

    const selectPageButton = () => {
      if (noData) return disabledButton(`Select this page (0 variants)`, 'Nothing to select');
      if (exceedsLimit) return disabledButton(`Select this page ${variants(pageItemsCount)}`, `Exceeds total limit of ${maxNice}`, 'red');
      if (pageUnselectedCount === 0) return disabledButton(`Select this page ${variants(pageItemsCount)}`, 'Already selected');
      return enabledButton(`Select this page ${variants(pageItemsCount)}`, 'selectPage');
    };

    const unselectAllButton = () => {
      if (noData) return disabledButton(`Unselect all (0 variants)`, 'Nothing to unselect');
      if (selectionSize === 0) return disabledButton(`Unselect all (0 variants)`, 'Nothing to unselect');
      return enabledButton(`Unselect all pages ${variants(selectionSize)}`, 'unselectAll');
    };

    const unselectPageButton = () => {
      if (noData) return disabledButton(`Unselect this page (0 variants)`, 'Nothing to unselect');
      if (selectionSize === 0) return disabledButton(`Unselect this pages (0 variants)`, 'Nothing to unselect');
      if (pageSelectedCount === 0) return disabledButton(`Unselect this page ${variants(pageSelectedCount)}`, 'Nothing to unselect');
      return enabledButton(`Unselect this page ${variants(pageSelectedCount)}`, 'unselectPage');
    };
  
    return (
      <Dropdown text="Selection" floating className="ml1 mt2 mr3" disabled={disabled}>
        <Dropdown.Menu>
          { selectAllButton() }
          { selectPageButton() }
          <Dropdown.Divider />
          { unselectAllButton() }
          { unselectPageButton() }
        </Dropdown.Menu>
      </Dropdown>  
    );
  }

  renderPlaceHolder() {
    return (
      <Segment placeholder>
        <Header icon color="grey"><Icon color="grey" name="shipping fast" />
          This feature is coming soon!  
        </Header>
        <Segment.Inline className="mt2">
          <Button onClick={this.hideSidebar}>Cancel</Button>
        </Segment.Inline>
      </Segment>
    );
  }

  renderTableWithSideBar() {
    const visible = this.sidebarVisible;
    const sidebarName = this.sidebarName;
    const tableModel = this.getTableModel();
    const columnsManager = this.getColumnsManager();

    let content = null;
    switch(sidebarName) {
      case 'export':
        content = <Export tableModel={tableModel} columnsManager={columnsManager} onCancel={this.hideSidebar}/>;
        break;
      case 'placeHolder':
        content = <PlaceHolder onCancel={this.hideSidebar}/>;
        break; 
      default:
        break;
    }

    return (
      <Sidebar.Pushable>
      <Sidebar style={{ boxShadow: 'unset' }}
        animation="overlay"
        direction="top"
        visible={visible}>
        <div className="p1">
          { content }
          <div style={{ height: '10px'}}></div>
        </div>
      </Sidebar>

      <Sidebar.Pusher dimmed={visible}>
        <div style={{marginBottom: '1000px'}}>
          {this.renderTable()}
        </div>
      </Sidebar.Pusher>
    </Sidebar.Pushable>
    );
  }

  renderTable() {
    console.log('src/parts/step2/Table.js - renderTable()');
    const { toggleSelection, isSelected } = this;
    const model = this.getTableModel();
    const hasFilters = model.hasFilters;
    const data = model.sortedData.rows;
    const columnsManager = this.getColumnsManager();
    const columns = _.map(columnsManager.enabledColumns, (col) => col.rtMeta);

    return (
      <CheckboxTable
        ref={r => (this.checkboxTable = r)}
        onPageChange={this.onReactTablePageChange}
        onPageSizeChange={this.onReactTablePageChange}
        previousText="Previous"
        nextText="Next"
        showPaginationTop={false}
        className="-striped"
        selectAll={false}
        SelectAllInputComponent={() =><div/>} // to remove the checkbox at the top
        toggleSelection={toggleSelection}
        isSelected={isSelected}
        data={data}
        columns={columns}
        sortable={false}
        multiSort={false}
        filterable={false}
        pageSizeOptions={[25, 50, 100]}
        defaultPageSize={25}
        selectType="checkbox"
        getTrProps={(s, r) => {
          if (!r) return { style: { backgroundColor: "inherit" } };
          const selected = r? this.isSelected(r.original._id) : false;
          const passed = r? (r.original.passed) : false;

          if (hasFilters && !passed) {
            return {
              style: { backgroundColor: "rgb(219, 40, 40, 0.05)" }
            };
          }

          return {
            style: {
              backgroundColor: selected ? "#f7fcfa" : "inherit" // f7fcfa
            }
          };

        }}  
        SubComponent={entry => {
          return (
            <div className="p2 mb2">
              <Segment>
                <div><b>CAid:</b> { <a href={`http://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_caid?caid=${entry.original.caid}`} target="_blank" rel="noopener noreferrer">{ entry.original.caid }</a>}</div>
                <div><b>ClinVar VariationID:</b> { (entry.original.clinVarVariantId) ? <a href={`http://www.ncbi.nlm.nih.gov/clinvar/variation/${entry.original.clinvar.id}`} target="_blank" rel="noopener noreferrer">{ entry.original.clinvar.id }</a> : null}</div>
                <div><b>ClinVar Variation Title:</b> { entry.original.clinvar && entry.original.clinvar.title }</div>
                <div><b>HGVS (GRCh38):</b> { entry.original.grch38HGVS }</div>
                <div><b>HGVS (GRCh37):</b> { entry.original.grch37HGVS }</div>
              </Segment>
            </div>
          );
        }}        
      />
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Table, {
  sidebarVisible: observable,
  sidebarName: observable,
  tableModel: observable,
  selectionModel: observable,
  columnsManager: observable,
  reactTableChangeCounter: observable,
});

export default inject('app', 'searchSession')(withRouter(observer(Table)));
