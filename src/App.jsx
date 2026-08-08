import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Users, ClipboardList, Plus, Trash2, Pencil, X, Search, ChevronDown, ChevronUp, Save, Image as ImageIcon, Download, GripVertical, Check, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { storage, auth, notify } from './storage.js';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
const normalizeVN = (str) => (str || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');
const matchesSearch = (name, query) => normalizeVN(name).includes(normalizeVN(query));
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function fileToCompressedDataUrl(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS = [
  { key: 'moi', label: 'Mới', color: '#3D6B8A' },
  { key: 'dangLam', label: 'Đang làm', color: '#B8763B' },
  { key: 'hoanThanh', label: 'Hoàn thành', color: '#5C7A5E' },
  { key: 'daGiao', label: 'Đã giao', color: '#2F5233' },
  { key: 'huy', label: 'Đã huỷ', color: '#A8493F' },
];

const PRODUCT_CATEGORIES = ['Tháp bánh sinh nhật', 'Set túi quà sinh nhật', 'Hoa bánh kẹo'];

const PRODUCT_COLORS = [
  { key: 'hong', label: 'Hồng', hex: '#E88CA8' },
  { key: 'xanhla', label: 'Xanh Lá', hex: '#6FA96B' },
  { key: 'tim', label: 'Tím', hex: '#9B7EBD' },
  { key: 'xanhduong', label: 'Xanh Dương', hex: '#5B8DBE' },
  { key: 'do', label: 'Đỏ', hex: '#C1443C' },
  { key: 'vangnau', label: 'Vàng Nâu', hex: '#B8863C' },
  { key: 'khac', label: 'Khác', hex: '#9C9585' },
];

function StatusStamp({ statusKey }) {
  const s = STATUS.find((x) => x.key === statusKey) || STATUS[0];
  return (
    <span
      style={{
        display: 'inline-block',
        border: `1.5px dashed ${s.color}`,
        color: s.color,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '2px 8px',
        borderRadius: 3,
        transform: 'rotate(-2deg)',
        textTransform: 'uppercase',
        background: '#FAF9F5',
      }}
    >
      {s.label}
    </span>
  );
}

function StatusStampPicker({ statusKey, onChange }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
      <StatusStamp statusKey={statusKey} />
      <select
        value={statusKey}
        onChange={(e) => onChange(e.target.value)}
        title="Bấm để đổi trạng thái"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none' }}
      >
        {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </span>
  );
}

function Money({ value, size = 14, bold }) {
  return (
    <span
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: size,
        fontWeight: bold ? 700 : 500,
        color: '#7A4A16',
        background: '#FBF0DE',
        padding: '1px 6px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {fmtVND(value)}
    </span>
  );
}

function Card({ children, style, ...rest }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E3DFD3',
        borderRadius: 10,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: '#6B6759', marginBottom: 4, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #D7D2C2',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#FAF9F5',
  color: '#232019',
};

function Btn({ children, onClick, variant = 'default', style, type = 'button', disabled }) {
  const variants = {
    default: { background: '#FFFFFF', color: '#232019', border: '1px solid #D7D2C2' },
    primary: { background: '#1E2A38', color: '#FAF9F5', border: '1px solid #1E2A38' },
    danger: { background: '#FFFFFF', color: '#A8493F', border: '1px solid #E2B8B2' },
    ghost: { background: 'transparent', color: '#6B6759', border: '1px solid transparent' },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13.5,
        fontWeight: 600,
        padding: '7px 12px',
        borderRadius: 6,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(30,26,18,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px', zIndex: 50, overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FAF9F5', borderRadius: 12, width: '100%', maxWidth: width,
          border: '1px solid #E3DFD3', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: '1px solid #E3DFD3',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E2A38' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

async function loadKey(key) {
  try {
    const r = await storage.get(key);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}

async function saveKey(key, data) {
  try {
    await storage.set(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Lỗi lưu dữ liệu', key, e);
    return false;
  }
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await auth.signIn(email, password);
    setLoading(false);
    if (error) setError('Sai email hoặc mật khẩu.');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F2EFE6', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', padding: 16,
    }}>
      <form onSubmit={submit} style={{ background: '#fff', padding: 28, borderRadius: 12, border: '1px solid #E3DFD3', width: '100%', maxWidth: 320 }}>
        <h2 style={{ margin: '0 0 2px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1E2A38', fontSize: 22 }}>Bơ Gift Biên Hòa</h2>
        <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#8A8574' }}>Đăng nhập để vào trang quản lý</p>
        <Field label="Email">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Mật khẩu">
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <div style={{ color: '#A8493F', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        <Btn variant="primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Btn>
      </form>
    </div>
  );
}

function computeProductCostFor(prod, materialMap) {
  if (prod.manualPrice) {
    const sell = Number(prod.manualSellPrice || 0);
    return { cost: null, sell };
  }
  const matCost = (prod.materials || []).reduce((sum, mi) => {
    const m = materialMap[mi.materialId];
    return sum + (m ? m.unitPrice * mi.qty : 0);
  }, 0);
  const cost = matCost + Number(prod.laborCost || 0);
  const sell = cost * (1 + Number(prod.profitPct || 0) / 100);
  return { cost, sell };
}

function PublicMenuApp() {
  const [ready, setReady] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [customColors, setCustomColors] = useState([]);

  useEffect(() => {
    (async () => {
      const [m, p, cc, cl] = await Promise.all([
        loadKey('materials'), loadKey('products'), loadKey('customCategories'), loadKey('customColors'),
      ]);
      setMaterials(m); setProducts(p); setCustomCategories(cc); setCustomColors(cl);
      setReady(true);
    })();
  }, []);

  const materialMap = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);
  const computeProductCost = (prod) => computeProductCostFor(prod, materialMap);
  const allCategories = [...PRODUCT_CATEGORIES, ...customCategories];
  const allColors = [...PRODUCT_COLORS, ...customColors];

  if (!ready) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6B6759', fontFamily: 'ui-sans-serif, system-ui' }}>
        Đang tải...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', background: '#F2EFE6', minHeight: '100vh', color: '#232019' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px' }}>
        <header style={{ padding: '24px 0 16px', borderBottom: '2px solid #1E2A38' }}>
          <h1 style={{
            margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 24,
            fontWeight: 700, color: '#1E2A38', letterSpacing: '-0.01em',
          }}>
            Bơ Gift Biên Hòa
          </h1>
          <span style={{ fontSize: 12.5, color: '#8A8574', fontStyle: 'italic' }}>Bảng giá sản phẩm</span>
        </header>
        <main style={{ paddingTop: 20, paddingBottom: 60 }}>
          <MenuTab products={products} computeProductCost={computeProductCost} categories={allCategories} colors={allColors} />
        </main>
      </div>
    </div>
  );
}

function AdminApp() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [customColors, setCustomColors] = useState([]);

  useEffect(() => {
    auth.getSession().then(setSession);
    const sub = auth.onAuthChange((s) => setSession(s));
    return () => sub.unsubscribe && sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setReady(true); return; }
    (async () => {
      const [m, p, c, o, cc, cl] = await Promise.all([
        loadKey('materials'), loadKey('products'), loadKey('customers'), loadKey('orders'),
        loadKey('customCategories'), loadKey('customColors'),
      ]);
      setMaterials(m); setProducts(p); setCustomers(c); setOrders(o);
      setCustomCategories(cc); setCustomColors(cl);
      setReady(true);
    })();
  }, [session]);

  const persist = async (key, data) => {
    const ok = await saveKey(key, data);
    if (!ok) {
      window.alert('⚠️ Lưu KHÔNG thành công (mất mạng hoặc lỗi máy chủ). Vui lòng kiểm tra kết nối mạng và làm lại thao tác vừa rồi, nếu không dữ liệu sẽ không được lưu.');
    }
  };

  const saveMaterials = (d) => { setMaterials(d); persist('materials', d); };
  const saveProducts = (d) => { setProducts(d); persist('products', d); };
  const saveCustomers = (d) => { setCustomers(d); persist('customers', d); };
  const addCategory = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed || PRODUCT_CATEGORIES.includes(trimmed) || customCategories.includes(trimmed)) return;
    const next = [...customCategories, trimmed];
    setCustomCategories(next); persist('customCategories', next);
  };
  const addColor = (label, hex) => {
    const trimmed = (label || '').trim();
    if (!trimmed) return;
    const key = 'c_' + trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '') + '_' + uid().slice(-4);
    const next = [...customColors, { key, label: trimmed, hex: hex || '#9C9585' }];
    setCustomColors(next); persist('customColors', next);
    return key;
  };
  const removeCategory = (name) => {
    const next = customCategories.filter((c) => c !== name);
    setCustomCategories(next); persist('customCategories', next);
  };
  const removeColor = (key) => {
    const next = customColors.filter((c) => c.key !== key);
    setCustomColors(next); persist('customColors', next);
  };
  const editCategory = (oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed || trimmed === oldName) return;
    const nextCats = customCategories.map((c) => (c === oldName ? trimmed : c));
    setCustomCategories(nextCats); persist('customCategories', nextCats);
    const nextProducts = products.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p));
    setProducts(nextProducts); persist('products', nextProducts);
  };
  const editColor = (key, newLabel, newHex) => {
    const trimmed = (newLabel || '').trim();
    if (!trimmed) return;
    const next = customColors.map((c) => (c.key === key ? { ...c, label: trimmed, hex: newHex || c.hex } : c));
    setCustomColors(next); persist('customColors', next);
  };
  const reorderCategories = (next) => { setCustomCategories(next); persist('customCategories', next); };
  const reorderColors = (next) => { setCustomColors(next); persist('customColors', next); };
  const allCategories = [...PRODUCT_CATEGORIES, ...customCategories];
  const allColors = [...PRODUCT_COLORS, ...customColors];
  const saveOrders = (d) => { setOrders(d); persist('orders', d); };

  const materialMap = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const computeProductCost = (prod) => {
    if (prod.manualPrice) {
      const sell = Number(prod.manualSellPrice || 0);
      return { cost: null, sell };
    }
    const matCost = (prod.materials || []).reduce((sum, mi) => {
      const m = materialMap[mi.materialId];
      return sum + (m ? m.unitPrice * mi.qty : 0);
    }, 0);
    const cost = matCost + Number(prod.laborCost || 0);
    const sell = cost * (1 + Number(prod.profitPct || 0) / 100);
    return { cost, sell };
  };

  const orderTotal = (order) => (order.items || []).reduce((s, it) => s + it.price * it.qty, 0) + Number(order.shippingFee || 0);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const matSheet = materials.map((m) => ({
      'Tên vật liệu': m.name, 'Đơn vị': m.unit, 'SL tồn': Number(m.stockQty || 0),
      'Đơn giá': Number(m.unitPrice || 0), 'Thành tiền': Number(m.stockQty || 0) * Number(m.unitPrice || 0),
      'Ghi chú': m.note || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matSheet), 'Vật liệu');

    const prodSheet = products.map((p) => {
      const { cost, sell } = computeProductCost(p);
      return {
        'Tên sản phẩm': p.name,
        'Chế độ giá': p.manualPrice ? 'Nhập tay' : 'Tính theo vật liệu',
        'Giá vốn': cost == null ? '' : Math.round(cost),
        'Giá bán': Math.round(sell),
        'Chi phí công': Number(p.laborCost || 0),
        'Lợi nhuận %': Number(p.profitPct || 0),
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), 'Sản phẩm');

    const custSheet = customers.map((c) => ({
      'Tên khách hàng': c.name, 'SĐT': c.phone || '', 'Nguồn': c.source || '',
      'Tên Facebook': c.facebookName || '', 'Link Facebook': c.facebookLink || '',
      'Địa chỉ': c.address || '', 'Ngày liên hệ': c.contactDate || '',
      'Budget': Number(c.budget || 0), 'Ghi chú': c.note || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custSheet), 'Khách hàng');

    const orderSheet = orders.map((o) => {
      const custName = customerMap[o.customerId]?.name || o.customerName || '(Khách lẻ)';
      const custSource = customerMap[o.customerId]?.source || o.source || '';
      const itemsText = (o.items || [])
        .map((it) => `${it.manual ? it.name : (productMap[it.productId]?.name || '(đã xoá)')} x${it.qty}`)
        .join('; ');
      const total = orderTotal(o);
      const remain = total - Number(o.depositAmount || 0);
      return {
        'Ngày đặt': o.orderDate || '', 'Ngày giao': o.deliveryDate || '', 'Khách hàng': custName, 'Nguồn': custSource,
        'Trạng thái': STATUS.find((s) => s.key === o.status)?.label || o.status,
        'Sản phẩm': itemsText, 'Tổng tiền': total, 'Phí ship': Number(o.shippingFee || 0),
        'Hoa hồng': Number(o.commission || 0), 'Đã cọc': Number(o.depositAmount || 0),
        'Còn phải thu': remain > 0 ? remain : 0,
        'Hình thức giao': o.deliveryMethod || '', 'ĐV vận chuyển': o.shippingCarrier || '',
        'Mã vận đơn': o.trackingCode || '', 'Nội dung in': o.printRequest || '', 'Ghi chú': o.note || '',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderSheet), 'Đơn hàng');

    XLSX.writeFile(wb, `bo-gift-so-lieu-${todayStr()}.xlsx`);
  };

  const NAV = [
    { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'materials', label: 'Vật liệu', icon: Package },
    { key: 'products', label: 'Sản phẩm', icon: ShoppingBag },
    { key: 'menu', label: 'Menu sản phẩm', icon: ImageIcon },
    { key: 'customers', label: 'Khách hàng', icon: Users },
    { key: 'orders', label: 'Đơn hàng', icon: ClipboardList },
  ];

  if (!ready) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6B6759', fontFamily: 'ui-sans-serif, system-ui' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', background: '#F2EFE6', minHeight: '100vh', color: '#232019' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px' }}>
        <header style={{ padding: '24px 0 16px', borderBottom: '2px solid #1E2A38', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{
              margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26,
              fontWeight: 700, color: '#1E2A38', letterSpacing: '-0.01em',
            }}>
              Sổ Sách Kinh Doanh
            </h1>
            <span style={{ fontSize: 12.5, color: '#8A8574', fontStyle: 'italic' }}>
              Bơ Gift Biên Hòa
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#8A8574' }}>{session.user?.email}</span>
            <Btn onClick={exportExcel}><Download size={14} /> Xuất Excel</Btn>
            <Btn onClick={() => auth.signOut()}>Đăng xuất</Btn>
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E3DFD3', marginBottom: 20, overflowX: 'auto' }}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === key ? '2.5px solid #1E2A38' : '2.5px solid transparent',
                marginBottom: -1,
                color: tab === key ? '#1E2A38' : '#8A8574',
                fontWeight: tab === key ? 700 : 500, fontSize: 13.5, whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <main style={{ paddingBottom: 60 }}>
          {tab === 'dashboard' && (
            <Dashboard orders={orders} customers={customers} products={products} orderTotal={orderTotal} customerMap={customerMap} />
          )}
          {tab === 'materials' && (
            <MaterialsTab materials={materials} saveMaterials={saveMaterials} />
          )}
          {tab === 'products' && (
            <ProductsTab products={products} saveProducts={saveProducts} materials={materials} computeProductCost={computeProductCost}
              categories={allCategories} colors={allColors} onAddCategory={addCategory} onAddColor={addColor}
              customCategories={customCategories} customColors={customColors} onRemoveCategory={removeCategory} onRemoveColor={removeColor}
              onEditCategory={editCategory} onEditColor={editColor} onReorderCategories={reorderCategories} onReorderColors={reorderColors} />
          )}
          {tab === 'menu' && (
            <MenuTab products={products} computeProductCost={computeProductCost} categories={allCategories} colors={allColors} />
          )}
          {tab === 'customers' && (
            <CustomersTab customers={customers} saveCustomers={saveCustomers} orders={orders} />
          )}
          {tab === 'orders' && (
            <OrdersTab orders={orders} saveOrders={saveOrders} customers={customers} products={products}
              customerMap={customerMap} productMap={productMap} computeProductCost={computeProductCost} orderTotal={orderTotal} />
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <Card style={{ padding: '16px 18px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12.5, color: '#8A8574', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#1E2A38', fontFamily: 'ui-monospace, monospace' }}>{value}</div>
    </Card>
  );
}

function Dashboard({ orders, customers, products, orderTotal, customerMap }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthOrders = orders.filter((o) => (o.orderDate || '').startsWith(thisMonth));
  const revenue = monthOrders.filter((o) => o.status !== 'huy').reduce((s, o) => s + orderTotal(o), 0);
  const pending = orders.filter((o) => o.status === 'moi' || o.status === 'dangLam').length;
  const recent = [...orders].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || '')).slice(0, 6);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.toISOString().slice(0, 7), label: `T${d.getMonth() + 1}` });
    }
    return months.map(({ key, label }) => {
      const total = orders
        .filter((o) => (o.orderDate || '').startsWith(key) && o.status !== 'huy')
        .reduce((s, o) => s + orderTotal(o), 0);
      return { label, total };
    });
  }, [orders, orderTotal]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Khách hàng" value={customers.length} />
        <StatCard label="Sản phẩm" value={products.length} />
        <StatCard label="Đơn đang xử lý" value={pending} accent="#B8763B" />
        <StatCard label="Doanh thu tháng này" value={fmtVND(revenue)} accent="#5C7A5E" />
      </div>

      <h3 style={{ fontSize: 15, color: '#1E2A38', marginBottom: 10 }}>Doanh thu 6 tháng gần đây</h3>
      <Card style={{ padding: '16px 16px 8px', marginBottom: 24, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3DFD3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8A8574' }} axisLine={{ stroke: '#D7D2C2' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8A8574' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => (v >= 1000000 ? `${Math.round(v / 1000000)}tr` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
            <Tooltip formatter={(v) => fmtVND(v)} contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid #E3DFD3' }} />
            <Bar dataKey="total" name="Doanh thu" fill="#B8763B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <h3 style={{ fontSize: 15, color: '#1E2A38', marginBottom: 10 }}>Đơn hàng gần đây</h3>
      {recent.length === 0 ? (
        <Card style={{ padding: 20, color: '#8A8574', fontSize: 14 }}>Chưa có đơn hàng nào. Vào tab "Đơn hàng" để tạo đơn đầu tiên.</Card>
      ) : (
        <Card style={{ overflow: 'hidden' }}>
          {recent.map((o, i) => (
            <div key={o.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: i < recent.length - 1 ? '1px solid #EFEBDE' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{customerMap[o.customerId]?.name || o.customerName || '(Khách lẻ)'}</div>
                <div style={{ fontSize: 12, color: '#8A8574' }}>{o.orderDate}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Money value={orderTotal(o)} />
                <StatusStamp statusKey={o.status} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function MaterialsTab({ materials, saveMaterials }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const filtered = materials.filter((m) => matchesSearch(m.name, search));
  const totalStockValue = materials.reduce((s, m) => s + Number(m.stockQty || 0) * Number(m.unitPrice || 0), 0);

  const openNew = () => setEditing({ id: uid(), name: '', unit: '', unitPrice: 0, stockQty: 0, note: '' });

  const submit = (data) => {
    const exists = materials.some((m) => m.id === data.id);
    const next = exists ? materials.map((m) => (m.id === data.id ? data : m)) : [...materials, data];
    saveMaterials(next);
    setEditing(null);
  };

  const remove = (id) => saveMaterials(materials.filter((m) => m.id !== id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A8574' }} />
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Tìm vật liệu..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={15} /> Thêm vật liệu</Btn>
      </div>

      {materials.length > 0 && (
        <Card style={{ padding: '10px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6B6759', fontWeight: 600 }}>Tổng giá trị tồn kho</span>
          <Money value={totalStockValue} size={15} bold />
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
          {materials.length === 0 ? 'Chưa có vật liệu nào. Thêm vật liệu để bắt đầu tính giá vốn sản phẩm.' : 'Không tìm thấy vật liệu phù hợp.'}
        </Card>
      ) : (
        <Card style={{ overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.9fr 1fr 1.1fr 1.4fr auto', padding: '10px 16px', background: '#EFEBDE', fontSize: 12, fontWeight: 700, color: '#6B6759', minWidth: 720 }}>
            <div>Tên vật liệu</div><div>Đơn vị</div><div>SL tồn</div><div>Đơn giá</div><div>Thành tiền</div><div>Ghi chú</div><div></div>
          </div>
          {filtered.map((m, i) => (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.9fr 1fr 1.1fr 1.4fr auto', padding: '10px 16px', alignItems: 'center',
              borderTop: i > 0 ? '1px solid #EFEBDE' : 'none', fontSize: 13.5, minWidth: 720,
            }}>
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              <div style={{ color: '#6B6759' }}>{m.unit}</div>
              <div style={{ color: Number(m.stockQty) <= 0 ? '#A8493F' : '#232019', fontWeight: 600 }}>{m.stockQty || 0}</div>
              <div><Money value={m.unitPrice} size={12.5} /></div>
              <div><Money value={Number(m.stockQty || 0) * Number(m.unitPrice || 0)} size={12.5} bold /></div>
              <div style={{ color: '#8A8574', fontSize: 12.5 }}>{m.note}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setEditing(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759', padding: 4 }}><Pencil size={14} /></button>
                <button onClick={() => remove(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F', padding: 4 }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <Modal title={materials.some((m) => m.id === editing.id) ? 'Sửa vật liệu' : 'Thêm vật liệu'} onClose={() => setEditing(null)}>
          <MaterialForm data={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function MaterialForm({ data, onSubmit, onCancel }) {
  const [form, setForm] = useState(data);
  const thanhTien = Number(form.stockQty || 0) * Number(form.unitPrice || 0);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; onSubmit(form); }}>
      <Field label="Tên vật liệu">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Thép hộp 20x20" autoFocus />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Đơn vị">
            <input style={inputStyle} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, m, cái..." />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Số lượng tồn (nhập)">
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.stockQty || 0} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
          </Field>
        </div>
      </div>
      <Field label="Đơn giá nhập (đ)">
        <input style={inputStyle} type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
      </Field>
      <Field label="Ghi chú">
        <input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Nhà cung cấp, quy cách..." />
      </Field>
      <div style={{ background: '#EFEBDE', borderRadius: 8, padding: '10px 14px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
        <span>Thành tiền (tồn kho)</span>
        <Money value={thanhTien} size={14} bold />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn variant="primary" type="submit"><Save size={14} /> Lưu</Btn>
      </div>
    </form>
  );
}

function filterPillStyle(active, accent) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? (accent || '#1E2A38') : '#D7D2C2'}`,
    background: active ? (accent || '#1E2A38') : '#fff',
    color: active ? '#fff' : '#6B6759',
  };
}

function CategoryColorFilter({ category, setCategory, selectedColors, toggleColor, categories, colors }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={() => setCategory('')} style={filterPillStyle(category === '')}>Tất cả loại</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} style={filterPillStyle(category === c)}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => toggleColor(null)} style={filterPillStyle(selectedColors.length === 0)}>Tất cả màu</button>
        {colors.map((c) => (
          <button key={c.key} onClick={() => toggleColor(c.key)} style={filterPillStyle(selectedColors.includes(c.key), c.hex)}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
            {c.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: '#8A8574', alignSelf: 'center' }}>(chọn được nhiều màu)</span>
      </div>
    </div>
  );
}

function ProductsTab({ products, saveProducts, materials, computeProductCost, categories, colors, onAddCategory, onAddColor, customCategories, customColors, onRemoveCategory, onRemoveColor, onEditCategory, onEditColor, onReorderCategories, onReorderColors }) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColors, setFilterColors] = useState([]);
  const toggleFilterColor = (key) => {
    if (key === null) { setFilterColors([]); return; }
    setFilterColors((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const filtered = products.filter((p) =>
    matchesSearch(p.name, search) &&
    (!filterCategory || p.category === filterCategory) && (filterColors.length === 0 || filterColors.includes(p.color))
  );

  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDrop = (targetId, sourceIdFromEvent) => {
    const sourceId = dragId || sourceIdFromEvent;
    if (!sourceId || sourceId === targetId) { setDragOverId(null); return; }
    const next = [...products];
    const fromIdx = next.findIndex((p) => p.id === sourceId);
    const toIdx = next.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragOverId(null); return; }
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    saveProducts(next);
    setDragId(null);
    setDragOverId(null);
  };

  const openNew = () => setEditing({ id: uid(), name: '', laborCost: 0, profitPct: 20, materials: [], imageUrl: '', manualPrice: false, manualSellPrice: 0, category: '', color: '', description: '' });

  const submit = (data) => {
    const exists = products.some((p) => p.id === data.id);
    const next = exists ? products.map((p) => (p.id === data.id ? data : p)) : [...products, data];
    saveProducts(next);
    setEditing(null);
  };

  const remove = (id) => saveProducts(products.filter((p) => p.id !== id));

  const [managing, setManaging] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A8574' }} />
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Tìm sản phẩm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => setManaging(true)}>Quản lý loại &amp; màu</Btn>
          <Btn variant="primary" onClick={openNew}><Plus size={15} /> Thêm sản phẩm</Btn>
        </div>
      </div>

      {products.length > 0 && (
        <CategoryColorFilter category={filterCategory} setCategory={setFilterCategory} selectedColors={filterColors} toggleColor={toggleFilterColor} categories={categories} colors={colors} />
      )}

      {filtered.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
          {products.length === 0
            ? (materials.length === 0
              ? 'Hãy thêm vật liệu trước, sau đó tạo sản phẩm để tính giá bán tự động.'
              : 'Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.')
            : 'Không có sản phẩm nào khớp bộ lọc.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p) => {
            const { cost, sell } = computeProductCost(p);
            const isOpen = expanded === p.id;
            const colorInfo = colors.find((c) => c.key === p.color);
            return (
              <Card key={p.id} style={{
                padding: 0, overflow: 'hidden',
                opacity: dragId === p.id ? 0.4 : 1,
                border: dragOverId === p.id ? '2px dashed #1E2A38' : undefined,
              }}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(p.id); }}
                onDragLeave={() => setDragOverId((cur) => (cur === p.id ? null : cur))}
                onDrop={(e) => { e.preventDefault(); handleDrop(p.id, e.dataTransfer.getData('text/plain')); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : p.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', p.id);
                        setDragId(p.id);
                      }}
                      onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                      onClick={(e) => e.stopPropagation()}
                      title="Kéo để đổi vị trí"
                      style={{ cursor: 'grab', display: 'flex', color: '#B8B3A2' }}
                    >
                      <GripVertical size={16} />
                    </span>
                    {isOpen ? <ChevronUp size={16} color="#8A8574" /> : <ChevronDown size={16} color="#8A8574" />}
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid #E3DFD3' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</span>
                    {colorInfo && <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorInfo.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} title={colorInfo.label} />}
                    {p.category && <span style={{ fontSize: 11, color: '#8A8574', border: '1px solid #E3DFD3', borderRadius: 4, padding: '1px 6px' }}>{p.category}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {!p.manualPrice && (
                      <div style={{ fontSize: 12, color: '#8A8574' }}>Giá vốn <Money value={cost} size={12} /></div>
                    )}
                    <div style={{ fontSize: 12, color: '#8A8574' }}>Giá bán <Money value={sell} size={13} bold /></div>
                    <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759', padding: 4 }}><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); remove(p.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F', padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #EFEBDE', padding: '12px 16px', fontSize: 13 }}>
                    {p.description && (
                      <p style={{ color: '#4A4638', marginBottom: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.description}</p>
                    )}
                    {p.manualPrice ? (
                      <div style={{ color: '#8A8574' }}>Giá nhập tay, chưa tính theo vật liệu.</div>
                    ) : (
                      <>
                        {(p.materials || []).length === 0 ? (
                          <div style={{ color: '#8A8574' }}>Không có vật liệu nào được gán.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {p.materials.map((mi, idx) => {
                                const m = materials.find((x) => x.id === mi.materialId);
                                if (!m) return null;
                                return (
                                  <tr key={idx}>
                                    <td style={{ padding: '3px 0', color: '#232019' }}>{m.name}</td>
                                    <td style={{ padding: '3px 0', color: '#8A8574', textAlign: 'right' }}>{mi.qty} {m.unit}</td>
                                    <td style={{ padding: '3px 0 3px 12px', textAlign: 'right' }}><Money value={m.unitPrice * mi.qty} size={12} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        <div style={{ marginTop: 8, color: '#8A8574', fontSize: 12.5 }}>
                          Chi phí công: <Money value={p.laborCost} size={12} /> · Lợi nhuận: {p.profitPct}%
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={products.some((p) => p.id === editing.id) ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setEditing(null)} width={560}>
          <ProductForm data={editing} materials={materials} onSubmit={submit} onCancel={() => setEditing(null)} computeProductCost={computeProductCost}
            categories={categories} colors={colors} onAddCategory={onAddCategory} onAddColor={onAddColor} />
        </Modal>
      )}

      {managing && (
        <ManageCategoriesColorsModal
          customCategories={customCategories} customColors={customColors}
          onRemoveCategory={onRemoveCategory} onRemoveColor={onRemoveColor}
          onEditCategory={onEditCategory} onEditColor={onEditColor}
          onReorderCategories={onReorderCategories} onReorderColors={onReorderColors}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}

function ManageCategoriesColorsModal({ customCategories, customColors, onRemoveCategory, onRemoveColor, onEditCategory, onEditColor, onReorderCategories, onReorderColors, onClose }) {
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [editingColorKey, setEditingColorKey] = useState(null);
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#9C9585');
  const [dragCat, setDragCat] = useState(null);
  const [dragOverCat, setDragOverCat] = useState(null);
  const [dragColorKey, setDragColorKey] = useState(null);
  const [dragOverColorKey, setDragOverColorKey] = useState(null);

  const startEditCat = (c) => { setEditingCat(c); setCatName(c); };
  const saveEditCat = () => { onEditCategory(editingCat, catName); setEditingCat(null); };

  const startEditColor = (c) => { setEditingColorKey(c.key); setColorName(c.label); setColorHex(c.hex); };
  const saveEditColor = () => { onEditColor(editingColorKey, colorName, colorHex); setEditingColorKey(null); };

  const dropCategory = (targetName, sourceFromEvent) => {
    const source = dragCat || sourceFromEvent;
    if (!source || source === targetName) { setDragOverCat(null); return; }
    const next = [...customCategories];
    const fromIdx = next.indexOf(source);
    const toIdx = next.indexOf(targetName);
    if (fromIdx === -1 || toIdx === -1) { setDragOverCat(null); return; }
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderCategories(next);
    setDragCat(null); setDragOverCat(null);
  };

  const dropColor = (targetKey, sourceFromEvent) => {
    const source = dragColorKey || sourceFromEvent;
    if (!source || source === targetKey) { setDragOverColorKey(null); return; }
    const next = [...customColors];
    const fromIdx = next.findIndex((c) => c.key === source);
    const toIdx = next.findIndex((c) => c.key === targetKey);
    if (fromIdx === -1 || toIdx === -1) { setDragOverColorKey(null); return; }
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderColors(next);
    setDragColorKey(null); setDragOverColorKey(null);
  };

  return (
    <Modal title="Quản lý loại & màu" onClose={onClose} width={420}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2A38', marginBottom: 8 }}>Loại sản phẩm bạn đã thêm</div>
        {customCategories.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#8A8574' }}>Chưa có loại nào tự thêm.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customCategories.map((c) => (
              <div key={c} style={{
                padding: '6px 10px', background: '#F2EFE6', borderRadius: 6,
                opacity: dragCat === c ? 0.4 : 1,
                border: dragOverCat === c ? '2px dashed #1E2A38' : '2px dashed transparent',
              }}
                onDragOver={(e) => { e.preventDefault(); setDragOverCat(c); }}
                onDragLeave={() => setDragOverCat((cur) => (cur === c ? null : cur))}
                onDrop={(e) => { e.preventDefault(); dropCategory(c, e.dataTransfer.getData('text/plain')); }}
              >
                {editingCat === c ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input style={{ ...inputStyle, padding: '5px 8px' }} value={catName} autoFocus
                      onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditCat(); }} />
                    <button onClick={saveEditCat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C7A5E' }}><Check size={16} /></button>
                    <button onClick={() => setEditingCat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8574' }}><X size={16} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c); setDragCat(c); }}
                        onDragEnd={() => { setDragCat(null); setDragOverCat(null); }}
                        title="Kéo để đổi vị trí"
                        style={{ cursor: 'grab', display: 'flex', color: '#B8B3A2' }}
                      >
                        <GripVertical size={14} />
                      </span>
                      <span style={{ fontSize: 13 }}>{c}</span>
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEditCat(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759' }}><Pencil size={13} /></button>
                      <button onClick={() => onRemoveCategory(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#8A8574', marginTop: 6 }}>Các loại có sẵn (Tháp bánh sinh nhật, Set túi quà sinh nhật, Hoa bánh kẹo) không sửa/xoá được.</div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2A38', marginBottom: 8 }}>Màu sắc bạn đã thêm</div>
        {customColors.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#8A8574' }}>Chưa có màu nào tự thêm.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customColors.map((c) => (
              <div key={c.key} style={{
                padding: '6px 10px', background: '#F2EFE6', borderRadius: 6,
                opacity: dragColorKey === c.key ? 0.4 : 1,
                border: dragOverColorKey === c.key ? '2px dashed #1E2A38' : '2px dashed transparent',
              }}
                onDragOver={(e) => { e.preventDefault(); setDragOverColorKey(c.key); }}
                onDragLeave={() => setDragOverColorKey((cur) => (cur === c.key ? null : cur))}
                onDrop={(e) => { e.preventDefault(); dropColor(c.key, e.dataTransfer.getData('text/plain')); }}
              >
                {editingColorKey === c.key ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)}
                      style={{ width: 34, height: 32, padding: 2, border: '1px solid #D7D2C2', borderRadius: 6, flex: '0 0 auto', cursor: 'pointer' }} />
                    <input style={{ ...inputStyle, padding: '5px 8px' }} value={colorName} autoFocus
                      onChange={(e) => setColorName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditColor(); }} />
                    <button onClick={saveEditColor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C7A5E' }}><Check size={16} /></button>
                    <button onClick={() => setEditingColorKey(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8574' }}><X size={16} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <span
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.key); setDragColorKey(c.key); }}
                        onDragEnd={() => { setDragColorKey(null); setDragOverColorKey(null); }}
                        title="Kéo để đổi vị trí"
                        style={{ cursor: 'grab', display: 'flex', color: '#B8B3A2' }}
                      >
                        <GripVertical size={14} />
                      </span>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
                      {c.label}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEditColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759' }}><Pencil size={13} /></button>
                      <button onClick={() => onRemoveColor(c.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#8A8574', marginTop: 6 }}>Các màu có sẵn (Hồng, Xanh Lá, Tím, Xanh Dương, Đỏ, Vàng Nâu, Khác) không sửa/xoá được.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <Btn onClick={onClose}>Đóng</Btn>
      </div>
    </Modal>
  );
}

function ProductForm({ data, materials, onSubmit, onCancel, computeProductCost, categories, colors, onAddCategory, onAddColor }) {
  const [form, setForm] = useState(data);
  const [uploading, setUploading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingColor, setAddingColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#9C9585');
  const { cost, sell } = computeProductCost(form);

  const confirmNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name) { setAddingCategory(false); return; }
    onAddCategory(name);
    setForm({ ...form, category: name });
    setAddingCategory(false);
    setNewCategoryName('');
  };

  const confirmNewColor = () => {
    const name = newColorName.trim();
    if (!name) { setAddingColor(false); return; }
    const key = onAddColor(name, newColorHex);
    setForm({ ...form, color: key });
    setAddingColor(false);
    setNewColorName('');
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await storage.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      console.error('Lỗi tải ảnh lên', err);
    } finally {
      setUploading(false);
    }
  };

  const addMaterialRow = () => {
    if (materials.length === 0) return;
    setForm({ ...form, materials: [...(form.materials || []), { materialId: materials[0].id, qty: 1 }] });
  };
  const updateRow = (idx, field, value) => {
    const rows = [...form.materials];
    rows[idx] = { ...rows[idx], [field]: field === 'qty' ? Number(value) : value };
    setForm({ ...form, materials: rows });
  };
  const removeRow = (idx) => setForm({ ...form, materials: form.materials.filter((_, i) => i !== idx) });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; onSubmit(form); }}>
      <Field label="Tên sản phẩm">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Cửa sắt hoa văn" autoFocus />
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Loại sản phẩm">
            {addingCategory ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={inputStyle} autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Tên loại mới" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory(); } }} />
                <Btn type="button" variant="primary" onClick={confirmNewCategory} style={{ flex: '0 0 auto' }}>OK</Btn>
                <Btn type="button" onClick={() => setAddingCategory(false)} style={{ flex: '0 0 auto' }}><X size={14} /></Btn>
              </div>
            ) : (
              <select style={inputStyle} value={form.category || ''} onChange={(e) => {
                if (e.target.value === '__new__') { setAddingCategory(true); return; }
                setForm({ ...form, category: e.target.value });
              }}>
                <option value="">— Chọn loại —</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ Thêm loại mới...</option>
              </select>
            )}
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Màu sắc">
            {addingColor ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)}
                  style={{ width: 40, height: 38, padding: 2, border: '1px solid #D7D2C2', borderRadius: 6, flex: '0 0 auto', cursor: 'pointer' }} />
                <input style={inputStyle} autoFocus value={newColorName} onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="Tên màu mới" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewColor(); } }} />
                <Btn type="button" variant="primary" onClick={confirmNewColor} style={{ flex: '0 0 auto' }}>OK</Btn>
                <Btn type="button" onClick={() => setAddingColor(false)} style={{ flex: '0 0 auto' }}><X size={14} /></Btn>
              </div>
            ) : (
              <select style={inputStyle} value={form.color || ''} onChange={(e) => {
                if (e.target.value === '__new__') { setAddingColor(true); return; }
                setForm({ ...form, color: e.target.value });
              }}>
                <option value="">— Chọn màu —</option>
                {colors.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                <option value="__new__">+ Thêm màu mới...</option>
              </select>
            )}
          </Field>
        </div>
      </div>

      <Field label="Ảnh sản phẩm">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            flex: '0 0 64px', width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
            background: '#EFEBDE', border: '1px solid #D7D2C2', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon size={20} color="#B8B3A2" />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              padding: '7px 12px', borderRadius: 6, border: '1px solid #D7D2C2', background: '#fff',
              cursor: uploading ? 'default' : 'pointer', color: '#232019', opacity: uploading ? 0.6 : 1, width: 'fit-content',
            }}>
              <ImageIcon size={14} />
              {uploading ? 'Đang xử lý ảnh...' : form.imageUrl ? 'Đổi ảnh khác' : 'Chọn ảnh từ máy'}
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
            </label>
            {form.imageUrl && !uploading && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                style={{ background: 'none', border: 'none', color: '#A8493F', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                Xoá ảnh
              </button>
            )}
          </div>
        </div>
      </Field>

      <Field label="Mô tả sản phẩm (thành phần, quy cách...)">
        <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="VD: Gồm bánh kem vani, sữa tươi, hoa hồng giấy, hộp quà 20x20cm..." />
      </Field>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        background: '#EFEBDE', borderRadius: 8, padding: '10px 12px', marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2A38' }}>Tự nhập giá bán tay</div>
          <div style={{ fontSize: 11.5, color: '#8A8574' }}>Bật lên nếu chưa kịp nhập đủ vật liệu — gõ thẳng giá bán, khỏi cần tính</div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flex: '0 0 auto', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.manualPrice} onChange={(e) => setForm({ ...form, manualPrice: e.target.checked })}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer', zIndex: 1 }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 22, cursor: 'pointer', pointerEvents: 'none',
            background: form.manualPrice ? '#1E2A38' : '#D7D2C2', transition: 'background 0.15s',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: form.manualPrice ? 21 : 3, width: 16, height: 16,
              borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
            }} />
          </span>
        </label>
      </div>

      {form.manualPrice ? (
        <Field label="Giá bán (đ)">
          <input style={inputStyle} type="number" min="0" value={form.manualSellPrice || 0}
            onChange={(e) => setForm({ ...form, manualSellPrice: Number(e.target.value) })} placeholder="Nhập giá bán" autoFocus={!form.name} />
        </Field>
      ) : (
        <>
          <Field label="Vật liệu sử dụng">
            {materials.length === 0 ? (
              <div style={{ fontSize: 13, color: '#8A8574' }}>Chưa có vật liệu — thêm ở tab "Vật liệu" trước.</div>
            ) : (
              <>
                {(form.materials || []).map((mi, idx) => {
                  const m = materials.find((x) => x.id === mi.materialId);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <select style={{ ...inputStyle, flex: 2 }} value={mi.materialId} onChange={(e) => updateRow(idx, 'materialId', e.target.value)}>
                        {materials.map((mat) => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
                      </select>
                      <input style={{ ...inputStyle, flex: 1 }} type="number" min="0" step="0.01" value={mi.qty} onChange={(e) => updateRow(idx, 'qty', e.target.value)} />
                      <span style={{ fontSize: 12, color: '#8A8574', minWidth: 30 }}>{m?.unit}</span>
                      <button type="button" onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F' }}><Trash2 size={14} /></button>
                    </div>
                  );
                })}
                <Btn onClick={addMaterialRow} style={{ marginTop: 4 }}><Plus size={13} /> Thêm vật liệu</Btn>
              </>
            )}
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Chi phí công (đ)">
                <input style={inputStyle} type="number" min="0" value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: Number(e.target.value) })} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Lợi nhuận (%)">
                <input style={inputStyle} type="number" min="0" value={form.profitPct} onChange={(e) => setForm({ ...form, profitPct: Number(e.target.value) })} />
              </Field>
            </div>
          </div>
        </>
      )}

      <div style={{ background: '#EFEBDE', borderRadius: 8, padding: '10px 14px', marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
        {form.manualPrice ? (
          <span>Giá bán: <Money value={sell} size={14} bold /></span>
        ) : (
          <>
            <span>Giá vốn: <Money value={cost} size={13} /></span>
            <span>Giá bán đề xuất: <Money value={sell} size={14} bold /></span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn variant="primary" type="submit" disabled={uploading}><Save size={14} /> Lưu</Btn>
      </div>
    </form>
  );
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function downloadImage(url, filename) {
  // Trên điện thoại, tải file (download) sẽ lưu vào mục Tệp thay vì Album ảnh —
  // giới hạn của trình duyệt di động, không có cách nào ép lưu thẳng vào Photos
  // bằng code. Cách đúng là mở ảnh ra để khách nhấn giữ và chọn "Lưu ảnh".
  if (isMobileDevice()) {
    window.open(url, '_blank');
    return;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'anh-san-pham.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    window.open(url, '_blank');
  }
}

const MENU_PAGE_SIZE = 25;

function MenuTab({ products, computeProductCost, categories, colors }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColors, setFilterColors] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [preview, setPreview] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [page, setPage] = useState(1);
  const toggleFilterColor = (key) => {
    if (key === null) { setFilterColors([]); return; }
    setFilterColors((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const filtered = products.filter((p) => {
    const { sell } = computeProductCost(p);
    if (!matchesSearch(p.name, search)) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterColors.length > 0 && !filterColors.includes(p.color)) return false;
    if (minPrice !== '' && sell < Number(minPrice)) return false;
    if (maxPrice !== '' && sell > Number(maxPrice)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / MENU_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * MENU_PAGE_SIZE, currentPage * MENU_PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterCategory, filterColors, minPrice, maxPrice]);

  if (products.length === 0) {
    return (
      <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
        Chưa có sản phẩm nào. Thêm sản phẩm ở tab "Sản phẩm" (kèm ảnh) để hiện ở đây.
      </Card>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A8574' }} />
        <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Tìm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: '#6B6759', fontWeight: 600 }}>Khoảng giá:</span>
        <input type="number" min="0" placeholder="Từ (đ)" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
          style={{ ...inputStyle, width: 110, padding: '6px 10px' }} />
        <span style={{ color: '#8A8574' }}>—</span>
        <input type="number" min="0" placeholder="Đến (đ)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
          style={{ ...inputStyle, width: 110, padding: '6px 10px' }} />
        {(minPrice !== '' || maxPrice !== '') && (
          <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}
            style={{ fontSize: 12, color: '#A8493F', background: 'none', border: 'none', cursor: 'pointer' }}>Xoá khoảng giá</button>
        )}
      </div>
      <CategoryColorFilter category={filterCategory} setCategory={setFilterCategory} selectedColors={filterColors} toggleColor={toggleFilterColor} categories={categories} colors={colors} />
      {filtered.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>Không có sản phẩm nào khớp bộ lọc.</Card>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: '#8A8574', marginBottom: 10 }}>
            {filtered.length} sản phẩm{totalPages > 1 ? ` · Trang ${currentPage}/${totalPages}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {paged.map((p) => {
            const { sell } = computeProductCost(p);
            const colorInfo = colors.find((c) => c.key === p.color);
            return (
              <div key={p.id} onClick={() => setPreview(p)} style={{
                background: '#FFFFFF', borderRadius: 12, border: '1px solid #E3DFD3', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', cursor: 'pointer',
              }}>
                <div style={{ aspectRatio: '1 / 1', background: '#EFEBDE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div style={{ display: p.imageUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={28} color="#C7C2AE" />
                  </div>
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {colorInfo && <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorInfo.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />}
                    {p.category && <span style={{ fontSize: 10.5, color: '#8A8574' }}>{p.category}</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1E2A38' }}>{p.name}</div>
                  <Money value={sell} size={14} bold />
                </div>
              </div>
            );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>« Trước</Btn>
              <span style={{ fontSize: 13, color: '#6B6759', fontWeight: 600 }}>Trang {currentPage} / {totalPages}</span>
              <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Sau »</Btn>
            </div>
          )}
        </>
      )}

      {preview && (() => {
        const { sell } = computeProductCost(preview);
        const colorInfo = colors.find((c) => c.key === preview.color);
        return (
          <Modal title={preview.name} onClose={() => { setPreview(null); setFullscreen(false); }} width={480}>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#EFEBDE', marginBottom: 14, aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {preview.imageUrl ? (
                <>
                  <img src={preview.imageUrl} alt={preview.name} onClick={() => setFullscreen(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                  <button
                    onClick={() => setFullscreen(true)}
                    title="Xem toàn màn hình"
                    style={{
                      position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(30,42,56,0.85)', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Search size={14} /> Phóng to
                  </button>
                  <button
                    onClick={() => downloadImage(preview.imageUrl, `${preview.name || 'san-pham'}.jpg`)}
                    title="Tải ảnh về máy"
                    style={{
                      position: 'absolute', bottom: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(30,42,56,0.85)', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Download size={14} /> Tải ảnh về
                  </button>
                </>
              ) : (
                <ImageIcon size={40} color="#C7C2AE" />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {colorInfo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B6759' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorInfo.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
                  {colorInfo.label}
                </span>
              )}
              {preview.category && <span style={{ fontSize: 12, color: '#8A8574', border: '1px solid #E3DFD3', borderRadius: 4, padding: '1px 7px' }}>{preview.category}</span>}
            </div>
            {preview.description && (
              <p style={{ fontSize: 13.5, color: '#4A4638', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{preview.description}</p>
            )}
            <Money value={sell} size={18} bold />
          </Modal>
        );
      })()}

      {fullscreen && preview?.imageUrl && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(10,10,8,0.92)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out',
          }}
        >
          <img src={preview.imageUrl} alt={preview.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            style={{
              position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadImage(preview.imageUrl, `${preview.name || 'san-pham'}.jpg`); }}
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={15} /> Tải ảnh về
          </button>
          <div style={{
            position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap',
          }}>
            Trên điện thoại: nhấn giữ vào ảnh và chọn "Lưu ảnh" để lưu vào Album
          </div>
        </div>
      )}
    </div>
  );
}

function CustomersTab({ customers, saveCustomers, orders }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const filtered = customers.filter((c) => matchesSearch(c.name, search) || (c.phone || '').includes(search));

  const openNew = () => setEditing({
    id: uid(), name: '', phone: '', address: '', note: '',
    facebookName: '', facebookLink: '', source: '', contactDate: todayStr(), budget: 0,
  });

  const submit = (data) => {
    const exists = customers.some((c) => c.id === data.id);
    const next = exists ? customers.map((c) => (c.id === data.id ? data : c)) : [...customers, data];
    saveCustomers(next);
    setEditing(null);
  };

  const remove = (id) => saveCustomers(customers.filter((c) => c.id !== id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A8574' }} />
          <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Tìm theo tên hoặc SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={15} /> Thêm khách hàng</Btn>
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
          {customers.length === 0 ? 'Chưa có khách hàng nào.' : 'Không tìm thấy khách hàng phù hợp.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((c) => {
            const count = orders.filter((o) => o.customerId === c.id).length;
            return (
              <Card key={c.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: '#8A8574' }}>{c.phone}{c.address ? ` · ${c.address}` : ''}</div>
                  <div style={{ fontSize: 12, color: '#8A8574', marginTop: 2 }}>
                    {c.source && <span>Nguồn: {c.source}</span>}
                    {c.facebookName && <span>{c.source ? ' · ' : ''}FB: {c.facebookName}</span>}
                    {c.budget > 0 && <span> · Budget: {fmtVND(c.budget)}</span>}
                  </div>
                  {c.note && <div style={{ fontSize: 12, color: '#B8763B', marginTop: 2 }}>{c.note}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#8A8574' }}>{count} đơn</span>
                  <button onClick={() => setEditing(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759', padding: 4 }}><Pencil size={14} /></button>
                  <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={customers.some((c) => c.id === editing.id) ? 'Sửa khách hàng' : 'Thêm khách hàng'} onClose={() => setEditing(null)} width={520}>
          <CustomerForm data={editing} onSubmit={submit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

const CUSTOMER_SOURCES = [
  'Bách Hóa Nhà Bơ',
  'Bơ Gift',
  'Giỏ quà tết 3k follow',
  'Giỏ quà tết 30k follow',
  'Khách hàng cũ giới thiệu',
  'Khách cũ đã đặt hàng',
  'Khách liên hệ Zalo',
];

function CustomerForm({ data, onSubmit, onCancel }) {
  const [form, setForm] = useState(data);
  const isKnownSource = !form.source || CUSTOMER_SOURCES.includes(form.source);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; onSubmit(form); }}>
      <Field label="Tên khách hàng">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Số điện thoại">
            <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Nguồn">
            <select style={inputStyle} value={isKnownSource ? (form.source || '') : '__other__'}
              onChange={(e) => setForm({ ...form, source: e.target.value === '__other__' ? '' : e.target.value })}>
              <option value="">— Chọn nguồn —</option>
              {CUSTOMER_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__other__">Khác (tự nhập)...</option>
            </select>
            {!isKnownSource && (
              <input style={{ ...inputStyle, marginTop: 6 }} value={form.source || ''}
                onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Nhập nguồn khác" autoFocus />
            )}
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Tên Facebook">
            <input style={inputStyle} value={form.facebookName || ''} onChange={(e) => setForm({ ...form, facebookName: e.target.value })} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Link Facebook">
            <input style={inputStyle} value={form.facebookLink || ''} onChange={(e) => setForm({ ...form, facebookLink: e.target.value })} placeholder="https://facebook.com/..." />
          </Field>
        </div>
      </div>
      <Field label="Địa chỉ">
        <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>
      <Field label="Ngày liên hệ">
        <input style={inputStyle} type="date" value={form.contactDate || ''} onChange={(e) => setForm({ ...form, contactDate: e.target.value })} />
      </Field>
      <Field label="Budget dự kiến (đ)">
        <input style={inputStyle} type="number" min="0" value={form.budget || 0} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
      </Field>
      <Field label="Ghi chú">
        <input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn variant="primary" type="submit"><Save size={14} /> Lưu</Btn>
      </div>
    </form>
  );
}

function OrdersTab({ orders, saveOrders, customers, products, customerMap, productMap, computeProductCost, orderTotal }) {
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  let filtered = filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus);
  if (onlyUnpaid) filtered = filtered.filter((o) => orderTotal(o) - Number(o.depositAmount || 0) > 0);
  const sorted = [...filtered].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));

  const openNew = () => setEditing({
    id: uid(), customerId: customers[0]?.id || '', customerName: '', source: '', orderDate: todayStr(), deliveryDate: '',
    status: 'moi', note: '', items: [], shippingFee: 0, depositAmount: 0,
    deliveryMethod: '', shippingCarrier: '', trackingCode: '', commission: 0, printRequest: '',
  });

  const submit = (data) => {
    const exists = orders.some((o) => o.id === data.id);
    const next = exists ? orders.map((o) => (o.id === data.id ? data : o)) : [...orders, data];
    saveOrders(next);
    if (!exists) {
      notify.newOrder({
        customerName: customerMap[data.customerId]?.name || data.customerName || '(Khách lẻ)',
        orderDate: data.orderDate,
        total: fmtVND(orderTotal(data)),
        items: (data.items || []).map((it) => (it.manual ? it.name : (productMap[it.productId]?.name || ''))),
      });
    }
    setEditing(null);
  };

  const remove = (id) => saveOrders(orders.filter((o) => o.id !== id));

  const printOrder = (o) => {
    const custName = customerMap[o.customerId]?.name || o.customerName || '(Khách lẻ)';
    const custSource = customerMap[o.customerId]?.source || o.source || '';
    const custPhone = customerMap[o.customerId]?.phone || '';
    const custAddress = customerMap[o.customerId]?.address || '';
    const statusLabel = STATUS.find((s) => s.key === o.status)?.label || o.status;
    const total = orderTotal(o);
    const remain = total - Number(o.depositAmount || 0);
    const itemsRows = (o.items || []).map((it) => {
      const name = it.manual ? it.name : (productMap[it.productId]?.name || '(đã xoá)');
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #E3DFD3;">${name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E3DFD3;text-align:center;">${it.qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E3DFD3;text-align:right;">${fmtVND(it.price)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E3DFD3;text-align:right;">${fmtVND(it.price * it.qty)}</td>
      </tr>`;
    }).join('');

    const row = (label, value) => value ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;">
      <span style="color:#8A8574;">${label}</span><span style="font-weight:600;">${value}</span></div>` : '';

    const html = `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8" />
<title>Đơn hàng - ${custName}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color:#232019; padding:32px; max-width:640px; margin:0 auto; }
  h1 { font-family: Georgia, serif; font-size:22px; color:#1E2A38; margin:0 0 2px; }
  .sub { color:#8A8574; font-size:12px; margin-bottom:20px; }
  h2 { font-size:14px; color:#1E2A38; margin:18px 0 8px; border-bottom:2px solid #1E2A38; padding-bottom:4px; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  th { text-align:left; font-size:12px; color:#8A8574; padding:6px 8px; border-bottom:2px solid #1E2A38; }
  .total-box { background:#F2EFE6; border-radius:8px; padding:12px 14px; margin-top:14px; }
  .total-final { display:flex; justify-content:space-between; font-size:16px; font-weight:700; padding-top:6px; margin-top:6px; border-top:1px solid #D7D2C2; }
  @media print { body { padding:0; } }
</style></head>
<body>
  <h1>Bơ Gift Biên Hòa</h1>
  <div class="sub">Đơn hàng — In ngày ${todayStr()}</div>

  <h2>Thông tin khách hàng</h2>
  ${row('Tên khách', custName)}
  ${row('Số điện thoại', custPhone)}
  ${row('Địa chỉ', custAddress)}
  ${row('Nguồn', custSource)}

  <h2>Thông tin đơn hàng</h2>
  ${row('Trạng thái', statusLabel)}
  ${row('Ngày đặt', o.orderDate)}
  ${row('Ngày giao dự kiến', o.deliveryDate)}
  ${row('Hình thức giao', o.deliveryMethod)}
  ${row('Đơn vị vận chuyển', o.shippingCarrier)}
  ${row('Mã vận đơn', o.trackingCode)}
  ${row('Nội dung tag/yêu cầu in', o.printRequest)}
  ${row('Ghi chú', o.note)}

  <h2>Sản phẩm</h2>
  <table>
    <thead><tr><th>Tên sản phẩm</th><th style="text-align:center;">SL</th><th style="text-align:right;">Đơn giá</th><th style="text-align:right;">Thành tiền</th></tr></thead>
    <tbody>${itemsRows || '<tr><td colspan="4" style="padding:10px;color:#8A8574;">(chưa có sản phẩm)</td></tr>'}</tbody>
  </table>

  <div class="total-box">
    ${row('Phí ship', Number(o.shippingFee) > 0 ? fmtVND(o.shippingFee) : '')}
    ${row('Hoa hồng', Number(o.commission) > 0 ? '-' + fmtVND(o.commission) : '')}
    ${row('Đã cọc', Number(o.depositAmount) > 0 ? fmtVND(o.depositAmount) : '')}
    <div class="total-final"><span>Tổng tiền đơn hàng</span><span>${fmtVND(total)}</span></div>
    ${Number(o.depositAmount) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:${remain > 0 ? '#7A4A16' : '#2F5233'};margin-top:4px;">
      <span>${remain > 0 ? 'Còn phải thu' : 'Đã thu đủ'}</span><span>${remain > 0 ? fmtVND(remain) : ''}</span></div>` : ''}
  </div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { window.alert('Trình duyệt đang chặn cửa sổ popup — vui lòng cho phép popup để in đơn.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterStatus('all')} style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
            border: filterStatus === 'all' ? '1px solid #1E2A38' : '1px solid #D7D2C2',
            background: filterStatus === 'all' ? '#1E2A38' : '#fff',
            color: filterStatus === 'all' ? '#fff' : '#6B6759', fontWeight: 600,
          }}>Tất cả</button>
          {STATUS.map((s) => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
              border: `1px solid ${filterStatus === s.key ? s.color : '#D7D2C2'}`,
              background: filterStatus === s.key ? s.color : '#fff',
              color: filterStatus === s.key ? '#fff' : '#6B6759', fontWeight: 600,
            }}>{s.label}</button>
          ))}
          <button onClick={() => setOnlyUnpaid(!onlyUnpaid)} style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
            border: `1px solid ${onlyUnpaid ? '#B8763B' : '#D7D2C2'}`,
            background: onlyUnpaid ? '#B8763B' : '#fff',
            color: onlyUnpaid ? '#fff' : '#6B6759', fontWeight: 600,
          }}>Còn phải thu tiền</button>
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={15} /> Tạo đơn hàng</Btn>
      </div>

      {sorted.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>Không có đơn hàng nào.</Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((o) => (
            <Card key={o.id} style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{customerMap[o.customerId]?.name || o.customerName || '(Khách lẻ)'}</span>
                    {(customerMap[o.customerId]?.source || o.source) && (
                      <span style={{ fontSize: 11, color: '#7A4A16', background: '#FBF0DE', border: '1px solid #E9D3AC', borderRadius: 4, padding: '1px 7px' }}>
                        {customerMap[o.customerId]?.source || o.source}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8574' }}>
                    Đặt: {o.orderDate}{o.deliveryDate ? ` · Giao: ${o.deliveryDate}` : ''}
                    {o.deliveryMethod ? ` · ${o.deliveryMethod}` : ''}
                  </div>
                  {(o.shippingCarrier || o.trackingCode) && (
                    <div style={{ fontSize: 11.5, color: '#8A8574' }}>
                      {o.shippingCarrier}{o.trackingCode ? ` · Mã vận đơn: ${o.trackingCode}` : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Money value={orderTotal(o)} bold size={14} />
                  <StatusStampPicker statusKey={o.status} onChange={(newStatus) => saveOrders(orders.map((x) => (x.id === o.id ? { ...x, status: newStatus } : x)))} />
                  <button onClick={() => printOrder(o)} title="In đơn hàng" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759', padding: 4 }}><Printer size={14} /></button>
                  <button onClick={() => setEditing(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6759', padding: 4 }}><Pencil size={14} /></button>
                  <button onClick={() => remove(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              </div>
              {Number(o.depositAmount) > 0 && (() => {
                const remain = orderTotal(o) - Number(o.depositAmount);
                return (
                  <div style={{
                    marginTop: 8, display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5,
                    padding: '6px 10px', borderRadius: 6, background: remain > 0 ? '#FBF0DE' : '#EAF1E9',
                  }}>
                    <span style={{ color: '#5C7A5E', fontWeight: 600 }}>Đã cọc: {fmtVND(o.depositAmount)}</span>
                    {remain > 0 ? (
                      <span style={{ color: '#7A4A16', fontWeight: 700 }}>Còn phải thu: {fmtVND(remain)}</span>
                    ) : (
                      <span style={{ color: '#2F5233', fontWeight: 700 }}>Đã thu đủ</span>
                    )}
                  </div>
                );
              })()}
              {((o.items || []).length > 0 || Number(o.shippingFee) > 0) && (
                <div style={{ marginTop: 8, borderTop: '1px solid #EFEBDE', paddingTop: 8, fontSize: 12.5, color: '#6B6759' }}>
                  {o.items.map((it, i) => {
                    const prod = !it.manual ? productMap[it.productId] : null;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!it.manual && (
                            <span style={{
                              flex: '0 0 24px', width: 24, height: 24, borderRadius: 4, overflow: 'hidden',
                              background: '#EFEBDE', border: '1px solid #E3DFD3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {prod?.imageUrl ? (
                                <img src={prod.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <ImageIcon size={12} color="#B8B3A2" />
                              )}
                            </span>
                          )}
                          {it.manual ? it.name : (prod?.name || '(đã xoá)')} × {it.qty}
                        </span>
                        <span>{fmtVND(it.price * it.qty)}</span>
                      </div>
                    );
                  })}
                  {Number(o.shippingFee) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>Phí ship</span>
                      <span>{fmtVND(o.shippingFee)}</span>
                    </div>
                  )}
                  {Number(o.commission) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>Hoa hồng</span>
                      <span>-{fmtVND(o.commission)}</span>
                    </div>
                  )}
                </div>
              )}
              {o.printRequest && <div style={{ marginTop: 6, fontSize: 12, color: '#6B6759' }}>In: {o.printRequest}</div>}
              {o.note && <div style={{ marginTop: 4, fontSize: 12, color: '#B8763B' }}>{o.note}</div>}
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={orders.some((o) => o.id === editing.id) ? 'Sửa đơn hàng' : 'Tạo đơn hàng'} onClose={() => setEditing(null)} width={640}>
          <OrderForm data={editing} customers={customers} products={products} computeProductCost={computeProductCost} onSubmit={submit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function OrderForm({ data, customers, products, computeProductCost, onSubmit, onCancel }) {
  const [form, setForm] = useState(data);
  const itemsTotal = (form.items || []).reduce((s, it) => s + it.price * it.qty, 0);
  const total = itemsTotal + Number(form.shippingFee || 0);
  const revenue = total - Number(form.commission || 0);
  const isKnownOrderSource = !form.source || CUSTOMER_SOURCES.includes(form.source);

  const addProductItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    const { sell } = computeProductCost(p);
    setForm({ ...form, items: [...(form.items || []), { manual: false, productId: p.id, qty: 1, price: Math.round(sell) }] });
  };
  const addManualItem = () => {
    setForm({ ...form, items: [...(form.items || []), { manual: true, name: '', qty: 1, price: 0 }] });
  };
  const updateItem = (idx, field, value) => {
    const rows = [...form.items];
    if (field === 'productId') {
      const p = products.find((x) => x.id === value);
      const { sell } = computeProductCost(p);
      rows[idx] = { ...rows[idx], productId: value, price: Math.round(sell) };
    } else if (field === 'name') {
      rows[idx] = { ...rows[idx], name: value };
    } else {
      rows[idx] = { ...rows[idx], [field]: Number(value) };
    }
    setForm({ ...form, items: rows });
  };
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!form.customerId && !form.customerName.trim()) return; onSubmit(form); }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Khách hàng">
            {customers.length > 0 ? (
              <select style={inputStyle} value={form.customerId} onChange={(e) => {
                const cust = customers.find((c) => c.id === e.target.value);
                setForm({ ...form, customerId: e.target.value, customerName: '', source: form.source || cust?.source || form.source });
              }}>
                <option value="">— Nhập tên tay bên dưới —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 12.5, color: '#8A8574', marginBottom: 2 }}>Chưa có khách trong danh bạ — nhập tên tay bên dưới.</div>
            )}
            {!form.customerId && (
              <input style={{ ...inputStyle, marginTop: 6 }} value={form.customerName || ''}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Tên khách (không lưu vào danh bạ)" />
            )}
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Trạng thái">
            <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <Field label="Nguồn khách hàng">
        <select style={inputStyle} value={isKnownOrderSource ? (form.source || '') : '__other__'}
          onChange={(e) => setForm({ ...form, source: e.target.value === '__other__' ? '' : e.target.value })}>
          <option value="">— Chọn nguồn —</option>
          {CUSTOMER_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="__other__">Khác (tự nhập)...</option>
        </select>
        {!isKnownOrderSource && (
          <input style={{ ...inputStyle, marginTop: 6 }} value={form.source || ''}
            onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Nhập nguồn khác" />
        )}
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Ngày đặt">
            <input style={inputStyle} type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Ngày giao (dự kiến)">
            <input style={inputStyle} type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </Field>
        </div>
      </div>

      <Field label="Sản phẩm / nội dung trong đơn">
        {(form.items || []).map((it, idx) => {
          const selectedProduct = !it.manual ? products.find((p) => p.id === it.productId) : null;
          return (
            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              {!it.manual && (
                <div style={{
                  flex: '0 0 36px', width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                  background: '#EFEBDE', border: '1px solid #D7D2C2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedProduct?.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={15} color="#B8B3A2" />
                  )}
                </div>
              )}
              {it.manual ? (
                <input style={{ ...inputStyle, flex: 2 }} value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Tên/loại sản phẩm (nhập tay)" />
              ) : (
                <select style={{ ...inputStyle, flex: 2 }} value={it.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <input style={{ ...inputStyle, flex: '0 0 60px' }} type="number" min="1" value={it.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} title="Số lượng" />
              <input style={{ ...inputStyle, flex: '0 0 110px' }} type="number" min="0" value={it.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} title="Đơn giá bán" />
              <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8493F' }}><Trash2 size={14} /></button>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8 }}>
          {products.length > 0 && <Btn onClick={addProductItem}><Plus size={13} /> Chọn từ sản phẩm</Btn>}
          <Btn onClick={addManualItem}><Plus size={13} /> Nhập tay</Btn>
        </div>
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Hình thức giao hàng">
            <input style={inputStyle} value={form.deliveryMethod || ''} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })} placeholder="Ship COD, tự giao, khách tự lấy..." />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Đơn vị vận chuyển">
            <input style={inputStyle} value={form.shippingCarrier || ''} onChange={(e) => setForm({ ...form, shippingCarrier: e.target.value })} placeholder="GHN, GHTK, Ahamove..." />
          </Field>
        </div>
      </div>
      <Field label="Mã vận đơn">
        <input style={inputStyle} value={form.trackingCode || ''} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} />
      </Field>

      <Field label="Nội dung tag / yêu cầu in">
        <input style={inputStyle} value={form.printRequest || ''} onChange={(e) => setForm({ ...form, printRequest: e.target.value })} placeholder="Nội dung thiệp, tag cần in..." />
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Phí ship (đ)">
            <input style={inputStyle} type="number" min="0" value={form.shippingFee || 0} onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Hoa hồng (đ)">
            <input style={inputStyle} type="number" min="0" value={form.commission || 0} onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <Field label="Khách đã cọc (đ)">
        <div style={{ display: 'flex', gap: 6 }}>
          <input style={inputStyle} type="number" min="0" value={form.depositAmount || 0} onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })} />
          <button type="button" onClick={() => setForm({ ...form, depositAmount: Math.round(total / 2) })}
            style={{ flex: '0 0 auto', fontSize: 12, fontWeight: 700, padding: '0 10px', borderRadius: 6, border: '1px solid #D7D2C2', background: '#fff', color: '#6B6759', cursor: 'pointer' }}>
            50%
          </button>
        </div>
      </Field>

      <Field label="Ghi chú">
        <input style={inputStyle} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Yêu cầu riêng, địa điểm giao..." />
      </Field>

      <div style={{ background: '#EFEBDE', borderRadius: 8, padding: '10px 14px', marginTop: 4, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8A8574', marginBottom: 4 }}>
          <span>Tiền hàng</span><span>{fmtVND(itemsTotal)}</span>
        </div>
        {Number(form.shippingFee || 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8A8574', marginBottom: 4 }}>
            <span>Phí ship</span><span>{fmtVND(form.shippingFee)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #E3DFD3', marginBottom: 4 }}>
          <span>Tổng tiền đơn hàng</span>
          <Money value={total} size={15} bold />
        </div>
        {Number(form.commission || 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8A8574', marginBottom: 4 }}>
            <span>Hoa hồng</span><span>-{fmtVND(form.commission)}</span>
          </div>
        )}
        {Number(form.commission || 0) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#2F5233', marginBottom: 4 }}>
            <span>Doanh thu thực nhận</span><span>{fmtVND(revenue)}</span>
          </div>
        )}
        {Number(form.depositAmount || 0) > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5C7A5E', marginTop: 6 }}>
              <span>Đã cọc</span><span>{fmtVND(form.depositAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: total - form.depositAmount > 0 ? '#7A4A16' : '#2F5233' }}>
              <span>{total - form.depositAmount > 0 ? 'Còn phải thu' : 'Đã thu đủ'}</span>
              {total - form.depositAmount > 0 && <span>{fmtVND(total - form.depositAmount)}</span>}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn variant="primary" type="submit" disabled={!form.customerId && !form.customerName.trim()}><Save size={14} /> Lưu đơn hàng</Btn>
      </div>
    </form>
  );
}

export default function Root() {
  const isPublicMenu = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'menu';
  return isPublicMenu ? <PublicMenuApp /> : <AdminApp />;
}
