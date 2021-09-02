import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckSquare } from "@fortawesome/free-solid-svg-icons";
import Popover from "../common/Popover";

const EarliestPubIcon = () => (
  <Popover
    triggerComponent={<FontAwesomeIcon className="text-info" icon={faCheckSquare} color="blue"/>}
    content='This article is selected as earliest report of a variant in the gene causing the disease of interest in a human'
    placement="top"
  />
)

export default EarliestPubIcon;
