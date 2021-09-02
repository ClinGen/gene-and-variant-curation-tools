import React from 'react';

const Input = ({
  name,
  type,
  groupClassName,
  label,
  labelClassName,
  wrapperClassName,
  required,
  placeholder,
  onChange,
  className,
  value,
  checked,
  error,
  ...props
}) => {

  let inputClasses, inputField;

  switch (type) {
    case 'text':
    case 'number':
      inputClasses = 'form-control' + (className ? ' ' + className : '');
      inputField = (
        <input
          {...props}
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          // in order to resolve warning below, need to avoid `value` being undefined
          // Warning: A component is changing an uncontrolled input of type text to be controlled.
          // https://stackoverflow.com/q/41616589/9814131
          value={!value && value !== 0 ? value || '' : value}
          className={inputClasses}
          style={error && { border: 'solid 1px red' }}
        />
      );
      break;

    case 'checkbox':
      inputClasses = className || ''; 
      inputField = (
        <input
          {...props}
          id={name}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className={inputClasses}
          style={error && { border: 'solid 1px red' }}
        />
      );
      break;

    case 'textarea':
      inputClasses = 'form-control' + (className ? ' ' + className : '');
      inputField = (
        <textarea
          {...props}
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          className={inputClasses}
          style={error && { border: 'solid 1px red' }}
        />
      );
      break;

    case 'select':
      inputClasses = 'form-control' + (className ? ' ' + className : '');
      inputField = (
        <select
          {...props}
          id={name}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          className={inputClasses}
          style={error && { border: 'solid 1px red' }}
        />
      );
      break;

    default:
      return (
      <>
      <input
        {...props}
        id={name}
        type={type}
        name={name}
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        className={className}
        style={error && { border: 'solid 1px red' }}
      />
      { error && <span style={{ color: 'red', fontSize: 12 }}>{ error }</span>}
      </>
    );
  }

  const input = (
    <>
      {label ? <label className={labelClassName}><span>{label}{required ? <span className="required-field"> *</span> : null}</span></label> : null}
      {wrapperClassName
        ? <div className={wrapperClassName}>
            {inputField}
            {error && <span style={{ color: 'red', fontSize: 12 }}>{ error }</span>}
          </div>
        : <span>
            {inputField}
            {error && <span style={{ color: 'red', fontSize: 12 }}>{ error }</span>}
          </span>
       }
     </>
  );

  if (groupClassName) {
    return <div className={groupClassName}>{input}</div>;
  } else {
    return <span>{input}</span>;
  }
};

export default Input;
