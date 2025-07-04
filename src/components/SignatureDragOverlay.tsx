import React, { useRef} from 'react';
import type { Signature } from '../types/Document';

interface SignatureDragOverlayProps {
  signature: Signature;
  position: { x: number; y: number };
  showGrid?: boolean;
  gridSize?: number;
  scale?: number;
}

const SignatureDragOverlay: React.FC<SignatureDragOverlayProps> = ({
  signature,
  position,
  showGrid = false,
  gridSize = 20,
  scale = 1,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle the image size calculation safely
  const width = signature.width * scale;
  const height = signature.height * scale;
  
  // Calculate position with optional grid snapping
  const x = showGrid 
    ? Math.round(position.x / gridSize) * gridSize * scale 
    : position.x * scale;
  
  const y = showGrid 
    ? Math.round(position.y / gridSize) * gridSize * scale 
    : position.y * scale;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Signature image */}
      <img
        ref={imgRef}
        src={signature.dataURL}
        alt="Dragging signature"
        className="w-full h-full object-contain"
        style={{ opacity: 0.8 }}
      />
      
      {/* Border */}
      <div 
        className="absolute inset-0 border-2 border-blue-500"
        style={{ boxSizing: 'border-box' }}
      />
    </div>
  );
};

export default SignatureDragOverlay;