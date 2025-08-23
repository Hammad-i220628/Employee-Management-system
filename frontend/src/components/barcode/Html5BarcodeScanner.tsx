import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Camera, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Html5BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  employeeName?: string;
}

export const Html5BarcodeScanner: React.FC<Html5BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  employeeName
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState('');
  const scannerElementId = 'barcode-scanner-element';

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isOpen]);

  const initializeScanner = () => {
    try {
      setStatus('initializing');
      setError('');
      
      console.log('Initializing HTML5 barcode scanner...');
      
      // Wait for DOM element to be available
      setTimeout(() => {
        const config = {
          fps: 10,    // frames per second
          qrbox: {    // scanning area
            width: 300,
            height: 150
          },
          aspectRatio: 1.7,
          // Support multiple barcode formats
          supportedScanTypes: [
            // QR Codes
            0, // QR_CODE
            // Barcodes
            8, // CODE_128
            7, // CODE_93
            6, // CODE_39
            5, // ITF
            13, // EAN_13
            12, // EAN_8
            17, // UPC_A
            18, // UPC_E
          ],
        };

        scannerRef.current = new Html5QrcodeScanner(
          scannerElementId,
          config,
          false // verbose logging
        );

        scannerRef.current.render(
          (decodedText, decodedResult) => {
            console.log('Barcode detected:', decodedText);
            setStatus('found');
            
            // Success callback - barcode detected
            onScan(decodedText);
            cleanup();
            onClose();
          },
          (errorMessage) => {
            // Error callback - usually just scanning attempts
            // Don't log every scan attempt as error
            if (!errorMessage.includes('No QR code found')) {
              console.log('Scan attempt:', errorMessage);
            }
          }
        );
        
        setStatus('scanning');
        console.log('Scanner initialized and ready');
        
      }, 100);
      
    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      setStatus('error');
      setError(`Scanner error: ${err.message}`);
    }
  };

  const cleanup = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log('Scanner cleaned up');
      } catch (err) {
        console.log('Cleanup error (non-critical):', err);
      }
    }
    setStatus('idle');
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
    setTimeout(initializeScanner, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Employee Card - ${employeeName || 'Employee'}`}>
      <div className="space-y-4">
        
        {/* Status Display */}
        {status === 'initializing' && (
          <div className="p-3 bg-blue-100 text-blue-700 rounded">
            🔧 Initializing barcode scanner...
          </div>
        )}
        
        {status === 'scanning' && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            📱 Scanner is active! Point your barcode at the camera
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
            <Button onClick={handleRetry} size="sm" className="ml-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Scanner Container */}
        <div className="bg-black rounded-lg overflow-hidden">
          <div 
            id={scannerElementId}
            style={{ 
              width: '100%',
              minHeight: '300px'
            }}
          />
          
          {status === 'idle' && (
            <div className="flex items-center justify-center h-64 text-white">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Scanner not active</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to scan:</h4>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Allow camera permission when prompted</li>
            <li>Hold the barcode card steady in front of the camera</li>
            <li>Make sure the barcode is well-lit and in focus</li>
            <li>Use "Enter Manually" if automatic scanning doesn't work</li>
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
