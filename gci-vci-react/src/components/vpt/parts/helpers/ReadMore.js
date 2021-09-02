// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

// this is a cut & paste from, with a slight modification
// see https://github.com/One-com/react-truncate
import React, { Component } from 'react';
import Truncate from 'react-truncate';

class ReadMore extends Component {
  constructor(...args) {
    super(...args);

    this.state = {
      expanded: false,
      truncated: false
    };

    this.handleTruncate = this.handleTruncate.bind(this);
    this.toggleLines = this.toggleLines.bind(this);
  }

  handleTruncate(truncated) {
    if (this.state.truncated !== truncated) {
      this.setState({
        truncated
      });
    }
  }

  toggleLines(event) {
    event.preventDefault();

    this.setState({
      expanded: !this.state.expanded
    });
  }

  render() {
    const {
      children,
      more = "more",
      less = "less",
      lines
    } = this.props;

    const {
      expanded,
      truncated
    } = this.state;

    return (
      <div>
        <Truncate
          lines={!expanded && lines}
          ellipsis={(
            <span>... <span className="cursor-pointer underline color-blue" onClick={this.toggleLines}>{more}</span></span>
          )}
          onTruncate={this.handleTruncate}
        >
          {children}
        </Truncate>
        {!truncated && expanded && (
          <span> <span className="cursor-pointer underline color-blue" onClick={this.toggleLines}>{less}</span></span>
        )}
      </div>
    );
  }
}

export default ReadMore;