export interface Signature {
  _id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  type: 'signature' | 'text' | 'date';
  dataURL: string;
}

export interface Document {
  _id: string;
  user: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  signed: boolean;
  signatures: Signature[];
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  token?: string;
}
