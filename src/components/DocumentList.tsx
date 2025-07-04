import React from 'react';
import { FileText, Edit3, Trash2, Download, Check, Clock } from 'lucide-react';
import type { Document as DocumentType } from '../types/Document';

interface DocumentListProps {
  documents: DocumentType[];
  onEditDocument: (document: DocumentType) => void;
  onDeleteDocument: (id: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onEditDocument,
  onDeleteDocument,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (doc: DocumentType) => {
    // Fixed: Use window.document instead of document
    const url = `http://localhost:3001/api/files/${doc.filename}`;
    const link = window.document.createElement('a');
    link.href = url;
    link.download = doc.originalName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-24 w-24 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Documents Yet</h3>
        <p className="text-gray-500 mb-8">
          Upload your first document to get started with signing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Documents</h2>
        <div className="text-sm text-gray-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-6">
        {documents.map((doc) => (
          <div
            key={doc._id}
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <FileText className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {doc.originalName}
                    </h3>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>Uploaded {formatDate(doc.createdAt)}</span>
                      {doc.signedAt && (
                        <>
                          <span>•</span>
                          <span>Signed {formatDate(doc.signedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    doc.signed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {doc.signed ? (
                      <div className="flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Signed
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {doc.signed && doc.signatures.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <Check className="h-4 w-4 inline mr-1" />
                    Document contains {doc.signatures.length} signature{doc.signatures.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-3">
                  <button
                    onClick={() => onEditDocument(doc)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {doc.signed ? 'View & Edit' : 'Sign Document'}
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
                <button
                  onClick={() => onDeleteDocument(doc._id)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentList;