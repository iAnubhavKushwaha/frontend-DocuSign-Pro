// useSignatureDrag.ts
import { useState, useCallback } from 'react';
import type { Signature } from '../types/Document';

interface DragState {
  isDragging: boolean;
  signature: Signature | null;
  offset: { x: number; y: number };
  position: { x: number; y: number };
}

interface UseDragOptions {
  snapToGrid?: boolean;
  gridSize?: number;
  onDragEnd?: (signature: Signature, position: { x: number; y: number }) => void;
  pdfDimensions: { width: number; height: number; scale: number } | null;
}

export function useSignatureDrag({
  snapToGrid = false,
  gridSize = 20,
  onDragEnd,
  pdfDimensions,
}: UseDragOptions) {
  // State for tracking drag operation
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    signature: null,
    offset: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
  });
  
  // Start dragging a signature
  const startDrag = useCallback((
    signature: Signature, 
    clientX: number, 
    clientY: number, 
    canvasRect: DOMRect
  ) => {
    if (!signature._id || !pdfDimensions) return;
    
    const x = (clientX - canvasRect.left) / pdfDimensions.scale;
    const y = (clientY - canvasRect.top) / pdfDimensions.scale;
    
    // Calculate drag offset (where on the signature the user clicked)
    const offsetX = x - signature.x;
    const offsetY = y - signature.y;
    
    setDragState({
      isDragging: true,
      signature,
      offset: { x: offsetX, y: offsetY },
      position: { 
        x: clientX - canvasRect.left, 
        y: clientY - canvasRect.top 
      },
    });
  }, [pdfDimensions]);
  
  // Update position during drag
  const updateDragPosition = useCallback((clientX: number, clientY: number, canvasRect: DOMRect) => {
    if (!dragState.isDragging || !dragState.signature) return;
    
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    setDragState(prev => ({
      ...prev,
      position: { x, y },
    }));
  }, [dragState.isDragging, dragState.signature]);
  
  // End dragging and return final position
  const endDrag = useCallback(() => {
    if (!dragState.isDragging || !dragState.signature || !pdfDimensions) {
      setDragState({
        isDragging: false,
        signature: null,
        offset: { x: 0, y: 0 },
        position: { x: 0, y: 0 },
      });
      return;
    }
    
    // Calculate final position in PDF coordinates
    let finalX = dragState.position.x / pdfDimensions.scale - dragState.offset.x;
    let finalY = dragState.position.y / pdfDimensions.scale - dragState.offset.y;
    
    // Apply snap to grid if enabled
    if (snapToGrid) {
      finalX = Math.round(finalX / gridSize) * gridSize;
      finalY = Math.round(finalY / gridSize) * gridSize;
    }
    
    // Keep within PDF bounds
    finalX = Math.max(0, Math.min(finalX, pdfDimensions.width - dragState.signature.width));
    finalY = Math.max(0, Math.min(finalY, pdfDimensions.height - dragState.signature.height));
    
    // Call the callback with updated position
    if (onDragEnd && dragState.signature) {
      onDragEnd(dragState.signature, { x: finalX, y: finalY });
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      signature: null,
      offset: { x: 0, y: 0 },
      position: { x: 0, y: 0 },
    });
  }, [
    dragState, 
    pdfDimensions, 
    snapToGrid, 
    gridSize, 
    onDragEnd
  ]);
  
  return {
    isDragging: dragState.isDragging,
    draggedSignature: dragState.signature,
    dragPosition: dragState.position,
    dragOffset: dragState.offset,
    startDrag,
    updateDragPosition,
    endDrag,
  };
}