import React, { useState,useCallback } from "react";
import {
  Save,
  Download,
  RotateCcw,
  Edit3,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import SignaturePad from "./SignaturePad";
import PDFEditor from "./PDFEditor";
import type { Document, Signature } from "../types/Document";
import { signDocument } from "../services/api";
import { generatePDF } from "../utils/pdfGenerator";

interface DocumentViewerProps {
  document: Document;
  onDocumentSigned: (document: Document) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onDocumentSigned,
}) => {
  const [signatures, setSignatures] = useState<Signature[]>(
    document.signatures || []
  );
  const [isAddingSignature, setIsAddingSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(
    null
  );
  const [zoom, setZoom] = useState(1);
  const [editorReady, setEditorReady] = useState(false);

  const isPDF = document.mimetype === "application/pdf";

  const handleSignatureCreate = (signatureData: string) => {
    const newSignature: Signature = {
      _id: Date.now().toString(),
      dataURL: signatureData,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      type: "signature",
    };
    setSignatures([...signatures, newSignature]);
    setIsAddingSignature(false);
  };

  const handleSignatureUpdate = (updatedSignatures: Signature[]) => {
    setSignatures(updatedSignatures);
  };

  const handleSignatureSelect = (signatureId: string | null) => {
    setSelectedSignature(signatureId);
  };

  const removeSignature = (id: string) => {
    setSignatures(signatures.filter((sig) => sig._id !== id));
    if (selectedSignature === id) {
      setSelectedSignature(null);
    }
  };

  const handleRemoveSignature = (e: React.MouseEvent, signatureId?: string) => {
    e.stopPropagation();
    if (signatureId) {
      removeSignature(signatureId);
    }
  };

  const saveDocument = async () => {
    setSaving(true);
    try {
      const signaturesForSaving = signatures.map((sig) => {
        const isClientGeneratedId = sig._id && sig._id.length !== 24;

        if (isClientGeneratedId) {
          const sigWithoutId = { ...sig };
          delete sigWithoutId._id;
          return sigWithoutId;
        }

        return sig;
      });

      console.log("Sending signatures to API:", signaturesForSaving);

      const updatedDocument = await signDocument(
        document._id,
        signaturesForSaving
      );
      onDocumentSigned(updatedDocument);
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Failed to save the document. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setDownloading(true);
      await generatePDF(document, signatures);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Handler for editor ready state
const handleEditorReady = useCallback((ready = true) => {
  console.log("PDF Editor ready:", ready);
  setEditorReady(ready);
}, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {document.originalName}
            </h1>
            <p className="text-sm text-gray-600">
              {document.signed
                ? "Signed Document"
                : "Add signatures to your document"}
            </p>
          </div>

          {/* Use editorReady state to show a loading status */}
          {isPDF && (
            <div className="text-sm text-gray-600">
              Status: {editorReady ? "PDF loaded" : "Loading PDF..."}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAddingSignature(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={!editorReady && isPDF}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Add Signature
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border rounded-lg">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                title="Zoom Out"
                disabled={!editorReady && isPDF}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm border-x min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded-r-lg disabled:opacity-50"
                title="Zoom In"
                disabled={!editorReady && isPDF}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleZoomReset}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={!editorReady && isPDF}
            >
              Reset Zoom
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSignatures([])}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={(!editorReady && isPDF) || signatures.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </button>
            <button
              onClick={saveDocument}
              disabled={
                saving || (!editorReady && isPDF) || signatures.length === 0
              }
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Document"}
            </button>
            <button
              onClick={downloadPDF}
              disabled={
                downloading ||
                (!editorReady && isPDF) ||
                signatures.length === 0
              }
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Signatures Panel */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Signatures</h3>
            <p className="text-sm text-gray-600">
              {signatures.length} signature{signatures.length !== 1 ? "s" : ""}{" "}
              added
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {signatures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No signatures yet</p>
                <p className="text-sm">Click "Add Signature" to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signatures.map((signature, index) => (
                  <div
                    key={signature._id || index} // Use index as fallback if _id is undefined
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSignature === signature._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      signature._id && handleSignatureSelect(signature._id)
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        Signature {index + 1}
                      </span>
                      <button
                        onClick={(e) => handleRemoveSignature(e, signature._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-white border rounded p-2 mb-2">
                      <img
                        src={signature.dataURL}
                        alt="Signature"
                        className="w-full h-12 object-contain"
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>
                        Position: ({Math.round(signature.x)},{" "}
                        {Math.round(signature.y)})
                      </p>
                      <p>
                        Size: {Math.round(signature.width)} ×{" "}
                        {Math.round(signature.height)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PDF Editor - Full Width */}
        <div className="flex-1">
          {isPDF ? (
            <PDFEditor
              document={document}
              signatures={signatures}
              onSignaturesUpdate={handleSignatureUpdate}
              onSignatureSelect={handleSignatureSelect}
              selectedSignature={selectedSignature}
              zoom={zoom}
              onEditorReady={handleEditorReady}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-600">
                <p className="mb-2">This document type cannot be previewed</p>
                <p className="text-sm">
                  Only PDF files are supported for signature placement
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {isAddingSignature && (
        <SignaturePad
          onSignatureCreate={handleSignatureCreate}
          onClose={() => setIsAddingSignature(false)}
        />
      )}
    </div>
  );
};

export default DocumentViewer;
