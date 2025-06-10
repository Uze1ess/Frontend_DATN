import React, { useState, useEffect } from "react";
import io from "socket.io-client";
const socket = io("http://localhost:5000");

function App() {
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState("");
  const [inferenceTime, setInferenceTime] = useState(0);
  const [detections, setDetections] = useState([]);
  const [imageData, setImageData] = useState("");

  useEffect(() => {
    socket.emit("get_cameras");

    socket.on("camera_list", (list) => {
      console.log("Received camera list:", list);
      setCameras(list);
      if (list.length > 0) {
        setSelectedCam(list[0]); // tự chọn camera đầu tiên
        socket.emit("select_camera", { camera: list[0] });
      }
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("result", (data) => {
      console.log("Received result:", data);
      setImageData(`data:image/jpeg;base64,${data.image}`);
      setDetections(data.detections);
    });

    return () => {
      socket.off("camera_list");
      socket.off("result");
    };

  }, []);

  const handleCameraChange = (e) => {
    const cam = e.target.value;
    console.log("Selected camera:", cam);
    setSelectedCam(cam);
    socket.emit("select_camera", { camera: cam });
  };

  return (
    <>
      <h1 className="my-8 text-4xl">Yolo Object Detection</h1>

      <div className="container text-lg flex justify-evenly gap-10">
        {/* ... giữ nguyên device + model selector ... */}

        <div id="camera-selector-container">
          <label htmlFor="camera-selector">Select Camera:</label>
          <select value={selectedCam} onChange={handleCameraChange}>
            {cameras.map((cam, idx) => (
              <option key={idx} value={cam}>{cam}</option>
            ))}
          </select>
        </div>
      </div>

      {imageData ? (
        <img
          src={imageData}
          alt="Detected result"
          className="block max-w-[720px] max-h-[640px] rounded-lg"
        />
      ) : (
        <p className="text-white">No image received</p>
      )}

      <div id="btn-container" className="container flex justify-around">
        <button className="btn" disabled>
          Open Image
          <input type="file" accept="image/*" hidden />
        </button>

        <button className="btn" disabled>
          Open Camera
        </button>

        <label className="btn cursor-pointer">
          <input type="file" accept=".onnx" hidden />
          <span>Add model</span>
        </label>
      </div>

      <div id="model-status-container" className="text-2xl">
        <div
          id="inferenct-time-container"
          className="flex justify-evenly text-xl my-6"
        >
          <p>
            Warm up time: <span className="text-lime-500">0ms</span>
          </p>
          <p>
            Inference time: <span className="text-lime-500">0ms</span>
          </p>
        </div>
        <p className="animate-text-loading">Model not loaded</p>
      </div>

      <details className="text-gray-200 group" open>
        <summary className="my-5 hover:text-gray-400 cursor-pointer transition-colors duration-300">
          Detected objects
        </summary>
        <div className="transition-all duration-300 ease-in-out transform origin-top group-open:animate-details-show">
          <table className="text-left w-1/2 mx-auto border-collapse table-auto text-sm bg-gray-800 rounded-md overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="border-b border-gray-600 p-4 text-gray-100">
                  Number
                </th>
                <th className="border-b border-gray-600 p-4 text-gray-100">
                  ClassName
                </th>
                <th className="border-b border-gray-600 p-4 text-gray-100">
                  Confidence
                </th>
              </tr>
            </thead>
              <tbody>
                {detections.map((det, index) => (
                  <tr key={index} className="hover:bg-gray-700 transition-colors text-gray-300">
                    <td className="border-b border-gray-600 p-4">{index + 1}</td>
                    <td className="border-b border-gray-600 p-4">{det.class}</td>
                    <td className="border-b border-gray-600 p-4">{det.confidence}%</td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export default App;