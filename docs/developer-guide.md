
# Developer Guide - Hệ thống Quản lý Sản xuất

## Kiến trúc

### Tech Stack
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express 
- Database: PostgreSQL với Drizzle ORM
- Authentication: Firebase

### Cấu trúc thư mục
```
├── client/          # Frontend React app
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
└── docs/           # Documentation
```

## Setup Development

1. Clone repository
2. Cài đặt dependencies:
```bash
npm install
```
3. Khởi động development server:
```bash
npm run dev
```

## Database Schema

### Users
- id: serial primary key
- uid: text (Firebase UID)  
- email: text
- role: enum ['admin', 'worker', 'manager', 'machine_manager', 'machine_monitor']
- name: text

### Orders 
- id: serial primary key
- orderNumber: text unique
- customer: json
- products: json array
- status: text
- qrCode: text
- createdAt: timestamp

### Production Stages
- id: serial primary key  
- orderId: integer foreign key
- stage: text
- status: text
- completedAt: timestamp
- completedBy: integer foreign key

## API Endpoints

### Orders
- GET /api/orders
- POST /api/orders
- GET /api/orders/:id
- PUT /api/orders/:id

### Production
- GET /api/production-stages/:orderId
- POST /api/production-stages/:orderId/complete

### Machines
- GET /api/machines
- POST /api/machines
- PUT /api/machines/:id

## Quy trình CI/CD

1. Code được push lên main branch
2. GitHub Actions build và test
3. Nếu pass, deploy lên Replit Production

## Security

- Firebase Authentication cho user management
- Role-based access control
- Environment variables cho sensitive data
- Input validation với Zod schemas

## Best Practices

1. Sử dụng TypeScript cho type safety
2. Follow React hooks pattern
3. Viết unit tests cho critical functions
4. Error handling nhất quán
5. Logging đầy đủ

## Troubleshooting

Common issues:
1. Database connection errors
2. Firebase auth issues 
3. API timeout
4. Build failures

## Contributing

1. Create feature branch
2. Write tests
3. Create pull request
4. Code review
5. Merge to main
