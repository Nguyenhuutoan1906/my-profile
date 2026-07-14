# Sean Portfolio Platform

```
project2/
├── frontend/       # Frontend React + Vite
└── backend/        # REST API Express + JWT + MongoDB
```

## Chạy dự án

1. Frontend: `npm run dev:frontend`
2. Backend: vào thư mục `backend`, chạy `npm install`, sau đó `npm run dev`.

Frontend phát triển trên cổng 5173 và tự chuyển tiếp các yêu cầu `/api` đến backend ở cổng 4000. Backend dùng MongoDB; đặt `MONGODB_URI` trong `backend/.env` (MongoDB cục bộ hoặc MongoDB Atlas).

Khi triển khai frontend, đặt biến `VITE_API_URL` thành URL công khai của backend, ví dụ `https://your-backend.onrender.com/api`.
