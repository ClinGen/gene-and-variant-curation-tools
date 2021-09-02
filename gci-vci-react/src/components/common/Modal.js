import React from 'react';
import PropTypes from 'prop-types';
import { Modal as BSModal, Button } from 'react-bootstrap';

import { LoadingButton } from "./LoadingButton";


const Modal = ({
  name,
  size,
  show,
  title,
  className,
  children,
  onHide,
  hideButtonText,
  onSave,
  saveButtonText,
  saveButtonInProgressText,
  saveButtonDisabled,
  isLoadingSave,
  saveError,
  type,
  showHideButton=true,
  ...props
}) => (
  <BSModal
    {...props}
    id={name}
    className={className}
    size={size || 'lg'}
    show={show}
    onHide={onHide}
  >
    {title &&
      <BSModal.Header className={`${type ? `modal-${type}` : ''}`}>
        <BSModal.Title>{title}</BSModal.Title>
      </BSModal.Header>
    }
    <BSModal.Body>{children}</BSModal.Body>
    <BSModal.Footer>
      <span style={{ color: 'red'}}>{saveError}</span>
      {showHideButton ?
        <Button variant="secondary" onClick={onHide}>
          {hideButtonText ? hideButtonText : 'Close'}
        </Button>
      : null}
      <LoadingButton
        variant={type === 'danger' ? "danger" : "primary"}
        onClick={onSave}
        text={saveButtonText || 'Save'}
        textWhenLoading={saveButtonInProgressText || 'Saving'}
        isLoading={isLoadingSave}
        disabled={isLoadingSave || saveButtonDisabled}
      />
    </BSModal.Footer>
  </BSModal>
);
Modal.propTypes = {
  name: PropTypes.string,
  size: PropTypes.oneOf(["lg", "sm", "xl"]),
  show: PropTypes.bool,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  className: PropTypes.string,
  type: PropTypes.string, // 'success', 'info', 'warning', 'danger'

  // action button properties
  onHide: PropTypes.func,
  hideButtonText: PropTypes.string,
  onSave: PropTypes.func,
  saveButtonText: PropTypes.string,
  saveButtonInProgressText: PropTypes.string,
  saveButtonDisabled: PropTypes.bool,

  isLoadingSave: PropTypes.bool,
  saveError: PropTypes.string,
};

export default Modal;
