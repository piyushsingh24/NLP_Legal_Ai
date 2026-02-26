import { Container, Row, Col } from "react-bootstrap";

const Footer = () => {
  return (
    <footer className="footer" style={{ padding: '20px 0', backgroundColor: '#121212', color: '#B8B8B8' }}>
      <Container>
        <Row className="align-items-center">
          <Col xs={12} className="text-center">
            <p style={{ margin: 0 }}>Copyright 2026 Legal AI. All Rights Reserved</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
