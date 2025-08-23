import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface FixedZXingScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const FixedZXingScanner: React.FC<FixedZXingScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isOpen]);

  const cleanup = () => {
    console.log('Cleaning up scanner...');
    
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        console.log('ZXing scanner reset');
      } catch (err) {
        console.log('Error resetting scanner:', err);
      }
      codeReaderRef.current = null;
    }
    
    setStatus('idle');
    setError('');
    setIsScanning(false);
  };

  const initializeScanner = async () => {
    try {
      setStatus('initializing');
      setError('');
      console.log('Initializing ZXing scanner...');

      // Create new code reader instance
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Get available video devices
      console.log('Getting video devices...');
      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      console.log('Available video devices:', videoInputDevices);
      
      if (videoInputDevices.length === 0) {
        throw new Error('No video input devices found');
      }
      
      setDevices(videoInputDevices);
      
      // Prefer back camera (environment) if available, otherwise use first device
      let preferredDevice = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('rear')
      );
      
      if (!preferredDevice) {
        preferredDevice = videoInputDevices[0];
      }
      
      console.log('Selected device:', preferredDevice);
      setSelectedDeviceId(preferredDevice.deviceId);
      
      await startScanning(preferredDevice.deviceId);
      
    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      setStatus('error');
      setError(`Initialization failed: ${err.message}`);
    }
  };

  const startScanning = async (deviceId: string) => {
    try {
      setStatus('starting');
      console.log('Starting scan with device:', deviceId);
      
      if (!codeReaderRef.current) {
        throw new Error('Code reader not initialized');
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }

      // Start decoding from video element
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        video,
        (result, err) => {
          if (result) {
            const text = result.getText();
            console.log('Barcode detected:', text);
            setStatus('found');
            
            // Call success callback
            onScan(text);
            cleanup();
            onClose();
            
          } else if (err && !(err instanceof NotFoundException)) {
            // Only log non-NotFoundException errors
            console.log('Scan error:', err.message);
          }
        }
      );
      
      setStatus('scanning');
      setIsScanning(true);
      console.log('Scanner is now active and scanning...');
      
    } catch (err: any) {
      console.error('Scanning start error:', err);
      setStatus('error');
      setError(`Scanning failed: ${err.message}`);
    }
  };

  const handleManualEntry = () => {
    const barcode = prompt(`Enter the barcode for ${employeeName}:`);
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      onClose();
    }
  };

  const handleRetry = () => {
    cleanup();
    setTimeout(() => {
      initializeScanner();
    }, 1000);
  };

  const switchCamera = async () => {
    if (devices.length <= 1) return;
    
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    
    console.log('Switching to camera:', nextDevice.label);
    setSelectedDeviceId(nextDevice.deviceId);
    
    // Restart scanning with new device
    cleanup();
    setTimeout(async () => {
      try {
        codeReaderRef.current = new BrowserMultiFormatReader();
        await startScanning(nextDevice.deviceId);
      } catch (err) {
        console.error('Camera switch error:', err);
        setError('Failed to switch camera');
      }
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Employee Card - ${employeeName || 'Employee'}`}>
      <div className="space-y-4">
        
        {/* Status Display */}
        {status === 'idle' && (
          <div className="p-3 bg-gray-100 text-gray-700 rounded">
            📷 Scanner ready to initialize
          </div>
        )}
        
        {status === 'initializing' && (
          <div className="p-3 bg-blue-100 text-blue-700 rounded">
            🔧 Initializing barcode scanner...
          </div>
        )}
        
        {status === 'starting' && (
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded">
            📹 Starting camera...
          </div>
        )}
        
        {status === 'scanning' && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            📱 Scanning active! Point your barcode at the camera
          </div>
        )}
        
        {status === 'found' && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            🎉 Barcode detected! Processing...
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            ❌ {error}
            <br />
            <Button onClick={handleRetry} size="sm" className="mt-2">
              🔄 Try Again
            </Button>
          </div>
        )}

        {/* Camera Selection */}
        {devices.length > 1 && status === 'scanning' && (
          <div className="p-3 bg-blue-50 text-blue-700 rounded">
            📷 Multiple cameras detected
            <Button onClick={switchCamera} size="sm" className="ml-2">
              Switch Camera
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
              display: (status === 'scanning' || status === 'starting') ? 'block' : 'none'
            }}
          />
          
          {(status === 'idle' || status === 'initializing' || status === 'error') && (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>
                  {status === 'idle' && 'Scanner not started'}
                  {status === 'initializing' && 'Getting camera ready...'}
                  {status === 'error' && 'Camera error occurred'}
                </p>
              </div>
            </div>
          )}
          
          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-red-500 w-64 h-32 rounded-lg bg-red-500 bg-opacity-10">
                <div className="flex items-center justify-center h-full text-white text-sm font-bold">
                  📱 SCANNING...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
          <strong>Debug Info:</strong><br />
          Status: {status}<br />
          Cameras found: {devices.length}<br />
          {selectedDeviceId && `Active device: ${devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Unknown'}`}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to scan:</h4>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Allow camera permission when prompted</li>
            <li>Hold the barcode card steady and well-lit</li>
            <li>Position barcode within the red scanning area</li>
            <li>Keep the barcode parallel to the screen</li>
            <li>Use "Enter Manually" if automatic scanning fails</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button onClick={handleManualEntry} className="bg-blue-600 hover:bg-blue-700">
            📝 Enter Manually
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
