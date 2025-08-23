import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X, Scan } from 'lucide-react';

interface SimpleBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  useEffect(() => {
    if (isOpen) {
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    addDebugInfo('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        addDebugInfo(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
    setCameraStatus('idle');
    setError('');
  };

  const waitForVideoElement = (): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      
      const checkElement = () => {
        attempts++;
        addDebugInfo(`Checking for video element (attempt ${attempts})...`);
        
        if (videoRef.current) {
          addDebugInfo('Video element found!');
          resolve(videoRef.current);
        } else if (attempts >= maxAttempts) {
          addDebugInfo('Video element not found after timeout');
          reject(new Error('Video element not found after timeout'));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  };

  const startCamera = async () => {
    try {
      addDebugInfo('Starting camera...');
      setError('');
      setCameraStatus('loading');

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Check secure context
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      addDebugInfo(`Secure context: ${isSecure}`);

      // Wait for video element to be available
      addDebugInfo('Waiting for video element...');
      const videoElement = await waitForVideoElement();
      addDebugInfo('Video element ready, requesting camera access...');

      // Request camera access with constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 }
        },
        audio: false
      };

      addDebugInfo('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      addDebugInfo('Camera access granted');

      // Get camera info
      const tracks = stream.getVideoTracks();
      if (tracks.length > 0) {
        const track = tracks[0];
        const settings = track.getSettings();
        addDebugInfo(`Camera: ${track.label}`);
        addDebugInfo(`Resolution: ${settings.width}x${settings.height}`);
      }

      // Set stream to video element
      videoElement.srcObject = stream;
      addDebugInfo('Stream assigned to video element');
      
      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          addDebugInfo('Video metadata loaded');
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e: Event) => {
          addDebugInfo(`Video error: ${e}`);
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          reject(new Error('Video loading failed'));
        };
        
        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('error', onError);
        
        // Try to play the video
        videoElement.play().catch(playErr => {
          addDebugInfo(`Video play error: ${playErr.message}`);
          // Don't reject here, play might fail but video can still work
        });
      });

      setCameraStatus('ready');
      addDebugInfo('Camera ready!');

    } catch (err: any) {
      addDebugInfo(`Camera error: ${err.message}`);
      setCameraStatus('error');
      
      let errorMessage = 'Camera failed: ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else if (err.name === 'SecurityError') {
        errorMessage += 'Security error. Use HTTPS or localhost.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleManualInput = () => {
    const barcode = prompt(`Enter barcode for ${employeeName || 'employee'}:`);
    if (barcode && barcode.trim()) {
      addDebugInfo(`Manual entry: ${barcode.trim()}`);
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleRetry = () => {
    addDebugInfo('Retrying camera...');
    stopCamera();
    setTimeout(startCamera, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Barcode${employeeName ? ` - ${employeeName}` : ''}`}>
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex justify-between items-start">
              <span>{error}</span>
              <Button size="sm" onClick={handleRetry} className="ml-2">
                Retry
              </Button>
            </div>
          </div>
        )}

        {cameraStatus === 'loading' && (
          <div className="p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded">
            <div className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Starting camera...
            </div>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
          {cameraStatus === 'ready' ? (
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
                <div className="border-2 border-white border-dashed w-64 h-32 rounded-lg flex items-center justify-center bg-black bg-opacity-30">
                  <div className="text-white text-center">
                    <Scan className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Position barcode here</p>
                    <p className="text-xs mt-2">Camera is ready!</p>
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
          <Button variant="outline" onClick={handleManualInput}>
            Enter Manually
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleManualInput}
              disabled={cameraStatus !== 'ready'}
              className="flex items-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>Scan (Manual)</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs"
            >
              Debug
            </Button>
            
            <Button variant="outline" onClick={onClose}>
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
              <div>URL: {window.location.href}</div>
              <div>User Agent: {navigator.userAgent.substring(0, 50)}...</div>
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
            <li>Click "Scan (Manual)" to enter barcode manually</li>
            <li>The camera preview should show if working correctly</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
