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
};
