import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X, Scan } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface WorkingCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const WorkingCameraScanner: React.FC<WorkingCameraScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState('idle');
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setupCamera();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen]);

  const cleanup = () => {
    // Stop barcode scanning
    if (scannerRef.current) {
      scannerRef.current.reset();
      scannerRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setStatus('idle');
    setError('');
    setScanStatus('idle');
  };

  const setupCamera = async () => {
    try {
      setStatus('requesting');
      setError('');
      
      console.log('Requesting camera access...');
      
      let mediaStream;
      try {
        // Try with environment camera first (back camera)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        console.log('Using environment camera');
      } catch (envError) {
        console.log('Environment camera not available, trying user camera:', envError.message);
        // Fallback to user camera (front camera)
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          console.log('Using user camera');
        } catch (userError) {
          console.log('User camera failed, trying basic video:', userError.message);
          // Final fallback to basic video
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          console.log('Using basic video');
        }
      }
      
      console.log('Camera stream obtained:', mediaStream);
      setStream(mediaStream);
      setStatus('connecting');
      
      // Wait for video element to be ready
      setTimeout(async () => {
        const video = videoRef.current;
        if (video && mediaStream) {
          console.log('Setting video source...');
          video.srcObject = mediaStream;
          
          // Wait for video metadata to load
          video.onloadedmetadata = () => {
            console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
          };
          
          try {
            await video.play();
            setStatus('ready');
            console.log('Video is now playing');
            
            // Wait a bit more before starting scanning to ensure video is stable
            setTimeout(() => {
              startBarcodeScanning();
            }, 1500);
          } catch (playError) {
            console.error('Play error:', playError);
            setStatus('ready'); // Still mark as ready
            
            // Still try to start scanning
            setTimeout(() => {
              startBarcodeScanning();
            }, 1500);
          }
        } else {
          console.error('Video element or stream not available');
          setError('Video setup failed');
          setStatus('error');
        }
      }, 1000);
      
    } catch (err: any) {
      console.error('Camera setup error:', err);
      setStatus('error');
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  const handleScan = () => {
    const barcode = prompt(`Enter the barcode from ${employeeName}'s card:`);
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  const startBarcodeScanning = async () => {
    try {
      setScanStatus('initializing');
      console.log('Starting barcode scanning...');
      
      const video = videoRef.current;
      if (!video) {
        console.error('Video element not available for scanning');
        setScanStatus('error');
        return;
      }
      
      // Initialize the scanner
      scannerRef.current = new BrowserMultiFormatReader();
      setScanStatus('scanning');
      
      console.log('Starting continuous decode from video element');
      
      // Start continuous scanning
      scannerRef.current.decodeFromVideoElement(video, (result, error) => {
        if (result) {
          const now = Date.now();
          // Prevent duplicate scans within 2 seconds
          if (now - lastScanTime > 2000) {
            console.log('Barcode detected:', result.getText());
            setLastScanTime(now);
            setScanStatus('found');
            
            // Call the onScan callback with the detected barcode
            onScan(result.getText());
            onClose();
          }
        }
        if (error && error.name !== 'NotFoundException') {
          console.log('Scan error (non-critical):', error.message);
        }
      });
      
    } catch (err: any) {
      console.error('Barcode scanning setup error:', err);
      setScanStatus('error');
      setError(`Scanning error: ${err.message}`);
    }
  };

  const handleRetry = () => {
    cleanup();
    setTimeout(setupCamera, 500);
  };
  
  const testScan = () => {
    // Test with a known barcode value
    console.log('Testing scan with sample barcode');
    onScan('TEST123456789');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Employee Card - ${employeeName || 'Employee'}`}>
      <div className="space-y-4">
        
        {/* Status Display */}
        {status === 'requesting' && (
          <div className="p-3 bg-blue-100 text-blue-700 rounded">
            🔍 Requesting camera access...
          </div>
        )}
        
        {status === 'connecting' && (
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded">
            📹 Connecting to camera...
          </div>
        )}
        
        {status === 'ready' && scanStatus === 'idle' && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            ✅ Camera is ready!
          </div>
        )}
        
        {scanStatus === 'initializing' && (
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded">
            🔧 Initializing barcode scanner...
          </div>
        )}
        
        {scanStatus === 'scanning' && (
          <div className="p-3 bg-blue-100 text-blue-700 rounded">
            📱 Scanning for barcodes... Point your barcode at the camera!
          </div>
        )}
        
        {scanStatus === 'found' && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            🎉 Barcode detected! Processing...
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            ❌ {error}
            <Button onClick={handleRetry} size="sm" className="ml-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Video Area */}
        <div className="relative bg-black rounded-lg overflow-hidden h-80">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ 
              display: status === 'ready' ? 'block' : 'none'
            }}
          />
          
          {status !== 'ready' && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {status === 'idle' && 'Click retry to start camera'}
                  {status === 'requesting' && 'Requesting camera permission...'}
                  {status === 'connecting' && 'Starting camera...'}
                  {status === 'error' && 'Camera failed to start'}
                </p>
              </div>
            </div>
          )}
          
          {/* Overlay when camera is ready */}
          {status === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed w-64 h-20 rounded-lg bg-black bg-opacity-20">
                <div className="flex items-center justify-center h-full text-white text-sm">
                  Position barcode here
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to scan:</h4>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Hold the employee barcode card steady</li>
            <li>Position it in the scanning area above</li>
            <li>Click "Enter Barcode" to manually type it</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button onClick={handleScan} className="bg-blue-600 hover:bg-blue-700">
            📝 Enter Barcode
          </Button>
          
          <div className="flex space-x-3">
            {status === 'error' && (
              <Button onClick={handleRetry} variant="outline">
                🔄 Retry
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
