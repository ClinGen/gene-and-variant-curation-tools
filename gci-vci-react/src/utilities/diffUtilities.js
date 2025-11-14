import React from 'react';
import { diffWords } from 'diff';

export const createBeforeDiff = (before, after) => {
  const diff = diffWords(before, after);
  return diff.map((part, index) => {
    if (part.removed) {
      return (
        <span key={index} className="diff-removed">
          {part.value}
        </span>
      );
    }
    if (!part.added) {
      return <span key={index}>{part.value}</span>;
    }
    return null;
  });
};

export const createAfterDiff = (before, after) => {
  const diff = diffWords(before, after);
  return diff.map((part, index) => {
    if (part.added) {
      return (
        <span key={index} className="diff-added">
          {part.value}
        </span>
      );
    }
    if (!part.removed) {
      return <span key={index}>{part.value}</span>;
    }
    return null;
  });
};