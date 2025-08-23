import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X, Scan, AlertCircle, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface OptimizedBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const OptimizedBarcodeScanner: React.FC<OptimizedBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScanResult, setLastScanResult] = useState('');

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up scanner resources');
    
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Reset ZXing reader
    if (readerRef.current) {
      try {
        readerRef.current.reset();
        console.log('✅ ZXing reader reset');
      } catch (err) {
        console.warn('⚠️ Error resetting reader:', err);
      }
      readerRef.current = null;
    }

    // Reset state
    setIsInitialized(false);
    setIsScanning(false);
    setCameraStatus('idle');
    setScanAttempts(0);
    setError('');
  }, []);

  // Initialize camera and scanner
  const initializeScanner = useCallback(async () => {
    try {
      console.log('🎥 Initializing barcode scanner');
      setCameraStatus('initializing');
      setError('');

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Wait for video element to be available
      await new Promise<void>((resolve, reject) => {
        const checkVideo = () => {
          if (videoRef.current) {
            console.log('📹 Video element is ready');
            resolve();
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Video element not available')), 5000);
      });

      // Initialize ZXing reader
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
        console.log('📱 ZXing reader created');
      }

      // Get available video devices
      const videoDevices = await readerRef.current.listVideoInputDevices();
      console.log(`📸 Found ${videoDevices.length} camera device(s)`);
      setDevices(videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found. Please ensure your device has a camera and camera permissions are granted.');
      }

      // Select the best camera (prefer back camera for mobile)
      let selectedDevice = videoDevices[0];
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') || 
        device.label.toLowerCase().includes('environment')
      );

      if (backCamera) {
        selectedDevice = backCamera;
        console.log('📷 Using back camera:', selectedDevice.label);
      } else {
        console.log('📷 Using default camera:', selectedDevice.label);
      }

      setSelectedDeviceId(selectedDevice.deviceId);

      // Start video stream
      console.log('▶️ Starting video stream');
      await readerRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current!,
        (result, error) => {
          // This callback is for continuous scanning, we'll handle it differently
        }
      );

      // Wait for video to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsInitialized(true);
      setCameraStatus('ready');
      console.log('✅ Scanner initialized successfully');

    } catch (err: any) {
      console.error('❌ Scanner initialization failed:', err);
      setCameraStatus('error');
      
      let errorMessage = 'Failed to initialize camera: ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application. Please close other apps and try again.';
      } else if (err.name === 'SecurityError') {
        errorMessage += 'Security error. Please ensure you are using HTTPS or localhost.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
    }
  }, []);

  // Start continuous scanning
  const startScanning = useCallback(async () => {
    if (!readerRef.current || !videoRef.current || !isInitialized) {
      console.warn('⚠️ Cannot start scanning - scanner not ready');
      return;
    }

    console.log('🔍 Starting barcode scanning');
    setIsScanning(true);
    setScanAttempts(0);

    // Use a more aggressive scanning approach
    scanIntervalRef.current = setInterval(async () => {
      try {
        setScanAttempts(prev => prev + 1);
        
        const result = await readerRef.current!.decodeOnceFromVideoDevice(
          selectedDeviceId,
          videoRef.current!
        );

        if (result && result.getText()) {
          console.log('✅ Barcode detected:', result.getText());
          setLastScanResult(result.getText());
          
          // Stop scanning
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          
          setIsScanning(false);
          onScan(result.getText());
          onClose();
        }
        
      } catch (err) {
        if (!(err instanceof NotFoundException)) {
          console.warn('⚠️ Scanning error:', err);
        }
        // Continue scanning even if no barcode found
      }
    }, 500); // Scan every 500ms for better responsiveness

    // Stop scanning after 30 seconds with option to continue
    setTimeout(() => {
      if (scanIntervalRef.current) {
        setIsScanning(false);
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        
        // Ask user if they want to continue or enter manually
        const continueScanning = confirm(
          'No barcode detected after 30 seconds. Would you like to continue scanning? Click "Cancel" to enter the barcode manually.'
        );
        
        if (continueScanning) {
          startScanning();
        } else {
          handleManualEntry();
        }
      }
    }, 30000);

  }, [selectedDeviceId, isInitialized, onScan, onClose]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    console.log('⏹️ Stopping barcode scanning');
    setIsScanning(false);
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  // Handle manual barcode entry
  const handleManualEntry = () => {
    const barcode = prompt(
      `Enter the barcode from the ${employeeName ? employeeName + "'s" : 'employee'} card:`
    );
    
    if (barcode && barcode.trim()) {
      console.log('✏️ Manual barcode entry:', barcode);
      onScan(barcode.trim());
      onClose();
    }
  };

  // Handle retry
  const handleRetry = () => {
    cleanup();
    setTimeout(() => {
      initializeScanner();
    }, 500);
  };

  // Effect for modal open/close
  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen, initializeScanner, cleanup]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Scan Employee Badge${employeeName ? ` - ${employeeName}` : ''}`}
    >
      <div className="space-y-4">
        
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm">{error}</p>
                <Button 
                  onClick={handleRetry}
                  size="sm" 
                  className="mt-2"
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {cameraStatus === 'initializing' && (
          <div className="p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded">
            <div className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Initializing camera...
            </div>
          </div>
        )}

        {cameraStatus === 'ready' && !isScanning && (
          <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            ✅ Camera ready! Click "Start Scanning" to begin.
          </div>
        )}

        {isScanning && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="animate-pulse w-4 h-4 bg-yellow-600 rounded-full mr-2"></div>
                <span>Scanning for barcode... ({scanAttempts} attempts)</span>
              </div>
              <Button onClick={stopScanning} size="sm" variant="outline">
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Video Display */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
          {cameraStatus === 'ready' || cameraStatus === 'initializing' ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ display: cameraStatus === 'ready' ? 'block' : 'none' }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`border-2 border-dashed w-80 h-20 rounded-lg flex items-center justify-center bg-black bg-opacity-30 ${
                  isScanning ? 'border-yellow-400 animate-pulse' : 'border-white'
                }`}>
                  <div className="text-white text-center">
                    <Scan className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">
                      {isScanning ? 'Scanning...' : 'Position barcode here'}
                    </p>
                    {lastScanResult && (
                      <p className="text-xs mt-1 text-green-300">
                        Last: {lastScanResult}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {cameraStatus === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center text-white">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {cameraStatus === 'error' ? 'Camera failed to start' : 'Camera not ready'}
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-3">
            <Button
              onClick={startScanning}
              disabled={cameraStatus !== 'ready' || isScanning}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Start Scanning'}</span>
            </Button>
            
            <Button
              onClick={handleManualEntry}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Enter Manually</span>
            </Button>
          </div>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">📋 Instructions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Allow camera permission when prompted</li>
            <li>Hold the employee badge steady in front of the camera</li>
            <li>Position the barcode within the scanning area</li>
            <li>Wait for automatic detection or click "Start Scanning"</li>
            <li>Use "Enter Manually" if the camera doesn't work</li>
          </ul>
          
          {devices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Using: {devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Default camera'}
              </p>
            </div>
          )}
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <div>Status: {cameraStatus}</div>
              <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
              <div>Scanning: {isScanning ? 'Yes' : 'No'}</div>
              <div>Devices: {devices.length}</div>
              <div>Secure Context: {window.isSecureContext ? 'Yes' : 'No'}</div>
              <div>URL Protocol: {window.location.protocol}</div>
            </div>
          </details>
        )}
        
      </div>
    </Modal>
  );
};
