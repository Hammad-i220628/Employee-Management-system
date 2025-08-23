import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X } from 'lucide-react';

interface ReliableBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const ReliableBarcodeScanner: React.FC<ReliableBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState('idle');
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setupCamera();
    } else {
      cleanup();
    }
    return cleanup;
  }, [isOpen]);

  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setStatus('idle');
    setError('');
    setScanStatus('idle');
    setIsScanning(false);
  }, [stream]);

  const setupCamera = async () => {
    try {
      setStatus('requesting');
      setError('');
      
      console.log('Setting up camera...');
      
      // Try different camera constraints
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          }
        });
        console.log('Using environment camera');
      } catch (envError) {
        console.log('Environment camera failed, trying user camera');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          }
        });
      }
      
      setStream(mediaStream);
      setStatus('connecting');
      
      setTimeout(async () => {
        const video = videoRef.current;
        if (video && mediaStream) {
          video.srcObject = mediaStream;
          
          try {
            await video.play();
            setStatus('ready');
            console.log('Video playing, starting scan');
            startScanning();
          } catch (playError) {
            console.error('Video play error:', playError);
            setStatus('ready');
            startScanning();
          }
        }
      }, 1000);
      
    } catch (err: any) {
      console.error('Camera error:', err);
      setStatus('error');
      setError(`Camera error: ${err.message}`);
    }
  };

  const startScanning = () => {
    setScanStatus('scanning');
    setIsScanning(true);
    
    // Use canvas to capture video frames and try to detect patterns
    scanIntervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 500); // Check every 500ms
  };

  const captureAndAnalyze = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple barcode detection (looking for vertical line patterns)
    // This is a basic implementation - you might want to use a more sophisticated approach
    const detectedBarcode = analyzeImageForBarcode(imageData);
    if (detectedBarcode) {
      console.log('Barcode detected:', detectedBarcode);
      setScanStatus('found');
      onScan(detectedBarcode);
      onClose();
    }
  };

  // Simple barcode analysis (basic pattern detection)
  const analyzeImageForBarcode = (imageData: ImageData): string | null => {
    // This is a very basic example - in reality you'd need more sophisticated analysis
    // For now, we'll just return null to force manual entry
    // You could implement basic line detection here or integrate a different barcode library
    
    // Look for high contrast vertical patterns that might indicate a barcode
    const { data, width, height } = imageData;
    let lineCount = 0;
    
    // Sample the center horizontal line for vertical patterns
    const centerY = Math.floor(height / 2);
    let lastBrightness = 0;
    let transitionCount = 0;
    
    for (let x = 0; x < width; x += 4) { // Sample every 4 pixels
      const pixelIndex = (centerY * width + x) * 4;
      const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
      
      if (Math.abs(brightness - lastBrightness) > 50) { // Significant brightness change
        transitionCount++;
      }
      lastBrightness = brightness;
    }
    
    // If we detect many transitions (suggesting barcode-like patterns), we could trigger detection
    // For now, return null to use manual entry
    console.log(`Detected ${transitionCount} transitions - might be barcode pattern`);
    
    return null; // Return null for now, forcing manual entry
  };

  const handleManualScan = () => {
    const barcode = prompt(`Enter the barcode for ${employeeName}:`);
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleRetry = () => {
    cleanup();
    setTimeout(setupCamera, 500);
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
        
        {scanStatus === 'scanning' && (
          <div className="p-3 bg-blue-100 text-blue-700 rounded">
            📱 Scanning for barcodes... Position barcode in the center area
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
          
          {/* Hidden canvas for image analysis */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          
          {status !== 'ready' && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {status === 'idle' && 'Initializing...'}
                  {status === 'requesting' && 'Requesting camera permission...'}
                  {status === 'connecting' && 'Starting camera...'}
                  {status === 'error' && 'Camera failed to start'}
                </p>
              </div>
            </div>
          )}
          
          {/* Scanning overlay */}
          {status === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed w-64 h-20 rounded-lg bg-black bg-opacity-20">
                <div className="flex items-center justify-center h-full text-white text-sm">
                  {isScanning ? 'Scanning...' : 'Position barcode here'}
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
            <li>Position it clearly in the scanning area</li>
            <li>Use "Enter Barcode" button to type the code manually</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button onClick={handleManualScan} className="bg-blue-600 hover:bg-blue-700">
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
