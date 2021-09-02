import React from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export const LoadingButton = ({
  children,
  text,
  textWhenLoading,
  isLoading,
  disabled,
  ...props
}) => {
  const buttonIsDisabled = isLoading || disabled;
  return (
    <Button disabled={buttonIsDisabled} {...props}>
      {!isLoading || !textWhenLoading ? children || text : textWhenLoading}
      {isLoading ? (
        <>
          {" "}
          <FontAwesomeIcon icon={faSpinner} spin />
        </>
      ) : null}
    </Button>
  );
};
LoadingButton.propTypes = {
  text: PropTypes.string,
  textWhenLoading: PropTypes.string,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};
