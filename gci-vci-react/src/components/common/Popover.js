import React from 'react';
import Button from 'react-bootstrap/Button';
import { default as BSPopover } from 'react-bootstrap/Popover';
import { default as BSOverlayTrigger } from 'react-bootstrap/OverlayTrigger';

const PopoverOverlay = (title, content, popoverClassName) => (
  <BSPopover className={popoverClassName}>
    <BSPopover.Title as="h3">{title}</BSPopover.Title>
    <BSPopover.Content>
      {content}
    </BSPopover.Content>
  </BSPopover>
);

const Popover = ({
  title,
  trigger,
  triggerComponent,
  content,
  placement,
  className,
  popoverClassName,
}) => (
  <BSOverlayTrigger
    trigger={trigger}
    overlay={PopoverOverlay(title, content, popoverClassName)}
    placement={placement}
  >
    <Button className={`p-0 text-info ${className}`} variant="link">{triggerComponent}</Button>
  </BSOverlayTrigger>
);

export default Popover;