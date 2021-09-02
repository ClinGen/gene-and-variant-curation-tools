// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

function createLinkWithSearch({ location, pathname, search }) {
  return {
    pathname,
    search: search || location.search,
    hash: location.hash,
    state: location.state,
  };
}

function createLink({ location, pathname }) {
  return {
    pathname,
    hash: location.hash,
    state: location.state,
  };
}

function reload() {
  setTimeout(() => { window.location.reload(); }, 150);
}

export {
  createLink,
  createLinkWithSearch,
  reload,
}
