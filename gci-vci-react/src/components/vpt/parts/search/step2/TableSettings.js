// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

import React from 'react';
import { decorate, action, observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Accordion, Icon, Tab } from 'semantic-ui-react';

import Columns from './columns/Columns';
import Filters from './filters/Filters';

// const PlaceHolder = (props) => (<Segment placeholder>
//   <Header icon color="grey"><Icon color="grey" name="shipping fast" />
//     This feature is coming soon!  
//   </Header>
//   <Segment.Inline className="mt2">
    
//   </Segment.Inline>
// </Segment>);

// expected props
// - filtersRegistry (via injection)
// - columnsRegistry (via injection)
// - colorsRepo (via injection)
// - columnsManager
// - filtersManager
// - filtersStats
// - className (optional)
class TableSettings extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.accordionIndex = -1;
    });
  }

  getColorsRepo() {
    return this.props.colorsRepo;
  }

  getFiltersRegistry() {
    return this.props.filtersRegistry;
  }

  getColumnsRegistry() {
    return this.props.columnsRegistry;
  }

  getColumnsManager() {
    return this.props.columnsManager;
  }

  getFiltersManager() {
    return this.props.filtersManager;
  }

  handleAccordionSelection = action((e, titleProps) => {
    const { index } = titleProps
    const activeIndex = this.accordionIndex;
    const newIndex = activeIndex === index ? -1 : index

    this.accordionIndex = newIndex;
  });

  render() {
    return this.renderTabs();
  }

  renderTabs() {
    // console.log('src/parts/step2/TableSettings.js - renderTabs()');
    const columnsManager = this.getColumnsManager();
    const filtersManager = this.getFiltersManager();
    const filtersStats = this.props.filtersStats;

    const panes = [
      { menuItem: { key: "filters", icon: "filter", content: "Filters" }, render: () => <Tab.Pane><Filters filtersManager={filtersManager} filtersStats={filtersStats}/></Tab.Pane> },
      { menuItem: { key: "columns", icon: "columns", content: "Columns" }, render: () => <Tab.Pane><Columns columnsManager={columnsManager} /></Tab.Pane> },
      // { menuItem: { key: "sorting", icon: "sort amount down", content: "Sorting Criteria" }, render: () => <Tab.Pane><PlaceHolder/></Tab.Pane> },
    ];
    
    return <Tab panes={panes} className={this.props.className} />;
  }

  renderAccordion() {
    const activeIndex = this.accordionIndex;
    const isActive = (index) => index === activeIndex;
    const columnsManager = this.getColumnsManager();
    const filtersManager = this.getFiltersManager();
    const accordionProps = {
      fluid: true,
      styled: true,
    };
    if (this.props.className) accordionProps.className = this.props.className;

    return (
      <Accordion {...accordionProps}>

        <Accordion.Title active={isActive(0)} index={0} onClick={ this.handleAccordionSelection }>          
          <div className="flex"> <Icon name="dropdown"/> <Icon name="columns" className="mr1" color="teal"/>Add &amp; Customize Columns</div>
        </Accordion.Title>
        <Accordion.Content active={isActive(0)}>
          { isActive(0) && <Columns columnsManager={columnsManager}/> }
        </Accordion.Content>

        <Accordion.Title active={isActive(1)} index={1} onClick={ this.handleAccordionSelection }>          
          <div className="flex"> <Icon name="dropdown"/> <Icon name="filter" className="mr1" color="teal"/>Configure Filters</div>
        </Accordion.Title>
        <Accordion.Content active={isActive(1)}>
          { isActive(1) && <Filters filtersManager={filtersManager}/>  }
        </Accordion.Content>

        <Accordion.Title active={isActive(2)} index={2} onClick={ this.handleAccordionSelection }>          
          <div className="flex"> <Icon name="dropdown"/> <Icon name="sort amount down" className="mr1" color="teal"/>Specify Sorting Criteria</div>
        </Accordion.Title>
        <Accordion.Content active={isActive(2)}>
          { isActive(2) && <span>TODO Sorting</span> }
        </Accordion.Content>

      </Accordion>
    );
  }
}


// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TableSettings, {
  accordionIndex: observable,
});

export default inject('filtersRegistry', 'columnsRegistry', 'colorsRepo')(withRouter(observer(TableSettings)));