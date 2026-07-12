/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  QrCode, Camera, Upload, Keyboard, RefreshCw, CheckCircle2, 
  AlertCircle, ChevronRight, Laptop, MapPin, Tag, ArrowLeftRight, 
  Wrench, ClipboardCheck, ArrowUpRight, HelpCircle, X
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Asset, AssetStatus, AssetCondition, User, UserRole } from "../types.js";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  user: User;
  onAction: (action: "view" | "checkout" | "transfer" | "return" | "maintenance" | "register", asset: any, code?: string) => void;
}

export default function ScannerModal({ isOpen, onClose, assets, user, onAction }: ScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "sandbox">("camera");
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Camera scanning states
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraInitStatus, setCameraInitStatus] = useState<string>("");

  // File upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manual input state
  const [manualCode, setManualCode] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanRegionId = "camera-scanner-viewport";
  const fileReaderId = "file-reader-hidden-viewport";

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setMatchedAsset(null);
      setUploadedFile(null);
      setUploadedFilePreview(null);
      setUploadError(null);
      setManualCode("");
      setCameraPermissionError(null);
      setCameraInitStatus("");
      
      // Auto-request camera devices
      requestCameras();
    } else {
      stopCameraScan();
    }
  }, [isOpen]);

  // Handle auto-starting/stopping when tab switches
  useEffect(() => {
    if (activeTab === "camera" && isOpen && selectedCameraId) {
      startCameraScan(selectedCameraId);
    } else {
      stopCameraScan();
    }
  }, [activeTab, selectedCameraId]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Unmount cleanup failed:", err));
        }
      }
    };
  }, []);

  const requestCameras = async () => {
    try {
      setCameraInitStatus("Requesting camera authorization...");
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameraDevices(devices);
        setSelectedCameraId(devices[0].id);
        setCameraPermissionError(null);
        setCameraInitStatus("Cameras loaded successfully.");
      } else {
        setCameraPermissionError("No camera input devices detected on this system.");
      }
    } catch (err: any) {
      console.error("Camera permission error:", err);
      setCameraPermissionError(
        "Camera access request was denied or blocked. Please allow browser permissions or switch to the Image Upload or Sandbox modes."
      );
    }
  };

  const startCameraScan = async (cameraId: string) => {
    if (!isOpen || activeTab !== "camera") return;
    
    try {
      await stopCameraScan();
      
      setCameraInitStatus("Initializing camera feed...");
      const html5QrCode = new Html5Qrcode(scanRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.7),
              height: Math.floor(minSize * 0.7)
            };
          }
        },
        (decodedText) => {
          // Success!
          handleScanSuccess(decodedText);
          // Play micro sound for scan feedback
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
          } catch(e){}
        },
        () => {
          // Silent verbose scanner errors (hashing frame mismatches)
        }
      );

      setIsScanning(true);
      setCameraInitStatus("Scanning feed live.");
    } catch (err: any) {
      console.error("Start scanning failed:", err);
      setCameraInitStatus(`Start error: ${err.message || err}`);
    }
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
        setCameraInitStatus("Camera stopped.");
      } catch (err) {
        console.error("Stop scanning failed:", err);
      }
    }
  };

  const handleScanSuccess = (code: string) => {
    const trimmed = code.trim();
    setScannedResult(trimmed);
    lookupAsset(trimmed);
  };

  const lookupAsset = (code: string) => {
    setSearching(true);
    // Search by tag (exact/contains case-insensitive) or serialNumber
    const query = code.toLowerCase();
    const found = assets.find(
      a => a.tag.toLowerCase() === query || 
           a.serialNumber.toLowerCase() === query || 
           a.id.toLowerCase() === query
    );
    
    // Simulate delay for realism
    setTimeout(() => {
      setMatchedAsset(found || null);
      setSearching(false);
    }, 400);
  };

  // Image upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    setUploadedFile(file);
    setUploadError(null);
    setScannedResult(null);
    setMatchedAsset(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Run decoder on the file
    setTimeout(async () => {
      try {
        const fileScanner = new Html5Qrcode(fileReaderId);
        const decodedText = await fileScanner.scanFile(file, false);
        handleScanSuccess(decodedText);
      } catch (err: any) {
        console.error("File decode failed:", err);
        setUploadError(
          "Could not detect a valid QR code or barcode in this image. Please ensure the tag is well-lit, centered, and sharp."
        );
      }
    }, 500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode);
    }
  };

  if (!isOpen) return null;

  const isManager = user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;

  return (
    <div id="scanner-modal-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      
      {/* Hidden reader for image scanning file processing */}
      <div id={fileReaderId} className="hidden" style={{ display: "none" }}></div>

      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-5 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <QrCode size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900">
                Assetflow Scanner Hub
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Scan visual barcodes, QR tag matrices, or serial numbers to initiate fast lookup and checkout custody transfers.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-100 border-b border-slate-200 p-1 shrink-0">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "camera"
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera size={13} />
            Device Camera Stream
          </button>
          
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-white text-indigo-600 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload size={13} />
            Upload Image Tag
          </button>

          <button
            onClick={() => setActiveTab("sandbox")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "sandbox"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Instant sandbox testing without webcams"
          >
            <HelpCircle size={13} className="text-amber-400" />
            Simulation Panel
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
          
          {/* Tab 1: Camera Stream View */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              {cameraPermissionError ? (
                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertCircle size={15} />
                    <span>Camera Permission Needed</span>
                  </div>
                  <p className="leading-relaxed">
                    {cameraPermissionError}
                  </p>
                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={requestCameras}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition"
                    >
                      Retry Camera Request
                    </button>
                    <button 
                      onClick={() => setActiveTab("sandbox")}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded font-bold hover:bg-slate-950 transition"
                    >
                      Use Demo Simulator
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Camera selector & controls */}
                  <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 flex-1">
                      <span className="text-[10px] uppercase text-slate-400 font-bold shrink-0">Input Device:</span>
                      {cameraDevices.length === 0 ? (
                        <span className="text-slate-400 font-normal">Detecting cameras...</span>
                      ) : (
                        <select
                          value={selectedCameraId}
                          onChange={(e) => setSelectedCameraId(e.target.value)}
                          className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-indigo-600 font-medium"
                        >
                          {cameraDevices.map((dev) => (
                            <option key={dev.deviceId} value={dev.deviceId}>
                              {dev.label || `Camera ${dev.deviceId.slice(0, 5)}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${isScanning ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`}></span>
                      {cameraInitStatus || "Pending initialization..."}
                    </span>
                  </div>

                  {/* HTML5 QR Code Mount Div */}
                  <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col items-center justify-center">
                    <div id={scanRegionId} className="absolute inset-0 w-full h-full object-cover"></div>
                    
                    {!isScanning && (
                      <div className="z-10 text-center space-y-2 p-6">
                        <Camera size={36} className="mx-auto text-slate-600 animate-bounce" />
                        <p className="text-xs font-semibold text-slate-400">Camera Feed Dormant</p>
                        <p className="text-[11px] text-slate-500">Select a camera device above to initialize streaming decoding.</p>
                      </div>
                    )}

                    {isScanning && (
                      <div className="absolute inset-0 border-2 border-indigo-500/30 pointer-events-none flex items-center justify-center">
                        <div className="h-48 w-48 border-2 border-indigo-400 rounded-lg bg-indigo-500/5 animate-pulse relative flex items-center justify-center">
                          <span className="absolute inset-x-0 h-[1.5px] bg-indigo-400 animate-bounce top-0"></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Upload File View */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 relative ${
                  dragActive ? "border-indigo-600 bg-indigo-50/50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {uploadedFilePreview ? (
                  <div className="space-y-2 z-10">
                    <img 
                      src={uploadedFilePreview} 
                      alt="Uploaded tag preview" 
                      className="h-28 mx-auto object-contain rounded-md border border-slate-200"
                    />
                    <p className="text-xs font-bold text-slate-700 truncate max-w-xs">{uploadedFile?.name}</p>
                    <p className="text-[10px] text-slate-400">Click or drag another image to re-scan</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-slate-400" />
                    <div className="text-xs font-semibold text-slate-600">
                      Drag & Drop Asset Tag Photo or <span className="text-indigo-600 hover:underline">Browse files</span>
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-xs">
                      Supports JPG, PNG, and WebP containing clear QR tags or barcode stickers.
                    </p>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[11px] rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{uploadError}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Sandbox simulation panel */}
          {activeTab === "sandbox" && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl text-xs flex items-start gap-2">
                <HelpCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-900">Sandbox Code Emulator</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Test the lookup routing workflow immediately! Select any asset from our live portfolio below to emulate a successful scanner decode instantly.
                  </p>
                </div>
              </div>

              <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {assets.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No assets registered yet. Wipe or seed database to test.</p>
                ) : (
                  assets.map(asset => (
                    <div 
                      key={asset.id}
                      onClick={() => handleScanSuccess(asset.tag)}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Tag size={12} className="text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800">{asset.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">S/N: {asset.serialNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded">
                          {asset.tag}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          asset.status === AssetStatus.AVAILABLE ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {asset.status}
                        </span>
                        <ChevronRight size={13} className="text-slate-300" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Manual Keyboard Input Option */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 items-center border-t border-slate-100 pt-4 shrink-0">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Keyboard size={13} />
              <span>Or type manual Tag/Serial:</span>
            </div>
            <input 
              type="text" 
              placeholder="e.g. AF-0001, DLX234234..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-indigo-600 text-slate-800"
            />
            <button 
              type="submit"
              className="px-3 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Search code
            </button>
          </form>

          {/* RESULTS AREA */}
          <div className="border-t border-slate-100 pt-4">
            {scannedResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Scanned Result</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    "{scannedResult}"
                  </span>
                </div>

                {searching ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs font-medium text-slate-400">
                    <RefreshCw size={14} className="animate-spin text-indigo-600" />
                    <span>Searching corporate registry...</span>
                  </div>
                ) : matchedAsset ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                    
                    {/* Matched Asset Detail */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Laptop size={18} />
                        </div>
                        <div>
                          <h4 className="font-sans font-bold text-slate-900 text-xs">
                            {matchedAsset.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Tag: <span className="font-mono text-slate-600 font-bold">{matchedAsset.tag}</span> • S/N: {matchedAsset.serialNumber}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin size={10} />
                            <span>Location: {matchedAsset.location}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          matchedAsset.status === AssetStatus.AVAILABLE
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : matchedAsset.status === AssetStatus.ALLOCATED
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {matchedAsset.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          Cond: {matchedAsset.condition}
                        </span>
                      </div>
                    </div>

                    {/* Actions Hub */}
                    <div className="border-t border-slate-200/50 pt-3.5 space-y-2">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Fast-Launch Action Menu</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        
                        <button
                          onClick={() => onAction("view", matchedAsset)}
                          className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-bold transition flex items-center justify-between cursor-pointer group"
                        >
                          <span className="flex items-center gap-1.5">
                            <ClipboardCheck size={13} className="text-slate-400" />
                            <span>View Asset Profile</span>
                          </span>
                          <ArrowUpRight size={12} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                        </button>

                        {/* Checkout or return option depending on status */}
                        {matchedAsset.status === AssetStatus.AVAILABLE ? (
                          <button
                            onClick={() => onAction("checkout", matchedAsset)}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center gap-1.5">
                              <ArrowLeftRight size={13} />
                              <span>Check-Out / Allocate</span>
                            </span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
                          </button>
                        ) : matchedAsset.status === AssetStatus.ALLOCATED ? (
                          <button
                            onClick={() => onAction("return", matchedAsset)}
                            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center gap-1.5">
                              <ClipboardCheck size={13} />
                              <span>Process Return</span>
                            </span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
                          </button>
                        ) : (
                          <div className="p-2.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-bold flex items-center justify-between cursor-not-allowed">
                            <span className="flex items-center gap-1.5">
                              <ArrowLeftRight size={13} />
                              <span>Unavailable for allocation</span>
                            </span>
                          </div>
                        )}

                        {/* Transfer option (only for allocated assets) */}
                        {matchedAsset.status === AssetStatus.ALLOCATED ? (
                          <button
                            onClick={() => onAction("transfer", matchedAsset)}
                            className="p-2.5 bg-white hover:bg-slate-100 text-indigo-600 rounded-lg border border-slate-200 font-bold transition flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center gap-1.5">
                              <ArrowLeftRight size={13} className="text-indigo-500" />
                              <span>Request Custody Transfer</span>
                            </span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
                          </button>
                        ) : (
                          <div className="p-2.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-bold flex items-center justify-between cursor-not-allowed" title="Asset must be currently allocated to transfer custody">
                            <span className="flex items-center gap-1.5">
                              <ArrowLeftRight size={13} />
                              <span>Direct Allocation Only</span>
                            </span>
                          </div>
                        )}

                        {/* Maintenance option */}
                        <button
                          onClick={() => onAction("maintenance", matchedAsset)}
                          className="p-2.5 bg-white hover:bg-rose-50 text-rose-700 rounded-lg border border-slate-200 font-bold transition flex items-center justify-between cursor-pointer group"
                        >
                          <span className="flex items-center gap-1.5">
                            <Wrench size={13} className="text-rose-500" />
                            <span>Report Fault / Repair</span>
                          </span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition" />
                        </button>

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2 text-xs">
                      <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">Tag / Serial Not Found</p>
                        <p className="text-slate-500 mt-0.5 leading-relaxed">
                          The code <strong className="font-mono text-slate-700">"{scannedResult}"</strong> does not correspond to any physical hardware registered in the AssetFlow registry.
                        </p>
                      </div>
                    </div>

                    {isManager && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => onAction("register", null, scannedResult)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Register New Asset with Tag</span>
                          <ArrowUpRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-medium">
          <span>Camera Access Status: {isScanning ? "Active stream" : "Idle"}</span>
          <span>Powered by Html5Qrcode Reader API</span>
        </div>

      </div>
    </div>
  );
}
