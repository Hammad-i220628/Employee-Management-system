import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X, Scan } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'loading' | 'ready' | 'scanning' | 'error'>('idle');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    addDebugInfo('Cleaning up scanner resources');
    setIsScanning(false);
    if (readerRef.current) {
      try {
        readerRef.current.reset();
        addDebugInfo('ZXing reader reset');
      } catch (err) {
        console.error('Error resetting reader:', err);
      }
    }
    setCameraStatus('idle');
    setError('');
  };

  const waitForVideoElement = (): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const checkVideo = () => {
        if (videoRef.current) {
          addDebugInfo('Video element found');
          resolve(videoRef.current);
        } else {
          addDebugInfo('Waiting for video element...');
          setTimeout(checkVideo, 100);
        }
      };
      
      // Start checking immediately
      checkVideo();
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!videoRef.current) {
          reject(new Error('Video element not available after timeout'));
        }
      }, 5000);
    });
  };

  const initializeScanner = async () => {
    try {
      addDebugInfo('Initializing ZXing scanner...');
      setError('');
      setCameraStatus('loading');
      
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Check security context
      const isSecureContext = window.isSecureContext || 
                             window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        addDebugInfo('Warning: Camera requires secure context (HTTPS/localhost)');
      }

      // Wait for video element to be available
      const videoElement = await waitForVideoElement();
      
      // Initialize ZXing reader
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
        addDebugInfo('ZXing reader created');
      }

      // Get video devices
      const videoDevices = await readerRef.current.listVideoInputDevices();
      addDebugInfo(`Found ${videoDevices.length} video device(s)`);
      setDevices(videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Select device (prefer back camera if available)
      let deviceId = videoDevices[0].deviceId;
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        deviceId = backCamera.deviceId;
        addDebugInfo(`Using back camera: ${backCamera.label}`);
      } else {
        addDebugInfo(`Using default camera: ${videoDevices[0].label}`);
      }
      
      setSelectedDeviceId(deviceId);

      // Start camera preview with proper error handling
      try {
        addDebugInfo('Starting camera preview...');
        await readerRef.current.decodeFromVideoDevice(
          deviceId, 
          videoElement,
          (result, error) => {
            // This is the callback for continuous scanning
            // We'll handle results in the startScanning function instead
            if (result) {
              addDebugInfo(`Continuous scan result: ${result.getText()}`);
            }
          }
        );
        
        // Wait a bit for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCameraStatus('ready');
        addDebugInfo('Camera preview started successfully');
        
      } catch (previewErr: any) {
        addDebugInfo(`Preview error: ${previewErr.message}`);
        throw previewErr;
      }

    } catch (err: any) {
      addDebugInfo(`Scanner initialization failed: ${err.message}`);
      setCameraStatus('error');
      
      let errorMessage = 'Camera access failed: ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else if (err.name === 'SecurityError') {
        errorMessage += 'Security error. Use HTTPS or localhost.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || cameraStatus !== 'ready') {
      addDebugInfo('Cannot start scanning - not ready');
      return;
    }

    try {
      addDebugInfo('Starting barcode scan...');
      setIsScanning(true);
      setCameraStatus('scanning');
      
      // Start continuous scanning
      const result = await readerRef.current.decodeOnceFromVideoDevice(
        selectedDeviceId, 
        videoRef.current
      );
      
      if (result) {
        addDebugInfo(`Barcode detected: ${result.getText()}`);
        onScan(result.getText());
        onClose();
      }
      
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        addDebugInfo('No barcode found in current frame');
        // For manual entry as fallback
        const manualCode = prompt('No barcode detected. Enter barcode manually:');
        if (manualCode && manualCode.trim()) {
          addDebugInfo(`Manual entry: ${manualCode}`);
          onScan(manualCode.trim());
          onClose();
        }
      } else {
        addDebugInfo(`Scan error: ${err.message}`);
        setError(`Scanning failed: ${err.message}`);
      }
    } finally {
      setIsScanning(false);
      setCameraStatus('ready');
    }
  };

  const handleManualInput = () => {
    const barcode = prompt(`Enter barcode for ${employeeName || 'employee'}:`);
    if (barcode && barcode.trim()) {
      addDebugInfo(`Manual barcode entry: ${barcode}`);
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleRetry = () => {
    addDebugInfo('Retrying scanner initialization');
    cleanup();
    setTimeout(initializeScanner, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Barcode${employeeName ? ` - ${employeeName}` : ''}`}>
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex justify-between items-start">
              <span>{error}</span>
              {cameraStatus === 'error' && (
                <Button size="sm" onClick={handleRetry} className="ml-2">
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Camera Status Info */}
        {cameraStatus === 'loading' && (
          <div className="p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded">
            <div className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Initializing camera...
            </div>
          </div>
        )}

        {cameraStatus === 'scanning' && (
          <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            <div className="flex items-center">
              <div className="animate-pulse w-4 h-4 bg-green-600 rounded-full mr-2"></div>
              Scanning for barcode...
            </div>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
          {cameraStatus === 'ready' || cameraStatus === 'scanning' ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border-2 border-dashed w-64 h-32 rounded-lg flex items-center justify-center bg-black bg-opacity-30 ${
                  cameraStatus === 'scanning' ? 'border-green-400 animate-pulse' : 'border-white'
                }`}>
                  <div className="text-white text-center">
                    <Scan className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">
                      {cameraStatus === 'scanning' ? 'Scanning...' : 'Position barcode here'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {cameraStatus === 'loading' ? 'Starting camera...' : 
                   cameraStatus === 'error' ? 'Camera failed to start' : 'Camera not ready'}
                </p>
                {cameraStatus === 'error' && (
                  <Button onClick={handleRetry} className="mt-4">
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleManualInput}
          >
            Enter Manually
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={startScanning}
              disabled={cameraStatus !== 'ready' || isScanning}
              className="flex items-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Scan Barcode'}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs"
            >
              Debug
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Debug Information */}
        {showDebug && (
          <div className="p-3 bg-gray-100 border rounded text-xs">
            <h4 className="font-semibold mb-2">Debug Information:</h4>
            <div className="space-y-1">
              <div>Status: {cameraStatus}</div>
              <div>Secure Context: {window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'Yes' : 'No'}</div>
              <div>URL: {window.location.href}</div>
              {debugInfo.length > 0 && (
                <>
                  <hr className="my-2" />
                  <div className="max-h-32 overflow-y-auto">
                    {debugInfo.map((info, index) => (
                      <div key={index} className="text-gray-600">{info}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Allow camera permission when prompted</li>
            <li>Position the barcode card in the scanning area</li>
            <li>Click "Capture & Scan" or tap the camera view</li>
            <li>Enter the barcode value when prompted</li>
            <li>Use "Enter Manually" if camera doesn't work</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
