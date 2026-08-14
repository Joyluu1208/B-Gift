import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lớp này giả lập lại đúng cách gọi get/set như trong bản chat, nhưng dữ liệu
// được lưu trên Supabase (dùng chung cho mọi người, mọi máy) thay vì chỉ lưu
// trong trình duyệt.
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: JSON.stringify(data.value) };
  },
  async set(key, value) {
    const parsed = JSON.parse(value);
    const { error } = await supabase
      .from('kv_store')
      .upsert({ key, value: parsed, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value };
  },
  // Tải 1 file ảnh lên kho lưu trữ Supabase Storage, trả về link công khai (URL)
  // ngắn gọn để lưu vào sản phẩm — thay vì nhét cả ảnh vào dữ liệu JSON.
  async uploadImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  },
};

// Đăng nhập bằng tài khoản Supabase Auth — chỉ những email được tạo sẵn
// trong Supabase (Authentication > Users) mới đăng nhập được.
export const auth = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return data.subscription;
  },
  async signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};

// Gọi Edge Function "notify-new-order" (bạn tự tạo trên Supabase Dashboard)
// để gửi email báo cho team mỗi khi có đơn hàng mới.
export const notify = {
  async newOrder(payload) {
    try {
      await supabase.functions.invoke('notify-new-order', { body: payload });
    } catch (e) {
      console.error('Lỗi gửi email thông báo đơn hàng mới', e);
    }
  },
};
