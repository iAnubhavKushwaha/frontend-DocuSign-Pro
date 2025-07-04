// src/components/SignaturePad.tsx
import React, { useRef, useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureCreate: (signatureData: string) => void;
  onClose: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureCreate, onClose }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

const handleSave = () => {
  if (sigCanvas.current && !isEmpty) {
    try {
      // Get the signature data with white background
      const signatureData = sigCanvas.current.toDataURL('image/png');
      
      // Log the first part of the data URL for debugging
      console.log('Signature data URL length:', signatureData.length);
      console.log('Signature data URL prefix:', signatureData.substring(0, 30) + '...');
      
      // Pass the signature data to the parent component
      onSignatureCreate(signatureData);
    } catch (error) {
      console.error('Error creating signature:', error);
      alert('Failed to create signature. Please try again.');
    }
  }
};
  const handleSignatureEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() || false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Create Signature</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Draw your signature using your mouse or touch screen
          </p>
        </div>

        <div className="p-6">
          <div className="border-2 border-gray-300 rounded-lg bg-gray-50 mb-6">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                width: 600,
                height: 200,
                className: 'signature-canvas w-full',
              }}
              backgroundColor="rgba(255, 255, 255, 0)"
              onEnd={handleSignatureEnd}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleClear}
              className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isEmpty}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4 mr-2" />
                Add Signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;