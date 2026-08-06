import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Users, ClipboardList, Plus, Trash2, Pencil, X, Search, ChevronDown, ChevronUp, Save, Image as ImageIcon, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { storage } from './storage.js';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
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

function Card({ children, style }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E3DFD3',
        borderRadius: 10,
        ...style,
      }}
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

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const load = async (key) => {
        try {
          const r = await storage.get(key);
          return r ? JSON.parse(r.value) : [];
        } catch {
          return [];
        }
      };
      const [m, p, c, o] = await Promise.all([
        load('materials'), load('products'), load('customers'), load('orders'),
      ]);
      setMaterials(m); setProducts(p); setCustomers(c); setOrders(o);
      setReady(true);
    })();
  }, []);

  const persist = async (key, data) => {
    try { await storage.set(key, JSON.stringify(data)); }
    catch (e) { console.error('Lỗi lưu dữ liệu', key, e); }
  };

  const saveMaterials = (d) => { setMaterials(d); persist('materials', d); };
  const saveProducts = (d) => { setProducts(d); persist('products', d); };
  const saveCustomers = (d) => { setCustomers(d); persist('customers', d); };
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
      const itemsText = (o.items || [])
        .map((it) => `${it.manual ? it.name : (productMap[it.productId]?.name || '(đã xoá)')} x${it.qty}`)
        .join('; ');
      const total = orderTotal(o);
      const remain = total - Number(o.depositAmount || 0);
      return {
        'Ngày đặt': o.orderDate || '', 'Ngày giao': o.deliveryDate || '', 'Khách hàng': custName,
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
          <Btn onClick={exportExcel}><Download size={14} /> Xuất Excel</Btn>
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
            <ProductsTab products={products} saveProducts={saveProducts} materials={materials} computeProductCost={computeProductCost} />
          )}
          {tab === 'menu' && (
            <MenuTab products={products} computeProductCost={computeProductCost} />
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
  const filtered = materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
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

function ProductsTab({ products, saveProducts, materials, computeProductCost }) {
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const openNew = () => setEditing({ id: uid(), name: '', laborCost: 0, profitPct: 20, materials: [], imageUrl: '', manualPrice: false, manualSellPrice: 0 });

  const submit = (data) => {
    const exists = products.some((p) => p.id === data.id);
    const next = exists ? products.map((p) => (p.id === data.id ? data : p)) : [...products, data];
    saveProducts(next);
    setEditing(null);
  };

  const remove = (id) => saveProducts(products.filter((p) => p.id !== id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn variant="primary" onClick={openNew}><Plus size={15} /> Thêm sản phẩm</Btn>
      </div>

      {products.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
          {materials.length === 0
            ? 'Hãy thêm vật liệu trước, sau đó tạo sản phẩm để tính giá bán tự động.'
            : 'Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {products.map((p) => {
            const { cost, sell } = computeProductCost(p);
            const isOpen = expanded === p.id;
            return (
              <Card key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : p.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isOpen ? <ChevronUp size={16} color="#8A8574" /> : <ChevronDown size={16} color="#8A8574" />}
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid #E3DFD3' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
          <ProductForm data={editing} materials={materials} onSubmit={submit} onCancel={() => setEditing(null)} computeProductCost={computeProductCost} />
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ data, materials, onSubmit, onCancel, computeProductCost }) {
  const [form, setForm] = useState(data);
  const [uploading, setUploading] = useState(false);
  const { cost, sell } = computeProductCost(form);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch (err) {
      console.error('Lỗi xử lý ảnh', err);
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

function MenuTab({ products, computeProductCost }) {
  const [search, setSearch] = useState('');
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (products.length === 0) {
    return (
      <Card style={{ padding: 24, textAlign: 'center', color: '#8A8574' }}>
        Chưa có sản phẩm nào. Thêm sản phẩm ở tab "Sản phẩm" (kèm ảnh) để hiện ở đây.
      </Card>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 18, maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A8574' }} />
        <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Tìm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {filtered.map((p) => {
          const { sell } = computeProductCost(p);
          return (
            <div key={p.id} style={{
              background: '#FFFFFF', borderRadius: 12, border: '1px solid #E3DFD3', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
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
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1E2A38' }}>{p.name}</div>
                <Money value={sell} size={14} bold />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomersTab({ customers, saveCustomers, orders }) {
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search));

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
    id: uid(), customerId: customers[0]?.id || '', customerName: '', orderDate: todayStr(), deliveryDate: '',
    status: 'moi', note: '', items: [], shippingFee: 0, depositAmount: 0,
    deliveryMethod: '', shippingCarrier: '', trackingCode: '', commission: 0, printRequest: '',
  });

  const submit = (data) => {
    const exists = orders.some((o) => o.id === data.id);
    const next = exists ? orders.map((o) => (o.id === data.id ? data : o)) : [...orders, data];
    saveOrders(next);
    setEditing(null);
  };

  const remove = (id) => saveOrders(orders.filter((o) => o.id !== id));

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
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{customerMap[o.customerId]?.name || o.customerName || '(Khách lẻ)'}</div>
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
                  <StatusStamp statusKey={o.status} />
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
                  {o.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>{it.manual ? it.name : (productMap[it.productId]?.name || '(đã xoá)')} × {it.qty}</span>
                      <span>{fmtVND(it.price * it.qty)}</span>
                    </div>
                  ))}
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
              <select style={inputStyle} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, customerName: '' })}>
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
        {(form.items || []).map((it, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
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
        ))}
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
