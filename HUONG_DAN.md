# Hướng dẫn deploy Sổ Sách Kinh Doanh

App này gồm 2 phần cần thiết lập:
1. **Supabase** — nơi lưu dữ liệu dùng chung (miễn phí)
2. **Vercel** — nơi deploy web để có link truy cập (miễn phí)

---

## Bước 1: Tạo tài khoản và project Supabase

1. Vào https://supabase.com → **Start your project** → đăng nhập bằng GitHub hoặc email.
2. Bấm **New project**, đặt tên tuỳ ý (VD: `so-sach-kinh-doanh`), chọn mật khẩu database, chọn region gần Việt Nam (Singapore).
3. Đợi khoảng 1-2 phút để project khởi tạo xong.

## Bước 2: Tạo bảng lưu dữ liệu

1. Trong project Supabase, vào mục **SQL Editor** (menu bên trái) → **New query**.
2. Dán đoạn SQL sau vào rồi bấm **Run**:

```sql
create table kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

create policy "cho phep doc ghi" on kv_store
  for all
  using (true)
  with check (true);
```

> Lưu ý: policy này cho phép bất kỳ ai có link web và anon key đều đọc/ghi được dữ liệu — phù hợp cho team nội bộ dùng chung, nhưng không nên chia sẻ link công khai ra ngoài. Nếu sau này cần đăng nhập riêng từng người, báo mình để nâng cấp thêm.

## Bước 3: Lấy API key

1. Vào **Project Settings** (biểu tượng bánh răng) → **API**.
2. Copy 2 giá trị:
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - **anon public key** (chuỗi dài)

## Bước 4: Đưa code lên GitHub

1. Tạo tài khoản GitHub nếu chưa có: https://github.com
2. Tạo một repository mới (Private hoặc Public đều được).
3. Upload toàn bộ nội dung thư mục `so-sach-kinh-doanh` này lên repo đó (kéo thả file trên giao diện GitHub, hoặc dùng Git nếu bạn quen).

## Bước 5: Deploy lên Vercel

1. Vào https://vercel.com → đăng nhập bằng tài khoản GitHub.
2. Bấm **Add New** → **Project** → chọn repo bạn vừa tạo ở Bước 4.
3. Ở phần **Environment Variables**, thêm 2 biến (lấy từ Bước 3):
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
4. Bấm **Deploy**. Đợi khoảng 1 phút.
5. Xong! Vercel sẽ cho bạn một link dạng `https://ten-project.vercel.app` — đây là link web thật, ai có link đều mở được, dữ liệu dùng chung cho cả team.

## Sau khi deploy

- Mỗi khi bạn nhờ mình sửa thêm tính năng, mình sẽ gửi lại file code mới — bạn chỉ cần thay file đó vào repo GitHub, Vercel sẽ tự deploy lại bản mới trong khoảng 1 phút.
- Muốn dùng tên miền riêng (VD: `soso.cuahangban.com`) thì vào **Settings → Domains** trong Vercel để gắn thêm.
