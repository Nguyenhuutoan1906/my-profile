# Sean Portfolio Platform

```
project2/
├── frontend/       # React + Vite frontend
└── backend/        # Express REST API + JWT + Neon PostgreSQL
```

## Chạy dự án

1. Frontend: `npm run dev:frontend`
2. Backend: vào thư mục `backend`, chạy `npm install`, rồi chạy `npm run dev`.

Frontend chạy ở cổng 5173 và chuyển tiếp yêu cầu `/api` đến backend ở cổng 4000. Backend dùng Neon PostgreSQL; cấu hình `DATABASE_URL` trong `backend/.env` theo mẫu `.env.example`.

Khi triển khai frontend, đặt `VITE_API_URL` thành URL public của backend, ví dụ `https://your-backend.onrender.com/api`.
