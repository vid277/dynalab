import "./App.css";
import FileUpload from "./components/FileUpload";

function App() {
  const handleFileSelect = (files: File[]) => {
    console.log("Selected files:", files);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Hello World!</h1>
      <FileUpload onFileSelect={handleFileSelect} />
    </div>
  );
}

export default App;
