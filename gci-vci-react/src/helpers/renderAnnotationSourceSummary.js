import React from 'react';
import PmidSummary from "../components/common/article/PmidSummary";
import ClinVarSummary from "../components/common/article/ClinVarSummary";


/**
 * Method to display the source summary given the annotation
 * If annotation is article, display PMID summary.
 * If annotation is ClinVar record, display SCV summary.
 * @param {object} annotation - annotation
 */
export function renderAnnotationSourceSummary(
    annotation,
    displayJournal,
    displayAllAuthors,
    linkout,
    linkoutOnNewLine,
    showComment
){
    return (
        <>
            {annotation?.article && 
                <PmidSummary
                    article={annotation.article}
                    displayJournal={displayJournal}
                    displayAllAuthors={displayAllAuthors}
                    pmidLinkout={linkout}
                    pmidLinkoutOnNewLine={linkoutOnNewLine}
                />
            }
            {annotation?.scv &&
                <ClinVarSummary
                    scv={annotation.scv}
                    linkout={linkout}
                    linkoutOnNewLine={linkoutOnNewLine}
                    showComment={showComment}
                />
            }
        </>
    );
}
