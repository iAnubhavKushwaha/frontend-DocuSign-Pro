//frontend\src\services\api.ts

import axios from 'axios';
import type { Document, Signature, User } from '../types/Document';

const API_BASE_URL = 'https://backend-docusign-pro.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add token to requests if user is logged in
api.interceptors.request.use(
  (config) => {
    const userJSON = localStorage.getItem('user');
    if (userJSON) {
      const user = JSON.parse(userJSON);
      if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication APIs
export const register = async (name: string, email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
  });
  
  const user = response.data;
  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

export const login = async (email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });
  
  const user = response.data;
  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

export const logout = (): void => {
  localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
  const userJSON = localStorage.getItem('user');
  if (userJSON) {
    return JSON.parse(userJSON);
  }
  return null;
};

// Document APIs
export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('document', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.document;
};

export const getDocuments = async (): Promise<Document[]> => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocument = async (id: string): Promise<Document> => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};


export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/documents/${id}`);
};


// Function to get file URL - this is critical
export const getFileUrl = (doc: Document): string => {
  if (!doc || (!doc._id && typeof doc !== 'string')) {
    throw new Error('Invalid document');
  }
  
  const id = typeof doc === 'string' ? doc : doc._id;
  const url = `https://backend-docusign-pro.onrender.com/api/documents/${id}/file`;
  console.log(`File URL: ${url}`);
  return url;
};
// In services/api.ts - Replace your current signDocument function with this:

export const signDocument = async (documentId: string, signatures: Signature[]): Promise<Document> => {
  try {
    // Get the user object from localStorage (consistent with your other functions)
    const userJSON = localStorage.getItem('user');
    if (!userJSON) {
      console.error('No user found in localStorage');
      throw new Error('Authentication required. Please log in again.');
    }
    
    const user = JSON.parse(userJSON);
    if (!user || !user.token) {
      console.error('No token found in user object');
      throw new Error('Authentication required. Please log in again.');
    }
    
    console.log('Using token from user object');
    
    // Use your existing API instance which has the interceptor for authorization
    const response = await api.post(`/documents/${documentId}/sign`, { signatures });
    console.log('Sign document response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error signing document:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401) {
        // Handle auth errors
        console.error('Authentication error. Token may be invalid or expired.');
        // logout(); // Uncomment if you have a logout function
      } else if (error.response.status === 404) {
        console.error('Resource not found. URL may be incorrect or document doesn\'t exist.');
      }
      
      console.error('Response data:', error.response.data);
    }
    
    throw error;
  }
};