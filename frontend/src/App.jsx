import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Image } from 'lucide-react';

const API_URL = 'https://fuzzy-orbit-jjw99vwrj5rcq945-3001.app.github.dev/api';

const PRESETS = {
  custom: { label: "Custom", width: 0, height: 0, minKb: 0, maxKb: 0, format: "jpg" },
  photo: { label: "Photograph", width: 200, height: 230, minKb: 20, maxKb: 50, format: "jpg" },
  signature: { label: "Signature", width: 140, height: 60, minKb: 10, maxKb: 20, format: "jpg" },
  thumb: { label: "Thumb Impression", width: 140, height: 60, minKb: 20, maxKb: 50, format: "jpg" },
  declaration: { label: "Handwritten Declaration", width: 800, height: 300, minKb: 50, maxKb: 100, format: "jpg" }
};



export default function ImageResizerApp() {
  const [selectedPreset, setSelectedPreset] = useState('photo');
  const [customRule, setCustomRule] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [useBackend, setUseBackend] = useState(true);

  const getCurrentRules = () => {
    if (selectedPreset === 'custom' && customRule) {
      return parseCustomRule(customRule);
    }
    return PRESETS[selectedPreset];
  };

  const parseCustomRule = (text) => {
    const widthMatch = text.match(/(\d+)\s*x\s*(\d+)/i) || text.match(/width[:\s]+(\d+).*height[:\s]+(\d+)/i);
    const sizeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*kb/i) || text.match(/size[:\s]+(\d+).*?(\d+)\s*kb/i);
    const formatMatch = text.match(/\b(jpg|jpeg|png)\b/i);

    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 200,
      height: widthMatch ? parseInt(widthMatch[2]) : 230,
      minKb: sizeMatch ? parseInt(sizeMatch[1]) : 20,
      maxKb: sizeMatch ? parseInt(sizeMatch[2]) : 50,
      format: formatMatch ? formatMatch[1].toLowerCase() : 'jpg'
    };
  };

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG)');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setOriginalImage(e.target.result);
    reader.readAsDataURL(file);
    setProcessedImage(null);
    setResult(null);
    setError(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const processWithBackend = async () => {
    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('preset', selectedPreset);
      formData.append('ruleText', customRule);

      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Backend processing failed');
      }

      const data = await response.json();

      setProcessedImage(data.imageBase64);
      setResult({
        width: data.width,
        height: data.height,
        sizeKb: data.fileSizeKb.toFixed(2),
        format: data.format,
        valid: data.valid,
        blob: null
      });
    } catch (err) {
      setError('Failed to connect to backend. Using client-side processing instead.');
      await processClientSide();
    } finally {
      setProcessing(false);
    }
  };

  const processClientSide = async () => {
    if (!uploadedFile || !originalImage) return;

    setProcessing(true);
    const rules = getCurrentRules();

    try {
      const img = new window.Image();
      img.src = originalImage;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = rules.width;
      canvas.height = rules.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, rules.width, rules.height);

      let quality = 0.92;
      let blob = null;
      let attempts = 0;

      while (attempts < 15) {
        blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, `image/${rules.format === 'jpg' ? 'jpeg' : rules.format}`, quality);
        });

        const sizeKb = blob.size / 1024;

        if (sizeKb <= rules.maxKb && sizeKb >= rules.minKb) {
          break;
        }

        if (sizeKb > rules.maxKb) {
          quality -= 0.05;
        } else {
          quality += 0.02;
        }

        quality = Math.max(0.1, Math.min(1, quality));
        attempts++;
      }

      const finalSizeKb = blob.size / 1024;
      const processedUrl = URL.createObjectURL(blob);
      setProcessedImage(processedUrl);

      setResult({
        width: rules.width,
        height: rules.height,
        sizeKb: finalSizeKb.toFixed(2),
        format: rules.format.toUpperCase(),
        valid: finalSizeKb <= rules.maxKb && finalSizeKb >= rules.minKb,
        blob
      });
    } catch (err) {
      setError('Error processing image: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const processImage = async () => {
    if (useBackend) {
      await processWithBackend();
    } else {
      await processClientSide();
    }
  };

  const downloadImage = () => {
    if (!result) return;

    if (result.blob) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resized_${selectedPreset}_${Date.now()}.${result.format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (processedImage && processedImage.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = processedImage;
      a.download = `resized_${selectedPreset}_${Date.now()}.${result.format.toLowerCase()}`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 AI Image Resizer & Validator</h1>
          <p className="text-gray-600">Resize images for government portals (SSC, UPSC, IBPS, GATE, etc.)</p>
          
          <div className="mt-4 flex items-center justify-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useBackend}
                onChange={(e) => setUseBackend(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Use Backend API (better quality)</span>
            </label>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Step 1: Select Rules
              </h2>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Preset
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.label}</option>
                ))}
              </select>

              {selectedPreset === 'custom' && (
                <textarea
                  value={customRule}
                  onChange={(e) => setCustomRule(e.target.value)}
                  placeholder="e.g., Dimensions 200x230 pixels, size 20-50KB, JPG format"
                  className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">Current Specs:</p>
                {(() => {
                  const rules = getCurrentRules();
                  return (
                    <ul className="space-y-1 text-blue-800">
                      <li>📐 Dimensions: {rules.width}×{rules.height}px</li>
                      <li>📦 Size: {rules.minKb}–{rules.maxKb}KB</li>
                      <li>📄 Format: {rules.format.toUpperCase()}</li>
                    </ul>
                  );
                })()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Step 2: Upload Image
              </h2>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">Drag & drop your image here</p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  Browse Files
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {uploadedFile && (
                  <p className="mt-4 text-sm text-green-600">✓ {uploadedFile.name}</p>
                )}
              </div>

              {originalImage && (
                <button
                  onClick={processImage}
                  disabled={processing}
                  className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {processing ? 'Processing...' : '🚀 Process Image'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {result && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">✅ Validation Results</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Dimensions</span>
                    <span className="font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {result.width}×{result.height}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">File Size</span>
                    <span className="font-medium flex items-center gap-2">
                      {result.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      {result.sizeKb}KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Format</span>
                    <span className="font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {result.format}
                    </span>
                  </div>
                </div>

                <button
                  onClick={downloadImage}
                  className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="w-5 h-5" />
                  Download Resized Image
                </button>
              </div>
            )}

            {(originalImage || processedImage) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">🖼 Preview</h2>
                
                <div className="space-y-4">
                  {originalImage && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Original</p>
                      <img src={originalImage} alt="Original" className="w-full rounded border" />
                    </div>
                  )}
                  
                  {processedImage && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Resized</p>
                      <img src={processedImage} alt="Processed" className="w-full rounded border" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}