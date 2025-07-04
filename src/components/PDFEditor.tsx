// src/components/PDFEditor.tsx  
import React, { useRef, useEffect, useState, useCallback } from "react";  
import { Move, Target, AlertCircle, Loader2 } from "lucide-react";  
import type { Document, Signature } from "../types/Document";  
import * as pdfjsLib from "pdfjs-dist";  
import SignatureDragOverlay from "./SignatureDragOverlay";  
import axios from "axios";  
import { useSignatureDrag } from "../hooks/useSignatureDrag";  

// Set the worker source path  
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;  

// Define your interfaces  
interface PDFEditorProps {  
  document: Document;  
  signatures: Signature[];  
  onSignaturesUpdate: (signatures: Signature[]) => void;  
  onSignatureSelect: (signatureId: string | null) => void;  
  selectedSignature: string | null;  
  zoom: number;  
  onEditorReady?: (ready?: boolean) => void;  
}  

interface PDFDimensions {  
  width: number;  
  height: number;  
  scale: number;  
}  

const PDFEditor: React.FC<PDFEditorProps> = ({  
  document,  
  signatures,  
  onSignaturesUpdate,  
  onSignatureSelect,  
  selectedSignature,  
  zoom,  
  onEditorReady,  
}) => {  
  // References  
  const pdfRenderedRef = useRef<boolean>(false);  
  const canvasRef = useRef<HTMLCanvasElement>(null);  
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);  
  const containerRef = useRef<HTMLDivElement>(null);  
  const pdfDocRef = useRef<any>(null);  
  const signatureImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());  
  const renderingInProgressRef = useRef<boolean>(false);  
  const forceRenderRef = useRef<boolean>(false);  
  const lastZoomRef = useRef<number>(zoom);  
  const renderTaskRef = useRef<any>(null);  
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); 

  // State  
  const [pdfDimensions, setPdfDimensions] = useState<PDFDimensions | null>(null);  
  const [isLoading, setIsLoading] = useState(true);  
  const [error, setError] = useState<string | null>(null);  
  const [showGrid, setShowGrid] = useState(false);  
  const [snapToGrid, setSnapToGrid] = useState(false);  

  // Use the signature drag hook  
  const {   
    isDragging,   
    draggedSignature,   
    dragPosition,  
    startDrag,   
    updateDragPosition,   
    endDrag   
  } = useSignatureDrag({  
    snapToGrid,  
    gridSize: 20,  
    onDragEnd: (signature, position) => {  
      // Update the signature position  
      const updatedSignatures = signatures.map(sig =>   
        sig._id === signature._id ? { ...sig, x: position.x, y: position.y } : sig  
      );  
      onSignaturesUpdate(updatedSignatures);  
      
      // Redraw everything after drag ends  
      requestAnimationFrame(() => {  
        drawOverlay();  
      });  
    },  
    pdfDimensions,  
  });  

  // Function to load signature images  
  useEffect(() => {  
    const loadSignatureImages = async () => {  
      const newMap = new Map<string, HTMLImageElement>();  

      // Process all signatures  
      await Promise.all(  
        signatures.map((signature) => {  
          return new Promise<void>((resolve) => {  
            // Skip if no ID or already loaded  
            if (!signature._id) {  
              resolve();  
              return;  
            }  

            const img = new Image();  
            img.onload = () => {  
              newMap.set(signature._id as string, img);  
              resolve();  
            };  
            img.onerror = () => {  
              console.error(`Failed to load signature image: ${signature._id}`);  
              resolve();  
            };  
            img.src = signature.dataURL;  
          });  
        })  
      );  

      signatureImagesRef.current = newMap;  
      drawOverlay();  
    };  

    loadSignatureImages();  
  }, [signatures]);  

  // Draw grid on overlay canvas  
  const drawGrid = useCallback(() => {  
    if (!overlayCanvasRef.current || !pdfDimensions) return;  

    const canvas = overlayCanvasRef.current;  
    const ctx = canvas.getContext("2d");  
    if (!ctx) return;  

    const gridSize = 20 * pdfDimensions.scale;  

    ctx.save();  
    ctx.strokeStyle = "rgba(0, 0, 255, 0.1)";  
    ctx.lineWidth = 1;  

    // Draw vertical lines  
    for (let x = gridSize; x < canvas.width; x += gridSize) {  
      ctx.beginPath();  
      ctx.moveTo(x, 0);  
      ctx.lineTo(x, canvas.height);  
      ctx.stroke();  
    }  

    // Draw horizontal lines  
    for (let y = gridSize; y < canvas.height; y += gridSize) {  
      ctx.beginPath();  
      ctx.moveTo(0, y);  
      ctx.lineTo(canvas.width, y);  
      ctx.stroke();  
    }  

    ctx.restore();  
  }, [pdfDimensions]);  

  // Draw resize handles for selected signature  
  const drawResizeHandles = (  
    ctx: CanvasRenderingContext2D,  
    x: number,  
    y: number,  
    width: number,  
    height: number  
  ) => {  
    const handleSize = 8;  
    const halfHandleSize = handleSize / 2;  

    ctx.fillStyle = "#3b82f6";  

    // Draw corner handles  
    ctx.fillRect(x - halfHandleSize, y - halfHandleSize, handleSize, handleSize);  
    ctx.fillRect(x + width - halfHandleSize, y - halfHandleSize, handleSize, handleSize);  
    ctx.fillRect(x - halfHandleSize, y + height - halfHandleSize, handleSize, handleSize);  
    ctx.fillRect(  
      x + width - halfHandleSize,  
      y + height - halfHandleSize,  
      handleSize,  
      handleSize  
    );  

    // Draw middle-edge handles  
    ctx.fillRect(x + width / 2 - halfHandleSize, y - halfHandleSize, handleSize, handleSize);  
    ctx.fillRect(x - halfHandleSize, y + height / 2 - halfHandleSize, handleSize, handleSize);  
    ctx.fillRect(  
      x + width / 2 - halfHandleSize,  
      y + height - halfHandleSize,  
      handleSize,  
      handleSize  
    );  
    ctx.fillRect(  
      x + width - halfHandleSize,  
      y + height / 2 - halfHandleSize,  
      handleSize,  
      handleSize  
    );  
  };  

  // Draw overlay (signatures)  
  const drawOverlay = useCallback(() => {  
    if (!overlayCanvasRef.current || !pdfDimensions) return;  

    const canvas = overlayCanvasRef.current;  
    const ctx = canvas.getContext("2d");  
    if (!ctx) return;  

    // Clear overlay  
    ctx.clearRect(0, 0, canvas.width, canvas.height);  

    // Draw grid if enabled  
    if (showGrid) {  
      drawGrid();  
    }  

    // Draw signatures - skip the one being dragged  
    signatures.forEach((signature) => {  
      if (!signature._id || (isDragging && draggedSignature?._id === signature._id)) return;  

      const img = signatureImagesRef.current.get(signature._id);  
      if (!img) return;  

      const x = signature.x * pdfDimensions.scale;  
      const y = signature.y * pdfDimensions.scale;  
      const width = signature.width * pdfDimensions.scale;  
      const height = signature.height * pdfDimensions.scale;  

      ctx.save();  

      // Draw signature background  
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";  
      ctx.fillRect(x, y, width, height);  

      // Draw signature image  
      ctx.drawImage(img, x, y, width, height);  

      // Draw border  
      if (selectedSignature === signature._id) {  
        ctx.strokeStyle = "#3b82f6";  
        ctx.lineWidth = 2;  
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);  

        drawResizeHandles(ctx, x, y, width, height);  
      } else {  
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";  
        ctx.lineWidth = 1;  
        ctx.strokeRect(x, y, width, height);  
      }  

      ctx.restore();  
    });  
  }, [  
    signatures,  
    pdfDimensions,  
    selectedSignature,  
    showGrid,  
    drawGrid,  
    isDragging,  
    draggedSignature  
  ]);  

  // Function to render PDF page  
  const renderPDF = useCallback(async () => {  
    if (!pdfDocRef.current || !canvasRef.current || !overlayCanvasRef.current) {  
      return;  
    }  

    // Don't re-render during dragging operations  
    if (isDragging) {  
      return;  
    }  

    // Cancel any existing render task before starting a new one  
    if (renderTaskRef.current) {  
      try {  
        renderTaskRef.current.cancel();  
      } catch (e) {  
        console.warn("Failed to cancel render task:", e);  
      }  
      renderTaskRef.current = null;  
    }  

    renderingInProgressRef.current = true;  
    lastZoomRef.current = zoom;  

    try {  
      const canvas = canvasRef.current;  
      const overlayCanvas = overlayCanvasRef.current;  
      const containerWidth = containerRef.current?.clientWidth || 800;  

      const page = await pdfDocRef.current.getPage(1);  
      const viewport = page.getViewport({ scale: zoom });  

      // Calculate scale to fit in container  
      const scale = Math.min(containerWidth / viewport.width, 1) * zoom;  
      const scaledViewport = page.getViewport({ scale });  

      const outputScale = window.devicePixelRatio || 1;  
      const scaledWidth = Math.floor(scaledViewport.width * outputScale);  
      const scaledHeight = Math.floor(scaledViewport.height * outputScale);  

      // Set canvas dimensions  
      canvas.width = scaledWidth;  
      canvas.height = scaledHeight;  
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;  
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;  

      // Match overlay canvas dimensions  
      overlayCanvas.width = scaledWidth;  
      overlayCanvas.height = scaledHeight;  
      overlayCanvas.style.width = `${Math.floor(scaledViewport.width)}px`;  
      overlayCanvas.style.height = `${Math.floor(scaledViewport.height)}px`;  

      // Save PDF dimensions for later use  
      setPdfDimensions({  
        width: viewport.width,  
        height: viewport.height,  
        scale: scale,  
      });  

      // Clear canvas first  
      const context = canvas.getContext("2d");  
      if (context) {  
        context.clearRect(0, 0, scaledWidth, scaledHeight);  
      }  

      // Render PDF  
      const renderContext = {  
        canvasContext: context,  
        viewport: scaledViewport,  
        transform: [outputScale, 0, 0, outputScale, 0, 0],  
      };  

      // Store the render task so we can cancel it if needed  
      renderTaskRef.current = page.render(renderContext);  
      
      // Wait for rendering to complete  
      await renderTaskRef.current.promise;  
      
      // Mark rendering as complete  
      renderingInProgressRef.current = false;  
      forceRenderRef.current = false;  
      pdfRenderedRef.current = true;  
      renderTaskRef.current = null;  

      // Draw overlay after PDF is rendered  
      drawOverlay();  

    } catch (err) {  
      // Check if this was a cancelled render  
      if (err instanceof Error && err.name === 'RenderingCancelledException') {  
        console.log("Rendering was cancelled");  
      } else {  
        console.error("Error rendering PDF:", err);  
        setError("Failed to render PDF. Please try again.");  
      }  
      renderingInProgressRef.current = false;  
      renderTaskRef.current = null;  
    }  
  }, [zoom, drawOverlay, isDragging]);  

  // Load PDF document  
  useEffect(() => {  
    const loadPDF = async () => {  
      // Only load PDF if not already loaded or if document changed  
      if (pdfDocRef.current && document._id === pdfDocRef.current.documentId) {  
        setIsLoading(false);  
        // Call onEditorReady even when PDF is already loaded from cache  
        if (onEditorReady) {  
          onEditorReady(true);  
        }  
        return;  
      }  
      
      try {  
        setIsLoading(true);  
        setError(null);  

        // Debug the document object  
        console.log("Document object:", document);  
        if (!document || !document._id) {  
          throw new Error("Invalid document: missing _id");  
        }  

        const docId = document._id;  
        console.log("Loading PDF for document ID:", docId);  

        // Get authentication token from localStorage  
        const userJSON = localStorage.getItem('user');  
        let token = '';  
        if (userJSON) {  
          try {  
            const user = JSON.parse(userJSON);  
            token = user?.token;  
            console.log("Found authentication token in localStorage");  
          } catch (e) {  
            console.error("Error parsing user data from localStorage", e);  
          }  
        }  

        if (!token) {  
          console.error("No authentication token available");  
          setError("Authentication required: Please log in");  
          return;  
        }  

        console.log("Fetching PDF with authenticated request...");  
        // Use axios to fetch the PDF with authentication headers  
        const response = await axios.get(`https://backend-docusign-pro.onrender.com/api/documents/${docId}/file`, {  
          responseType: 'arraybuffer',  
          headers: {  
            'Authorization': `Bearer ${token}`  
          }  
        });  
        
        console.log("PDF fetched successfully, size:", response.data.byteLength);  
        
        // Load PDF using the arraybuffer data  
        const loadingTask = pdfjsLib.getDocument({ data: response.data });  
        console.log("PDF.js loading task created");  
        
        const pdf = await loadingTask.promise;  
        console.log("PDF loaded successfully", pdf);  
        
        // Store document ID with PDF for caching  
        (pdf as any).documentId = docId;  
        pdfDocRef.current = pdf;  
        
        // Force initial render  
        forceRenderRef.current = true;  
        pdfRenderedRef.current = false;  
        await renderPDF();  
        
        // Call onEditorReady after successful render  
        if (onEditorReady) {  
          onEditorReady(true);  
        }  
      } catch (err) {  
        console.error("Error loading PDF:", err);  
        
        // If it's an axios error, provide more detailed information  
        if (axios.isAxiosError(err)) {  
          const statusCode = err.response?.status;  
          const errorMessage = err.response?.data?.error || err.message;  
          setError(`Failed to load PDF (${statusCode}): ${errorMessage}`);  
          
          // If unauthorized, show login message  
          if (statusCode === 401) {  
            setError("Please log in to view this document");  
          }  
        } else {  
          setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);  
        }  
        
        // For development only: use a sample PDF as fallback  
        console.log("Falling back to sample PDF for development...");  
        try {  
          const sampleUrl = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";  
          const loadingTask = pdfjsLib.getDocument(sampleUrl);  
          const pdf = await loadingTask.promise;  
          pdfDocRef.current = pdf;  
          (pdf as any).documentId = "sample";  
          
          forceRenderRef.current = true;  
          pdfRenderedRef.current = false;  
          await renderPDF();  
          
          console.log("Sample PDF loaded successfully");  
          
          // Call onEditorReady even with sample PDF  
          if (onEditorReady) {  
            onEditorReady(true);  
          }  
        } catch (sampleErr) {  
          console.error("Even the sample PDF failed to load:", sampleErr);  
        }  
      } finally {  
        setIsLoading(false);  
      }  
    };  

    loadPDF();  
  }, [document._id, renderPDF, onEditorReady]);  

  // Clean up render tasks on unmount  
  useEffect(() => {  
    return () => {  
      // Cancel any ongoing rendering when component unmounts  
      if (renderTaskRef.current) {  
        try {  
          renderTaskRef.current.cancel();  
        } catch (e) {  
          console.warn("Failed to cancel render task on unmount:", e);  
        }  
      }  
      if (resizeTimeoutRef.current) {  
        clearTimeout(resizeTimeoutRef.current);  
      }  
    };  
  }, []);  

  // Mouse position helper  
  const getMousePosition = (e: React.MouseEvent) => {  
    if (!overlayCanvasRef.current || !pdfDimensions) return { x: 0, y: 0 };  

    const rect = overlayCanvasRef.current.getBoundingClientRect();  
    return {  
      x: (e.clientX - rect.left) / pdfDimensions.scale,  
      y: (e.clientY - rect.top) / pdfDimensions.scale,  
    };  
  };  

  // Handle mouse down on overlay  
  const handleOverlayMouseDown = (e: React.MouseEvent) => {  
    if (!overlayCanvasRef.current || !pdfDimensions) return;  

    const rect = overlayCanvasRef.current.getBoundingClientRect();  
    const { x, y } = getMousePosition(e);  

    // Find clicked signature  
    const clickedSignature = signatures.find(  
      (sig) =>  
        sig._id &&  
        x >= sig.x &&  
        x <= sig.x + sig.width &&  
        y >= sig.y &&  
        y <= sig.y + sig.height  
    );  

    if (clickedSignature && clickedSignature._id) {  
      onSignatureSelect(clickedSignature._id);  
      startDrag(clickedSignature, e.clientX, e.clientY, rect);  
      e.preventDefault();  
    } else {  
      onSignatureSelect(null);  
    }  
  };  

  // Handle mouse move and up events  
  useEffect(() => {  
    const handleMouseMove = (e: MouseEvent) => {  
      if (!isDragging || !overlayCanvasRef.current) return;  
      
      const rect = overlayCanvasRef.current.getBoundingClientRect();  
      updateDragPosition(e.clientX, e.clientY, rect);  
    };  

    const handleMouseUp = () => {  
      if (isDragging) {  
        endDrag();  
      }  
    };  

    window.addEventListener('mousemove', handleMouseMove);  
    window.addEventListener('mouseup', handleMouseUp);  

    return () => {  
      window.removeEventListener('mousemove', handleMouseMove);  
      window.removeEventListener('mouseup', handleMouseUp);  
    };  
  }, [isDragging, updateDragPosition, endDrag]);  

  // Render PDF when zoom changes  
  useEffect(() => {  
    if (!pdfDocRef.current) return;  
    
    if (lastZoomRef.current !== zoom) {  
      forceRenderRef.current = true;  
      
      if (resizeTimeoutRef.current) {  
        clearTimeout(resizeTimeoutRef.current);  
      }  
      
      resizeTimeoutRef.current = setTimeout(() => {  
        renderPDF();  
        resizeTimeoutRef.current = null;  
      }, 300);  
    }  

    return () => {  
      if (resizeTimeoutRef.current) {  
        clearTimeout(resizeTimeoutRef.current);  
      }  
    };  
  }, [zoom, renderPDF]);  

  // Handle window resize  
  useEffect(() => {  
    const handleResize = () => {  
      forceRenderRef.current = true;  
      
      if (resizeTimeoutRef.current) {  
        clearTimeout(resizeTimeoutRef.current);  
      }  
      
      resizeTimeoutRef.current = setTimeout(() => {  
        renderPDF();  
        resizeTimeoutRef.current = null;  
      }, 300);  
    };  

    window.addEventListener("resize", handleResize);  

    return () => {  
      window.removeEventListener("resize", handleResize);  
      if (resizeTimeoutRef.current) {  
        clearTimeout(resizeTimeoutRef.current);  
      }  
    };  
  }, [renderPDF]);  

  // Redraw overlay when signatures change (but not during drag)  
  useEffect(() => {  
    if (!isDragging && pdfRenderedRef.current && pdfDimensions) {  
      // Only redraw the overlay, don't re-render the PDF  
      requestAnimationFrame(() => {  
        drawOverlay();  
      });  
    }  
  }, [signatures, selectedSignature, drawOverlay, isDragging, pdfDimensions]);  

  // Loading state  
  if (isLoading) {  
    return (  
      <div className="h-full flex items-center justify-center bg-gray-50">  
        <div className="text-center">  
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />  
          <p className="text-gray-600">Loading PDF Editor...</p>  
        </div>  
      </div>  
    );  
  }  

  // Error state  
  if (error) {  
    return (  
      <div className="h-full flex items-center justify-center bg-red-50">  
        <div className="text-center text-red-600 max-w-md">  
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />  
          <p className="font-semibold mb-2">PDF Loading Error</p>  
          <p className="text-sm mb-4">{error}</p>  
        </div>  
      </div>  
    );  
  }  

  // Main render  
  return (  
    <div className="h-full flex flex-col bg-gray-50">  
      {/* Header */}  
      <div className="p-4 bg-white border-b border-gray-200">  
        <div className="flex items-center justify-between">  
          <h3 className="font-semibold text-gray-900">PDF Editor</h3>  
          <div className="flex items-center space-x-2">  
            <button  
              onClick={() => setShowGrid(!showGrid)}  
              className={`p-2 rounded-lg border transition-colors ${  
                showGrid  
                  ? "bg-blue-600 text-white border-blue-600"  
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"  
              }`}  
              title="Toggle Grid"  
            >  
              <Target className="h-4 w-4" />  
            </button>  
            <button  
              onClick={() => setSnapToGrid(!snapToGrid)}  
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${  
                snapToGrid  
                  ? "bg-blue-600 text-white border-blue-600"  
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"  
              }`}  
              title="Snap to Grid"  
            >  
              Snap  
            </button>  
          </div>  
        </div>  

        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">  
          <div className="flex items-center text-sm text-blue-800">  
            <Move className="h-4 w-4 mr-2" />  
            <span>  
              Real-time drag & drop - Click and drag signatures smoothly  
            </span>  
          </div>  
        </div>  
      </div>  

            {/* Canvas Container */}
      <div 
        className="flex-1 overflow-auto relative" 
        ref={containerRef}
      >
        <div className="min-h-full flex justify-center py-8 px-4">
          <div className="relative shadow-lg">
            {/* PDF Canvas */}
            <canvas 
              ref={canvasRef} 
              className="block"
            />
            
            {/* Overlay Canvas */}
            <canvas 
              ref={overlayCanvasRef} 
              className="absolute top-0 left-0 cursor-pointer" 
              onMouseDown={handleOverlayMouseDown}
            />
            
            {/* Dragged Signature Overlay */}
            {isDragging && draggedSignature && dragPosition && (
              <SignatureDragOverlay
                signature={draggedSignature}
                position={dragPosition}
                showGrid={showGrid && snapToGrid}
                gridSize={20}
                scale={pdfDimensions?.scale || 1}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;