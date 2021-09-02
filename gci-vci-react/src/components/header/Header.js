import React from 'react';
import { connect } from 'react-redux';
import AuthNav from './AuthNav';

/**
 * Stateless functional component to render admin console header
 * currently unused
 */
const Header = (props) => {
    // const username = props.username;
    const isLoggedIn = props.isLoggedIn
    console.log(isLoggedIn.value)

    console.log(props)

    if(isLoggedIn.value) {
        return <AuthNav />
    } 
}

const mapStateToProps = state => ({
    username: state.username
})

export default connect(mapStateToProps)(Header);