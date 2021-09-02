import React from 'react';
import { Route, Switch } from "react-router-dom";

import Home from "../pages/home";
import AuthRoute from "./AuthRoute";
import Dashboard from "../pages/dashboard";
import SelectVariant from "../pages/selectVariant";
import VariantCentralItem from '../pages/variantCentralItem';
import CreateGeneDisease from '../pages/createGeneDisease';
import InterpretationAll from '../pages/interpretationAll';
import GDMAll from '../pages/GDMAll';
import SnapshotSummary from '../components/SnapshotSummary';
import AwaitingActivation from '../components/AwaitingActivation';
import AccessDenied from '../components/AccessDenied';
import UserTable from '../pages/UserTable';
import TermsOfUse from '../pages/TermsOfUse';
import VariantPrioritizationTool from '../pages/VariantPrioritizationTool';
import { TransferCuration } from '../components/admin/TransferCuration';
import { gciRoutePaths, GCICurationRouterSwitch } from './GdmRoutes';

/**
 * Home Router for application
 * built using 'react-router'
 */

function AppRouter() {
    return (
        <Switch>
            {/* Global Routes */}
            <Route exact path='/' component={Home} />
            <Route exact path="/activation" component={AwaitingActivation} />
            <Route exact path="/access-denied" component={AccessDenied} />
            <Route exact path="/terms-of-use" component={TermsOfUse} />
            <AuthRoute exact path='/dashboard' component={Dashboard} />
            <AuthRoute exact path='/interpretation-all' component={InterpretationAll} />
            <AuthRoute exact path='/gdm-all' component={GDMAll} />
            <AuthRoute exact path="/snapshot-summary*" component={SnapshotSummary} />
            <AuthRoute exact path="/users" component={UserTable} />
            <AuthRoute exact path="/vp*" component={VariantPrioritizationTool} />
            
            {/* VCI Routes */}
            <AuthRoute exact path='/select-variant' component={SelectVariant} />
            <AuthRoute exact path="/variant-central/:rid" component={VariantCentralItem} />
            <AuthRoute exact path="/variant-central/:rid/interpretation/:interpretationPK" component={VariantCentralItem} />

            {/* GCI Routes */}
            <AuthRoute exact path='/create-gene-disease' component={CreateGeneDisease} />
            <AuthRoute exact path={gciRoutePaths} component={GCICurationRouterSwitch} />

            {/* Admin Routes */}
            <AuthRoute exact path='/transfer-curation' component={TransferCuration} />
        </Switch>
    )
}
export default AppRouter;
