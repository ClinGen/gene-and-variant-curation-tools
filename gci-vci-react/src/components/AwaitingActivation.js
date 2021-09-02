import React from 'react';
import {Jumbotron, Container, Button} from 'react-bootstrap';

function AwaitingActivation(props) {

    return(
        <Jumbotron>
            <Container className="text-center">
                <h1 className="display-4">Thank you for registering!</h1>
                <p className="lead">We've received your request for access and will be reviewing it soon. 
                Check back in 24 hours, and if necessary email us at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a></p>
                <Button href="/" variant="primary">ClinGen Home</Button>
            </Container>
        </Jumbotron>
    )
}

export default AwaitingActivation;
