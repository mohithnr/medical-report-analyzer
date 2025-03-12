import React, { useState, useEffect } from "react";
import axios from "axios";

const imagepath = "/hrp project image.webp";

const ReportUploader = () => {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedResponse = localStorage.getItem("response");
    if (savedResponse) {
      setResponse(JSON.parse(savedResponse));
    }
  }, []);

  useEffect(() => {
    if (response) {
      localStorage.setItem("response", JSON.stringify(response));
    }
  }, [response]);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file!");
    setLoading(true);
    const formData = new FormData();
    formData.append("report", file);
    formData.append("language", language);

    try {
      const { data } = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResponse(data);
    } catch (error) {
      console.error(error);
      alert("Error processing the report.");
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (summary) => {
    const cleanedSummary = summary.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleanedSummary);
    } catch (error) {
      console.error("Error parsing summary:", error);
      return null;
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete("http://localhost:5000/delete-files");
      alert("Add valid files!");
      localStorage.removeItem("response");
      setResponse(null);
      setFile(null);
      setLanguage("English");
    } catch (error) {
      console.error(error);
      alert("Error deleting files.");
    }
  };

  const parsedSummary = response ? parseSummary(response.summary) : null;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-200 to-indigo-500 p-6">
      <h1 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">Medical Report Analyzer</h1>
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row gap-6">
        <div className="flex flex-col items-center w-full md:w-1/2">
          <img src={imagepath} alt="Medical Analysis" className="w-full h-56 object-cover rounded-lg" />
          {!response && (
            <div className="w-full flex flex-col space-y-4 mt-4">
              <label className="font-semibold">Upload Report:</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} className="p-2 border border-gray-300 rounded-lg w-full" />
              <label className="font-semibold">Select Language:</label>
              <select onChange={(e) => setLanguage(e.target.value)} className="p-2 border border-gray-300 rounded-lg w-full">
                <option value="English">English</option>
                <option value="Kannada">Kannada</option>
                <option value="Telugu">Telugu</option>
                <option value="Tamil">Tamil</option>
                <option value="Hindi">Hindi</option>
              </select>
              <button onClick={handleUpload} className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition w-full">
                Upload
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start w-full md:w-1/2">
          {loading && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-dashed border-blue-500 rounded-full animate-spin"></div>
              <span className="text-lg font-semibold">Loading...</span>
            </div>
          )}

          {!loading && response && parsedSummary && (
            <div className="space-y-6 w-full">
              <div className="p-4 bg-blue-100 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">Key Findings</h2>
                <p>{parsedSummary.keyFindings}</p>
              </div>

              <div className="p-4 bg-red-100 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">Abnormalities</h2>
                {parsedSummary.abnormalities.map((item, index) => (
                  <div key={index} className="mb-4">
                    <p><strong>Test:</strong> {item.test}</p>
                    <p><strong>Result:</strong> {item.result}</p>
                    <p><strong>Normal Range:</strong> {item.normalRange}</p>
                    <p><strong>Abnormality:</strong> {item.abnormality}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-green-100 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">Recommended Steps</h2>
                <p>{parsedSummary.recommendedSteps}</p>
              </div>

              <a
                href={`http://localhost:5000/${response.pdfPath}`}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Click here to Download as PDF
              </a>
            </div>
          )}

          {response && (
            <button
              onClick={handleDelete}
              className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition w-full"
            >
              Add Another Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportUploader;
