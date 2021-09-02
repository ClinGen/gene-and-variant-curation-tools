import React from 'react';
import { useHistory } from "react-router-dom";
import { Auth } from 'aws-amplify';
import { useDispatch } from 'react-redux';
import { resetAuth } from '../../actions/actions';
import { Button } from 'react-bootstrap';

/*
* LogOut Button for the navbar
* Logs user out and sends them to 

*/
const LogOutButton = () => {
    const history = useHistory();
    const dispatch = useDispatch();

    function handleClick() {
        Auth.signOut()
            .then(() => {
                dispatch(resetAuth());
            })
            .then(() => {
                history.push("/");
            })
            .catch(error => {
                console.log('logout error', error)
            })
    }

    return (
        <Button variant="link" className="nav-link navbutton-new" onClick={handleClick}>Log Out</Button>
    )
}

export default LogOutButton;
