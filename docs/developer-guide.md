
# Developer Guide - Hệ thống Quản lý Sản xuất

## Kiến trúc Hệ thống

### Tech Stack
- Frontend: React + TypeScript + TailwindCSS 
- Backend: Firebase (Authentication, Firestore, Storage)
- State Management: React Context + Custom Hooks

### Cấu trúc Dự án
```
├── client/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Firebase setup & utilities
│   │   ├── pages/         # Page components
│   │   └── App.tsx        # Root component
├── shared/
│   └── schema.ts          # Shared TypeScript types
└── docs/
    ├── developer-guide.md # Developer documentation
    └── user-guide.md      # User documentation
```

## Firebase Setup

### Environment Variables
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### Firebase Collections


https://ecoprint.top/
#### Users Collection
```typescript
interface User {
  uid: string;
  email: string;
  role: 'admin' | 'worker' | 'manager' | 'machine_manager' | 'machine_monitor';
  name: string;
  createdAt: string;
}
```

#### Orders Collection
```typescript
interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  products: Array<{
    id: string;
    quantity: number;
    complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  qrCode: string;
  createdAt: string;
}
```

#### Production Stages Collection
```typescript
interface ProductionStage {
  id: string;
  orderId: string;
  stage: 'cutting' | 'sewing' | 'embroidery' | 'finishing' | 'quality' | 'packaging';
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  completedBy?: string;
}
```

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User authentication check
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Admin role check
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection rules
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Orders collection rules
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
    }
    
    // Production stages rules
    match /productionStages/{stageId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

## Authentication Flow

1. Firebase Authentication setup:
```typescript
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence } from "firebase/auth";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);
```

2. Login Implementation:
```typescript
const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

## Data Access Layer

Implement Firebase operations using TypeScript classes:

```typescript
class FirebaseStorage {
  async getUser(uid: string): Promise<User | undefined> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() as User : undefined;
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<Order> {
    const docRef = await addDoc(collection(db, 'orders'), order);
    return {id: docRef.id, ...order};
  }

  async getProductionStages(orderId: string): Promise<ProductionStage[]> {
    const q = query(
      collection(db, 'productionStages'), 
      where('orderId', '==', orderId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data()
    }) as ProductionStage);
  }
}
```

## Error Handling

Implement consistent error handling:

```typescript
interface AppError {
  code: string;
  message: string;
  original?: any;
}

const handleFirebaseError = (error: any): AppError => {
  if (error.code === 'auth/user-not-found') {
    return {
      code: 'AUTH_ERROR',
      message: 'Người dùng không tồn tại',
      original: error
    };
  }
  // Add other error cases
  return {
    code: 'UNKNOWN_ERROR',
    message: 'Đã xảy ra lỗi không xác định',
    original: error
  };
};
```

## Testing

1. Unit Testing Firebase Functions:
```typescript
import { initializeTestApp } from '@firebase/rules-unit-testing';

describe('Firebase Operations', () => {
  it('should create user', async () => {
    const app = initializeTestApp({
      projectId: 'test-project',
      auth: { uid: 'test-uid' }
    });
    // Add test implementation
  });
});
```

2. Integration Testing:
- Test authentication flow
- Test data operations
- Test security rules

## Deployment

1. Build Production:
```bash
npm run build
```

2. Deploy on Replit:
- Use Replit's deployment features
- Configure environment variables
- Set up proper security rules

## Performance Optimization

1. Firebase Query Optimization:
- Use proper indexes
- Implement pagination
- Cache frequently accessed data

2. React Performance:
- Implement proper memoization
- Use React.lazy for code splitting
- Optimize re-renders

## Security Best Practices

1. Data Validation:
- Implement Zod schemas
- Validate all inputs
- Sanitize data

2. Authentication:
- Implement proper session management
- Use secure password policies
- Implement rate limiting

3. Firebase Security:
- Configure proper security rules
- Use minimum required permissions
- Regularly audit access logs
