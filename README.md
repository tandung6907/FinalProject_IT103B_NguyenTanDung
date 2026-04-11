# Quiz App - Vercel Deployment

Ứng dụng quiz với khả năng đồng bộ dữ liệu giữa các thiết bị khi deploy trên Vercel.

## Tính năng

- Tạo và quản lý bài test
- Làm bài quiz với timer
- Quản lý kết quả (admin only)
- Đồng bộ dữ liệu tự động qua Vercel serverless functions

## Deploy lên Vercel

1. **Push code lên GitHub** (nếu chưa có)

2. **Connect với Vercel**:
   - Đăng ký tài khoản Vercel
   - Import project từ GitHub
   - Vercel sẽ tự động detect cấu hình từ `vercel.json`

3. **Cấu hình Environment Variables** (tùy chọn):
   - Trong Vercel dashboard, thêm `KV_URL` nếu dùng Vercel KV
   - Thêm `AUTH_TOKEN` cho authentication (mặc định là "demo-token")

4. **Deploy**:
   - Vercel sẽ build và deploy tự động
   - URL sẽ có dạng: `https://your-project.vercel.app`

## Cách hoạt động

- **Local development**: Dùng localStorage và static files
- **Vercel deployment**: Tự động chuyển sang dùng serverless API
- **GitHub fallback**: Nếu không phải Vercel, dùng GitHub API

## API Endpoints

- `GET/POST /api/tests` - Quản lý bài test
- `GET/POST /api/results` - Quản lý kết quả

## Bảo mật

- Hiện tại dùng token đơn giản, nên chỉ dùng cho demo
- Trong production, implement JWT authentication

## Lưu ý

- Dữ liệu lưu trong memory, sẽ mất khi restart server
- Để persistent storage, dùng Vercel KV hoặc database khác