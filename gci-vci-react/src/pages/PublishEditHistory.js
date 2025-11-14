import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API } from 'aws-amplify';
import { API_NAME } from '../utils';
import { Container, Row, Col, Card, ListGroup, Badge, Button } from 'react-bootstrap';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { createBeforeDiff, createAfterDiff } from '../utilities/diffUtilities';

const EditHistory = () => {
  const { snapshotPK } = useParams();
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    const fetchSnapshot = async (snapshotPK) => {
      try {
        setLoading(true);
        const url = `/snapshots/${snapshotPK}`;
        const snapshot = await API.get(API_NAME, url);
        if (snapshot) {
          setSnapshot(snapshot);
          setLoading(false);
        }
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
    fetchSnapshot(snapshotPK);
  }, [snapshotPK]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(); // Format date to 'MM/DD/YYYY'
  };

  const renderCloseButton = () => {
    return (
      <div className="text-right">
        <Button
          variant="outline-dark"
          className="my-3 text-right"
          onClick={() => window.close()}
        >
          <i className="icon icon-close" /> Close
        </Button>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center mt-5 mb-5"><LoadingSpinner /></div>;
  } else if (!snapshot && !loading) {
    return (
      <div>
        No edit history found
        {renderCloseButton()}
      </div>
    );
  } else {
    const snapshotPK = snapshot && snapshot.PK ? snapshot.PK : null;
    const publishEditHistory = snapshot.resource.publishEditHistory || [];

    // Sort the publishEditHistory array in reverse chronological order (we want to display the most recent edit on top)
    const sortedEditHistory = [...publishEditHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
      <Container className="mt-4">
        <h2>Edit History for Snapshot {snapshotPK}</h2>
        {renderCloseButton()}
        {sortedEditHistory.map((edit, index) => (
          <Card className="mb-4" key={index}>
            <Card.Header>
              <strong>Edited by:</strong> {edit.editor}<br />
              <strong>Timestamp:</strong> {new Date(edit.timestamp).toLocaleString()}
            </Card.Header>
            <Card.Body>
              <Card.Title>Changes</Card.Title>
              <ListGroup variant="flush">
                {Object.keys(edit.changes.before).map((key) => (
                  <ListGroup.Item key={key}>
                    <Row>
                      <Col md={6}>
                        <Badge variant="secondary">Before</Badge>
                        <div><strong>{key}:</strong></div>
                        {key === 'publishDate' || key === 'approvalReviewDate' ? (
                          <div>{formatDate(edit.changes.before[key])}</div>
                        ) : key === 'evidenceSummary' ? (
                          <div>{createBeforeDiff(edit.changes.before[key], edit.changes.after[key])}</div>
                        ) : (
                          <div>{JSON.stringify(edit.changes.before[key], null, 2)}</div>
                        )}
                      </Col>
                      <Col md={6}>
                        <Badge variant="primary">After</Badge>
                        <div><strong>{key}:</strong></div>
                        {key === 'publishDate' || key === 'approvalReviewDate' ? (
                          <div>{formatDate(edit.changes.after[key])}</div>
                        ) : key === 'evidenceSummary' ? (
                          <div>{createAfterDiff(edit.changes.before[key], edit.changes.after[key])}</div>
                        ) : (
                          <div>{JSON.stringify(edit.changes.after[key], null, 2)}</div>
                        )}
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        ))}
      </Container>
    );
  }
}

export default EditHistory;