import React from "react";
import PropTypes from 'prop-types';
import Skeleton from "react-loading-skeleton";
import { NumberPropTypes } from "../../propTypes/customNumberPropTypes";


/**
 * Renders a skeleton loader that hints the user how the content would look like.
 * Ideal for text contents.
 * See below propTypes for options.
 * See Github page for more details {@link https://github.com/dvtng/react-loading-skeleton}.
 */
export const LoadingSkeleton = ({
  count = 1,
  randomWidth,
  minWidth = 1,
  maxWidth = 100,
  ...props
}) => {
  if (!randomWidth) {
    return <Skeleton count={count} {...props} />;
  }

  const randomWidths = [];
  for (let i = 0; i < count; i++) {
    let width = minWidth + Math.random() * (maxWidth - minWidth);
    width = Math.floor(width);
    if (width > 100) {
      width = 100;
    } else if (width < 1) {
      width = 1;
    }
    randomWidths.push(width);
  }

  return (
    <>
      {randomWidths.map((width, key) => {
        return <div style={{width: `${width}%`}} key={key}><Skeleton count={1} {...props} /></div>;
      })}
    </>
  );
};
LoadingSkeleton.propTypes = {
  // The number of lines to display
  count: NumberPropTypes({ start: 1 }),
  // Enables random width to achieve a real article effect whose line width varies.
  // You can limit the min and max of the variation by `minWidth` and `maxWidth` props.
  randomWidth: PropTypes.bool,
  minWidth: NumberPropTypes({ start: 1, end: 100 }),
  maxWidth: NumberPropTypes({ start: 1, end: 100 }),
  // The default style tries to fill up the width of the element.
  // You can change this by passing a `width` prop to specify a css width.
};
