import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X, Scan, AlertCircle } from 'lucide-react';

interface UltraSimpleScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const UltraSimpleScanner: React.FC<UltraSimpleScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCameraSimple();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraReady(false);
    setPermissionGranted(false);
  };

  const startCameraSimple = async () => {
    try {
      setError('');
      console.log('Starting camera...');
      
      // Request camera with basic constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      console.log('Got media stream:', mediaStream);
      setStream(mediaStream);
      setPermissionGranted(true);
      
      // Wait for video element and assign stream
      await new Promise<void>((resolve) => {
        const assignVideo = () => {
          if (videoRef.current) {
            console.log('Assigning stream to video element');
            videoRef.current.srcObject = mediaStream;
            
            videoRef.current.onloadedmetadata = () => {
              console.log('Video metadata loaded');
              videoRef.current!.play().then(() => {
                console.log('Video playing');
                setCameraReady(true);
                resolve();
              }).catch(err => {
                console.error('Video play error:', err);
                setCameraReady(true); // Still set ready even if play fails
                resolve();
              });
            };
            
            videoRef.current.onerror = (e) => {
              console.error('Video error:', e);
              setCameraReady(true); // Set ready anyway
              resolve();
            };
          } else {
            console.log('Video element not ready, retrying...');
            setTimeout(assignVideo, 100);
          }
        };
        
        assignVideo();
      });
      
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMsg = 'Camera access failed: ';
      
      if (err.name === 'NotAllowedError') {
        errorMsg += 'Please allow camera permission';
      } else if (err.name === 'NotFoundError') {
        errorMsg += 'No camera found';
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleManualScan = () => {
    const barcode = prompt(`Enter the barcode from the card for ${employeeName || 'employee'}:`);
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleRetry = () => {
    stopCamera();
    setTimeout(startCameraSimple, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Employee Card${employeeName ? ` - ${employeeName}` : ''}`}>
      <div className="space-y-4">
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button size="sm" onClick={handleRetry} variant="outline" className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {/* Permission Status */}
        {permissionGranted && !error && (
          <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            ✅ Camera permission granted
          </div>
        )}

        {/* Camera Display */}
        <div className="relative bg-black rounded-lg overflow-hidden h-80">
          {cameraReady && !error ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
              />
              
              {/* Scan area overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed w-60 h-24 rounded-lg bg-black bg-opacity-20">
                  <div className="flex items-center justify-center h-full text-white text-sm">
                    📱 Position barcode here
                  </div>
                </div>
              </div>
              
              {/* Camera ready indicator */}
              <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded text-xs">
                📹 Camera Ready
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white">
              <Camera className="w-16 h-16 mb-4 opacity-70" />
              <p className="text-center">
                {error ? 'Camera initialization failed' : 'Initializing camera...'}
              </p>
              {error && (
                <p className="text-sm text-gray-300 mt-2">
                  Use manual entry below
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Allow camera access when prompted</li>
            <li>Hold the employee's barcode card steady</li>
            <li>Position the barcode in the scanning area</li>
            <li>Click "Manual Entry" to type the barcode</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            onClick={handleManualScan}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Scan className="w-4 h-4" />
            <span>Manual Entry</span>
          </Button>
          
          <div className="flex space-x-3">
            {cameraReady && (
              <Button
                onClick={handleManualScan}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Scan className="w-4 h-4" />
                <span>Scan Now</span>
              </Button>
            )}
            
            <Button onClick={onClose} variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
