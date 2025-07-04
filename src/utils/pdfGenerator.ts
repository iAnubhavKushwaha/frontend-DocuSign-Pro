// src/utils/pdfGenerator.ts
import { PDFDocument } from 'pdf-lib';
import type { Document as DocumentType, Signature } from '../types/Document';
import axios from 'axios'; // Make sure axios is imported

export const generatePDF = async (
  document: DocumentType,
  signatures: Signature[]
): Promise<void> => {
  try {
    console.log('Generating PDF with precise coordinates');
    
    if (document.mimetype === 'application/pdf') {
      // Get authentication token from localStorage
      const userJSON = localStorage.getItem('user');
      let token = '';
      if (userJSON) {
        try {
          const user = JSON.parse(userJSON);
          token = user?.token;
          console.log("Found authentication token for PDF generation");
        } catch (e) {
          console.error("Error parsing user data from localStorage", e);
          throw new Error("Authentication error: Invalid user data");
        }
      }

      if (!token) {
        throw new Error("Authentication required: Please log in");
      }
      
      // Use authenticated request to get the PDF
      const response = await axios.get(
        `https://backend-docusign-pro.onrender.com/api/documents/${document._id}/file`, 
        {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Load the PDF
      const existingPdfBytes = response.data;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      
      if (pages.length === 0) {
        throw new Error('PDF document has no pages');
      }
      
      const page = pages[0];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      console.log(`PDF page dimensions: ${pageWidth} x ${pageHeight}`);
      
      // Since we're using exact coordinates from the PDF editor,
      // we don't need complex scaling calculations
      for (const signature of signatures) {
        try {
          console.log(`Processing signature at exact position: (${signature.x}, ${signature.y})`);
          
          // Extract base64 data
          const base64Data = signature.dataURL.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid signature data URL');
          }
          
          // Decode base64 to binary
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Embed the signature image
          const signatureImage = await pdfDoc.embedPng(bytes);
          
          // Use exact coordinates from editor
          // Convert from top-left (editor) to bottom-left (PDF)
          const pdfY = pageHeight - signature.y - signature.height;
          
          console.log(`Placing signature at PDF coordinates: (${signature.x}, ${pdfY})`);
          
          // Draw the signature
          page.drawImage(signatureImage, {
            x: signature.x,
            y: pdfY,
            width: signature.width,
            height: signature.height
          });
          
        } catch (error) {
          console.error('Error processing signature:', error);
        }
      }
      
      // Save and download
      const pdfBytes = await pdfDoc.save() as Uint8Array;
      const fileName = `${document.originalName.replace(/\.[^/.]+$/, '')}_signed.pdf`;
      downloadBlob(pdfBytes, fileName);
      
    } else {
      // Handle non-PDF documents as before
      console.log('Non-PDF document handling...');
    }
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

function downloadBlob(data: Uint8Array, fileName: string): void {
  const uint8Array = new Uint8Array(data); 
  const blob = new Blob([uint8Array], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}