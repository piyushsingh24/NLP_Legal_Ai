import { Container, Row, Col } from "react-bootstrap";

export const Foooter = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="align-items-center">
          <Col xs={12} className="text-center">
            <p>Copyright 2026 Legal AI. All Rights Reserved</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};
