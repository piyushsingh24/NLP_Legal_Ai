import NavBar from '../components/navbar';
import Banner from '../components/banner';
import Footer from '../components/footer';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Home() {
  return (
    <div className="App">
      <NavBar />
      <Banner />
      <Footer />
    </div>
  );
}
