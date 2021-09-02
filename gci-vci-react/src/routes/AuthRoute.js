import React from "react";
import lodashGet from 'lodash';
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { Route } from "react-router-dom";
import isEmpty from "lodash/isEmpty";
import { Auth } from 'aws-amplify';
import { RestAPI as API } from '@aws-amplify/api-rest';
import { API_NAME } from "../utils";
import { Authenticator, Greetings } from 'aws-amplify-react';
import { signUpConfig } from "../constants/authenticationConfig";
import AffiliationsNav from "../components/affiliation/AffiliationsNav";
import { useAmplifyAPIRequestRecycler } from "../utilities/fetchUtilities";
import { updateAuth, setIsAuthenticating, resetAuth } from "../actions/actions";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { isActiveUser } from "../utilities/ownershipUtilities";

export default function AuthRoute({ component: Component, ...rest}) {
    const requestRecycler = useAmplifyAPIRequestRecycler();

    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);
    const history = useHistory();

    const authenticate = async () => {
        try {
            await Auth.currentSession();
        } catch (error) {
            if (error === 'No current user') {
                return;
            }
            throw new Error(error.message || error);
        }

        let cognitoUser;
        try {
            cognitoUser = await Auth.currentUserInfo();
        } catch (error) {
            throw new Error(error.message || error);
        }

        if (!cognitoUser || !lodashGet(cognitoUser, 'attributes.email')) {
            throw new Error('Cannot get user info from cognito!');
        }

        const email = cognitoUser.attributes.email;
        let users;
        try {
            users = await requestRecycler.capture(API.get(API_NAME, `/users?email=${email}`))
        } catch (error) {
            if (API.isCancel(error)) {
                return;
            }
            throw new Error(lodashGet(error, 'response.data.error', 'Failed to get your account info from serverless backend!'));
        }

        if (!users || (Array.isArray(users) && !users.length)) {
            throw new Error(`No such user "${email}" in database!`);
        }

        if (users.length > 1) {
            throw new Error(`There're multiple users matching your email in database, something is wrong.`);
        }

        const user = users[0];

        if (!user.user_status) {
            console.error('User data from serverless backend is', user);
            throw new Error('Your account status is missing from the database!');
        }
        
        // Uncomment below to test on an account that isn't yet active
        // user.user_status = 'active';

        return user;
    }
    
    /**
     * Callback function provided by `<Authenticator />`.
     * 
     * See {@link https://docs.amplify.aws/ui-legacy/auth/authenticator/q/framework/react#show-your-app-after-sign-in|Amplify documentation}.
     * 
     * @param {string} currentAuthState - enum of one of the authState, see {@link https://docs.amplify.aws/ui-legacy/auth/authenticator/q/framework/react#show-your-app-after-sign-in|Amplify documentation}.
     * @param {*} cognitoUser - when `currentAuthState` is `"signedIn"`, it will return a CognitoUser object.
     */
    const onAuthStateChange = async (currentAuthState, cognitoUser) => {
        // if already signed in, no need to authenticate
        if (isActiveUser(auth) && currentAuthState === 'signedIn' && !isEmpty(cognitoUser)) {
            return;
        }

        let user;
        dispatch(setIsAuthenticating(true));
        try {
            user = await authenticate();
        } catch (error) {
            alert(error.message);
            dispatch(setIsAuthenticating(false));
            history.push('/');
            return;
        }
        dispatch(setIsAuthenticating(false));

        if (user && user.user_status) {
            dispatch(updateAuth(user));
            if (!user.accepted_terms) {
                history.push('/terms-of-use');
            } else if (user.user_status === 'requested activation') {
                // Account is not activated yet. Redirecting to /activation landing page.
                history.push('/activation');
            } else if (user.user_status === 'inactive') {
                history.push('/access-denied');
            }
        } else {
            // clear out any possible previous session auth
            dispatch(resetAuth());

            // do nothing if user object is empty -
            // e.g., request canceled due to component unmounted
            // e.g., user initially not logged in yet, and let amplify render login UI
        }

    }

    return (
        <Route {...rest} render={props => 
            <Authenticator 
                signUpConfig={signUpConfig}
                hide={[Greetings]}
                onStateChange={onAuthStateChange}
            >
                {/* adding an extra layer of React Fragment to resolve <Authenticator /> warnings 
                    see https://github.com/aws-amplify/amplify-js/issues/234#issuecomment-541340399
                */}
                <>
                    {/* prevent component from mounting before sign in */}
                    {auth.isAuthenticating ? (
                        <LoadingSpinner text="Authenticating" />
                    ) : isActiveUser(auth) ? (
                        <>
                            <AffiliationsNav {...props} />
                            {Component ? <Component {...props} /> : <span>No component or render passed in AuthRoute.</span>}
                        </>
                    ) : null}
                </>
            </Authenticator> }
        />
   ) 
}
