// frontend\src\App.tsx
import { useState, useEffect } from 'react';
import { FileText, Upload, LogOut, User } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import DocumentViewer from './components/DocumentViewer';
import DocumentList from './components/DocumentList';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import type { Document, User as UserType } from './types/Document';
import { getDocuments, deleteDocument, getCurrentUser, logout } from './services/api';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [view, setView] = useState<'home' | 'list' | 'upload' | 'sign' | 'auth'>('home');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadDocuments();
    } else {
      setLoading(false);
    }
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setDocuments([]);
    setCurrentDocument(null);
    setView('home');
  };

  const handleLogin = (loggedInUser: UserType) => {
    setUser(loggedInUser);
    loadDocuments();
    setView('list');
  };

  const handleDocumentUploaded = (document: Document) => {
    setDocuments(prev => [...prev, document]);
    setView('list');
  };

  const handleDocumentSigned = (document: Document) => {
    setDocuments(prev => prev.map(doc => 
      doc._id === document._id ? document : doc
    ));
    setCurrentDocument(document);
    setView('list');
  };

  const handleEditDocument = (document: Document) => {
    setCurrentDocument(document);
    setView('sign');
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc._id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const renderContent = () => {
    if (view === 'home') {
      return (
        <HomePage 
          onLogin={() => setView('auth')} 
          onRegister={() => setView('auth')} 
        />
      );
    }

    if (view === 'auth') {
      return <Auth onAuthSuccess={handleLogin} />;
    }

    // If user is not logged in but trying to access protected routes
    if (!user && ['list', 'upload', 'sign'].includes(view)) {
      return <Auth onAuthSuccess={handleLogin} />;
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (view) {
      case 'upload':
        return <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />;
      case 'sign':
        return currentDocument ? (
          <DocumentViewer 
            document={currentDocument} 
            onDocumentSigned={handleDocumentSigned}
          />
        ) : null;
      case 'list':
        return (
          <DocumentList 
            documents={documents}
            onEditDocument={handleEditDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={view === 'home' ? "" : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50"}>
      {/* Only show header when not on homepage or when logged in */}
      {(view !== 'home' && view !== 'auth') && (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">DocuSign Pro</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Upload, sign, and manage your documents seamlessly
            </p>
          </div>

          {/* User Profile & Navigation */}
          {user && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>

              {/* Navigation */}
              <div className="flex justify-center mb-8">
                <div className="bg-white rounded-lg shadow-lg p-1 flex space-x-1">
                  <button
                    onClick={() => setView('list')}
                    className={`px-6 py-3 rounded-md font-medium transition-all ${
                      view === 'list'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <FileText className="h-5 w-5 inline mr-2" />
                    My Documents
                  </button>
                  <button
                    onClick={() => setView('upload')}
                    className={`px-6 py-3 rounded-md font-medium transition-all ${
                      view === 'upload'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Upload className="h-5 w-5 inline mr-2" />
                    Upload Document
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={view === 'home' || view === 'auth' ? "" : "max-w-6xl mx-auto px-4"}>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;