import LandingPage from "./components/LandingPage";
import ReportUploader from "./components/ReportUploader";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze" element={<ReportUploader />} />
      </Routes>
    </Router>
  );
}

export default App;