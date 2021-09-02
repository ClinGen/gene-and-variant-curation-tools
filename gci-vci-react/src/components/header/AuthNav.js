import React from 'react';
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import LogOutButton from './logout';
import { isUserAllowedToCreateGdm } from "../../helpers/allowCreateGdm";

const AuthNav = () => {
    const auth = useSelector((state) => state.auth);
    const allowToCreateGdm = isUserAllowedToCreateGdm(auth);
    const createGdmLinkClass = "btn btn-outline-primary" + (allowToCreateGdm ? "" : " disabled");
    let loginOutButton;

    // User is authenticated + user_status = "requested activation"
    if (auth.user_status === 'active'){
        loginOutButton = <LogOutButton />
    }
    // User is authenticated, but user_status is "requested activation"
    else{
        loginOutButton = <Link to="/dashboard" className="nav-link navbutton-new">Login</Link>;
    }

    return (
        <>
        <nav className="navbar navbar-expand-lg navbar-dark navbar-right">
        <Link className="navbar-brand" to="/">ClinGen Dashboard</Link>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav ml-auto">
                {/* Only show complete nav is user status allows them to see entire app */}
                {auth && auth.user_status==='active' && (
                    <>
                    <li className="nav-item mr-2">
                        <Link to="/vp" className="btn btn-outline-primary">Variant Prioritization</Link>
                    </li>
                    <li className="nav-item mr-2">
                    <Link to="/select-variant" className="btn btn-outline-primary">New Variant Curation</Link>
                    </li>
                    <li className="nav-item mr-2">
                        <Link to={allowToCreateGdm ? "/create-gene-disease/" : "/"} className={createGdmLinkClass}>New Gene Curation</Link>
                    </li>
                    <li>
                        <Link to="/dashboard" className="nav-link navbutton-new">Dashboard</Link>
                    </li>
                    <li className="nav-item dropdown">
                        <a className="nav-link dropdown-toggle navbutton-new" href="/" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        Help
                        </a>
                        <div className="dropdown-menu dropdown-menu-right" aria-labelledby="navbarDropdown">
                        <a className="dropdown-item" href="https://github.com/ClinGen/clincoded/wiki/GCI-Curation-Help" target="_blank" rel="noopener noreferrer">Help - GCI</a>
                        <a className="dropdown-item" href="https://github.com/ClinGen/clincoded/wiki/VCI-Curation-Help" target="_blank" rel="noopener noreferrer">Help - VCI</a>
                        <a className="dropdown-item" href="mailto:clingen-helpdesk@lists.stanford.edu" target="_blank" rel="noopener noreferrer">Contact Helpdesk</a>
                        <a className="dropdown-item" href="https://www.clinicalgenome.org/curation-activities/gene-disease-validity/educational-and-training-materials/standard-operating-procedures/" target="_blank" rel="noopener noreferrer">SOP - GCI</a>
                        <a className="dropdown-item" href="https://clinicalgenome.org/curation-activities/variant-pathogenicity/training-materials/" target="_blank" rel="noopener noreferrer">SOP - VCI</a>
                        <a className="dropdown-item" href="http://gene-tracker.clinicalgenome.org" target="_blank" rel="noopener noreferrer">GeneTracker</a>
                        <Link to="/terms-of-use" className="dropdown-item" target="_blank" rel="noopener noreferrer">Terms of Use</Link>
                        </div>
                    </li>

                    </>
                )}
                
                <li className={`nav-item pl-2 ${auth && auth.user_status === 'active' && ( 'ml-2 border-left border-light')}`}>
                    {loginOutButton}
                </li>
            </ul>
        </div>
    </nav> 
    </>
    )
}

export default AuthNav;

