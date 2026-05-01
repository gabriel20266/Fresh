import { Timestamp } from 'firebase/firestore';

export type Category = string;

export interface UserCategory {
  id: string;
  name: string;
  userId: string;
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  name: string;
  expiryDate: string; // ISO string
  category: Category;
  price?: number;
  observations?: string;
  imageURL?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
