import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
const socket = io("http://localhost:5000");
import './App.css';

function App() {
  const [inferenceTime, setInferenceTime] = useState(0);
  const [detections, setDetections] = useState([]);
  const [imageData, setImageData] = useState("");
  const [imageDataVideo, setImageDataVideo] = useState("");
  const [imageDataRealtime, setImageDataRealtime] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [activeTab, setActiveTab] = useState("Video");
  const [videoDetecting, setVideoDetecting] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoPath, setVideoPath] = useState("");
  const [renderedFile, setRenderedFile] = useState("");
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [videoStatus, setVideoStatus] = useState("");
  const [canRender, setcanRender] = useState(false);
  const [averageInferenceTime, setAverageInferenceTime] = useState(0);
  const intervalRef = useRef(null);
  const clearedRef = useRef(false);
  const [currentSource, setCurrentSource] = useState("none");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setCameraDevices(videoInputs);
      });

    socket.on("result_video", (data) => {
        setImageDataVideo(`data:image/jpeg;base64,${data.image}`);
        setDetections(data.detections);
        setAverageInferenceTime(data.avg_inference_time);
    });

    socket.on("result_realtime", (data) => {
        setImageDataRealtime(`data:image/jpeg;base64,${data.image}`);
        setDetections(data.detections);
        setAverageInferenceTime(data.avg_inference_time);
    });

    socket.on("clear_frame_video", () => {
      setImageDataVideo("");
      setDetections([]);
      setVideoStatus("");
    });

    socket.on("clear_frame_realtime", () => {
      setImageDataRealtime("");
      setDetections([]);
      setVideoStatus("");
    });

    socket.on("video_done", () => {
      if (clearedRef.current) return;
      setVideoDetecting(false);
      setVideoPaused(false);
      setcanRender(true);
      setVideoStatus("done");
    });

    const handleRenderDone = (data) => {
      if (clearedRef.current) return;
      const { filename, video_base64 } = data;
      const a = document.createElement("a");
      a.href = `data:video/mp4;base64,${video_base64}`;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setVideoStatus("done");
    };

    socket.on("render_done", handleRenderDone);

    return () => {
      socket.off("result");
      socket.off("clear_frame");
      socket.off("video_done");
      socket.off("render_done", handleRenderDone);
    };
  }, [activeTab, currentSource]);

  const handleOpenCamera = (index) => {
    socket.emit("start_camera", { camera_index: index });
    setCameraOn(true);
    setCurrentSource("camera");
  };

  const handleStopCamera = () => {
    socket.emit("stop_camera");
    setCameraOn(false);
    setCurrentSource("none");
    setImageData("");
    setDetections([]);
  };

  const handleSendVideoPath = () => {
    if (videoPath.trim() !== "") {
      clearedRef.current = false;
      socket.emit("video_path", { path: videoPath });
      setVideoDetecting(true);
      setVideoPaused(false);
      setVideoStatus("detecting");
      setcanRender(false);
      setCurrentSource("video");
    }
  };

  const videoStatusText = {
    detecting: { text: "🔍 Detecting...", color: "text-yellow-600" },
    pausing: { text: "⏸ Paused", color: "text-yellow-400" },
    done: { text: "✅ Detect Complete", color: "text-green-600" },
    rendering: { text: "🎬 Rendering...", color: "text-blue-600" },
  };

  const canClearVideo = videoStatus === "pausing" || videoStatus === "done";

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#FF6766] text-white py-4 px-8 flex justify-between items-center shadow-md">
        <h2 className="text-2xl font-semibold">Detection UI</h2>
        <div className="flex space-x-6">
          <button className={`text-lg text-black px-4 py-2 rounded-md ${activeTab === "Realtime" ? "bg-gray-100" : "hover:bg-gray-300"}`} onClick={() => setActiveTab("Realtime")}>Realtime</button>
          <button className={`text-lg text-black px-4 py-2 rounded-md ${activeTab === "Video" ? "bg-gray-100" : "hover:bg-gray-300"}`} onClick={() => setActiveTab("Video")}>Video</button>
        </div>
      </nav>

      <div className="h-20" />

      <div className="px-8">
        <h1 className="my-8 text-4xl text-blue-900">Yolo Object Detection - {activeTab}</h1>

        {activeTab === "Realtime" && (
          <div className="text-lg flex justify-evenly gap-10">
            <select className="border px-4 py-2 rounded-md text-black" value={selectedCamera} onChange={(e) => setSelectedCamera(parseInt(e.target.value))}>
              {cameraDevices.map((device, index) => (
                <option key={device.deviceId} value={index}>{device.label || `Camera ${index}`}</option>
              ))}
            </select>

            {!cameraOn ? (
              <button className="btn" onClick={() => handleOpenCamera(selectedCamera)}>Open Camera</button>
            ) : (
              <button className="btn" onClick={handleStopCamera}>Stop Camera</button>
            )}
          </div>
        )}

        {activeTab === "Video" && (
          <div className="text-lg flex justify-evenly gap-10">
            <div className="flex gap-4">
              <input type="text" placeholder="Enter server-side video path" className="px-4 py-2 border border-gray-500 rounded-md w-96 text-black" value={videoPath} onChange={(e) => setVideoPath(e.target.value)} />
              <button className="btn" onClick={handleSendVideoPath}>Detect</button>
            </div>
          </div>
        )}

        {activeTab === "Video" && videoStatusText[videoStatus] && (
          <div className={`text-center text-lg font-semibold my-2 ${videoStatusText[videoStatus].color}`}>
            {videoStatusText[videoStatus].text}
          </div>
        )}

        {activeTab === "Realtime" && (
        <div className="w-[854px] h-[450px] bg-[#111] mx-auto my-8 flex items-center justify-center rounded-lg shadow-lg overflow-hidden">
          {imageDataRealtime ? (
            <img src={imageDataRealtime} alt="Detected result" className="max-w-full max-h-full object-contain" />
          ) : (
            <p className="text-white text-xl">No Realtime received</p>
          )}
        </div>
        )}

        {activeTab === "Video" && (
        <div className="w-[854px] h-[450px] bg-[#111] mx-auto my-8 flex items-center justify-center rounded-lg shadow-lg overflow-hidden">
          {imageDataVideo ? (
            <img src={imageDataVideo} alt="Detected result" className="max-w-full max-h-full object-contain" />
          ) : (
            <p className="text-white text-xl">No Frame received</p>
          )}
        </div>
        )}

        {activeTab === "Video" && (
          <div className="flex justify-center gap-4 my-4">
            <button className="btn" onClick={() => {
              const nextPaused = !videoPaused;
              socket.emit(nextPaused ? "pause_video" : "continue_video");
              setVideoPaused(nextPaused);
              setVideoStatus(nextPaused ? "pausing" : "detecting");
            }} disabled={!videoDetecting}>
              {videoPaused ? "Continue" : "Pause"}
            </button>

            <button className="btn" onClick={() => {
              socket.emit("clear_video");
              setImageDataVideo("");
              setDetections([]);
              setVideoDetecting(false);
              setVideoPaused(false);
              setVideoPath("");
              setAverageInferenceTime();
              setVideoStatus("");
              setcanRender(false);
              clearedRef.current = true;
            }} disabled={!canClearVideo}>
              Clear
            </button>

            <button className="btn" onClick={() => {
              socket.emit("render_video");
              setVideoStatus("rendering");
            }} disabled={!canRender}>
              Render
            </button>
          </div>
        )}

        <div className="flex flex-col items-center my-6 text-lime-400 text-xl font-semibold">
          <p>Average inference time: <span className="text-lime-500">{averageInferenceTime}ms</span></p>
        </div>

        <details className="text-gray-200 group" open>
          <summary className="my-5 text-black hover:text-[#FF6766] cursor-pointer transition-colors duration-300">Detected objects</summary>
          <div className="transition-all duration-300 ease-in-out transform origin-top group-open:animate-details-show">
            <table className="text-left w-1/2 mx-auto border-collapse table-auto text-sm bg-gray-800 rounded-md overflow-hidden">
              <thead className="bg-gray-700">
                <tr>
                  <th className="border-b border-gray-600 p-4 text-gray-100">Number</th>
                  <th className="border-b border-gray-600 p-4 text-gray-100">ClassName</th>
                  <th className="border-b border-gray-600 p-4 text-gray-100">Confidence</th>
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
      </div>
    </>
  );
}

export default App;