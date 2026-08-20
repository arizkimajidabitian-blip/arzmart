/* =====================================================
   FIREBASE CONFIG & INITIALIZATION
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDL7E1lUagmRaSsOIQixcINfGX-wLjUysE",
  authDomain: "arzmart-222af.firebaseapp.com",
  databaseURL: "https://arzmart-222af-default-rtdb.firebaseio.com",
  projectId: "arzmart-222af",
  storageBucket: "arzmart-222af.firebasestorage.app",
  messagingSenderId: "430534887642",
  appId: "1:430534887642:web:ca78c52c9b524d45fd7de3",
  measurementId: "G-RK7XJBS71Y"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* =====================================================
   DATA & VARIABLES
===================================================== */

let products = [];
let transactions = [];
let cart = [];
let paymentMethod = "Cash";
let chart = null;

const initialProducts = [
  { id: "1", name: "Aqua 600ml", price: 4000, stock: 20 },
  { id: "2", name: "Teh Botol", price: 5000, stock: 15 },
  { id: "3", name: "Indomie Goreng", price: 3500, stock: 30 },
  { id: "4", name: "Kopi Sachet", price: 2500, stock: 25 },
  { id: "5", name: "Roti Coklat", price: 6000, stock: 12 },
  { id: "6", name: "Susu Kotak", price: 7000, stock: 10 }
];

/* =====================================================
   FIREBASE REALTIME SINKRONISASI
===================================================== */

// Realtime Listener Produk
db.ref("products").on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    products = Object.values(data);
  } else {
    // Inisialisasi awal jika database online kosong
    initialProducts.forEach(p => {
      db.ref("products/" + p.id).set(p);
    });
    products = initialProducts;
  }
  refreshCurrentUI();
});

// Realtime Listener Transaksi
db.ref("transactions").on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    transactions = Object.values(data);
  } else {
    transactions = [];
  }
  refreshCurrentUI();
});

function refreshCurrentUI() {
  renderProducts();
  renderCart();
  updateDashboard();
  renderProductTable();
  renderTransactions();
}

/* =====================================================
   HELPER / UTILS
===================================================== */

function formatRp(val) {
  return "Rp" + Number(val || 0).toLocaleString("id-ID");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function toggleDark() {
  document.body.classList.toggle("dark");
}

/* =====================================================
   INIT & LOGIN
===================================================== */

function init() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("tanggal").innerText = now.toLocaleDateString('id-ID', options);
  refreshCurrentUI();
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === "admin" && password === "12345") {
    localStorage.setItem("arizky_login", "true");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    showToast("Selamat datang, Admin 👋");
    init();
  } else {
    showToast("Username atau password salah ❌");
  }
}

function logout() {
  localStorage.removeItem("arizky_login");
  location.reload();
}

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("arizky_login") === "true") {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    init();
  }
});

/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(id, element) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    kasir: "Kasir",
    produk: "Produk",
    laporan: "Laporan"
  };

  document.getElementById("pageTitle").innerText = titles[id];

  if (id === "dashboard") updateDashboard();
  if (id === "produk") renderProductTable();
  if (id === "laporan") renderTransactions();

  if (window.innerWidth < 700) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

/* =====================================================
   PRODUCTS MANAGEMENT
===================================================== */

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const keyword = (document.getElementById("searchProduct")?.value || "").toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(keyword));

  document.getElementById("jumlahProduk").innerText = filtered.length + " produk";
  grid.innerHTML = "";

  filtered.forEach(p => {
    const disabled = p.stock <= 0;
    grid.innerHTML += `
      <div class="product" onclick="${disabled ? "" : `addToCart('${p.id}')`}" style="${disabled ? "opacity:.5;cursor:not-allowed" : ""}">
        <div class="product-icon">${getProductIcon(p.name)}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${formatRp(p.price)}</div>
        <div class="stock">${p.stock > 0 ? "Stok " + p.stock : "STOK HABIS"}</div>
      </div>
    `;
  });
}

function getProductIcon(name) {
  name = name.toLowerCase();
  if (name.includes("aqua") || name.includes("air")) return "💧";
  if (name.includes("teh")) return "🧃";
  if (name.includes("kopi")) return "☕";
  if (name.includes("roti")) return "🍞";
  if (name.includes("susu")) return "🥛";
  if (name.includes("indomie") || name.includes("mie")) return "🍜";
  return "📦";
}

function renderProductTable() {
  const tbody = document.getElementById("productTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  products.forEach(p => {
    const status = p.stock > 5 ? `<span style="color:var(--success)">Tersedia</span>` : p.stock > 0 ? `<span style="color:var(--warning)">Menipis</span>` : `<span style="color:var(--danger)">Habis</span>`;
    tbody.innerHTML += `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${formatRp(p.price)}</td>
        <td>${p.stock}</td>
        <td>${status}</td>
        <td>
          <button class="btn btn-orange btn-sm" onclick="editProductModal('${p.id}')">✏️ Edit</button>
          <button class="btn btn-red btn-sm" onclick="deleteProduct('${p.id}')">🗑️ Hapus</button>
        </td>
      </tr>
    `;
  });
}

function openProductModal() {
  document.getElementById("editId").value = "";
  document.getElementById("productName").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("productStock").value = "";
  document.getElementById("productModalTitle").innerText = "Tambah Produk";
  document.getElementById("productModal").classList.add("show");
}

function editProductModal(id) {
  const p = products.find(prod => String(prod.id) === String(id));
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productPrice").value = p.price;
  document.getElementById("productStock").value = p.stock;
  document.getElementById("productModalTitle").innerText = "Edit Produk";
  document.getElementById("productModal").classList.add("show");
}

function saveProduct() {
  const editId = document.getElementById("editId").value;
  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value) || 0;
  const stock = Number(document.getElementById("productStock").value) || 0;

  if (!name || price <= 0) {
    showToast("Isi nama dan harga produk dengan benar!");
    return;
  }

  const prodId = editId ? String(editId) : String(Date.now());
  const productData = { id: prodId, name, price, stock };

  // Langsung set ke lokasi node ID spesifik di Firebase
  db.ref("products/" + prodId).set(productData).then(() => {
    closeModal("productModal");
    showToast("Produk tersimpan ✓");
  });
}

function deleteProduct(id) {
  if (confirm("Apakah kamu yakin ingin menghapus produk ini?")) {
    db.ref("products/" + id).remove().then(() => {
      showToast("Produk dihapus");
    });
  }
}

/* =====================================================
   CART & TRANSACTIONS
===================================================== */

function addToCart(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product || product.stock <= 0) {
    showToast("Stok habis!");
    return;
  }

  const item = cart.find(i => String(i.id) === String(id));
  if (item) {
    if (item.qty >= product.stock) {
      showToast("Stok tidak mencukupi!");
      return;
    }
    item.qty++;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  renderCart();
}

function changeQty(id, amount) {
  const item = cart.find(i => String(i.id) === String(id));
  if (!item) return;

  const product = products.find(p => String(p.id) === String(id));
  item.qty += amount;

  if (item.qty <= 0) {
    cart = cart.filter(i => String(i.id) !== String(id));
  } else if (product && item.qty > product.stock) {
    item.qty = product.stock;
    showToast("Jumlah melebihi stok!");
  }
  renderCart();
}

function removeCart(id) {
  cart = cart.filter(i => String(i.id) !== String(id));
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  renderCart();
  showToast("Keranjang dikosongkan");
}

function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:50px 10px;color:#94a3b8">
        <div style="font-size:45px">🛍️</div>
        <p style="margin-top:10px">Keranjang masih kosong</p>
      </div>
    `;
  }

  cart.forEach(item => {
    container.innerHTML += `
      <div class="cart-item">
        <div style="width:40px;height:40px;border-radius:10px;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:20px">
          ${getProductIcon(item.name)}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatRp(item.price)}</div>
          <div class="qty">
            <button onclick="changeQty('${item.id}', -1)">-</button>
            <span><b>${item.qty}</b></span>
            <button onclick="changeQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <b>${formatRp(item.price * item.qty)}</b><br>
          <button class="btn btn-red btn-sm" style="margin-top:8px;padding:3px 7px" onclick="removeCart('${item.id}')">✕</button>
        </div>
      </div>
    `;
  });

  const total = getSubtotal();
  document.getElementById("subtotal").innerText = formatRp(total);
  document.getElementById("diskon").innerText = "Rp0";
  document.getElementById("cartTotal").innerText = formatRp(total);
}

function openPayment() {
  if (cart.length === 0) {
    showToast("Keranjang masih kosong!");
    return;
  }
  const total = getSubtotal();
  document.getElementById("paymentTotal").innerText = formatRp(total);
  document.getElementById("cashInput").value = "";
  document.getElementById("change").innerText = "Rp0";
  document.getElementById("paymentModal").classList.add("show");
}

function selectPayment(method, el) {
  paymentMethod = method;
  document.querySelectorAll(".payment").forEach(p => p.classList.remove("active"));
  el.classList.add("active");

  const cashArea = document.getElementById("cashArea");
  if (cashArea) {
    cashArea.style.display = method === "Cash" ? "block" : "none";
  }
}

function calculateChange() {
  const total = getSubtotal();
  const cash = Number(document.getElementById("cashInput").value) || 0;
  const change = cash - total;
  document.getElementById("change").innerText = formatRp(change > 0 ? change : 0);
}

function completePayment() {
  const total = getSubtotal();
  const cash = Number(document.getElementById("cashInput").value) || 0;

  if (paymentMethod === "Cash" && cash < total) {
    showToast("Uang yang dimasukkan kurang!");
    return;
  }

  // Deduct Stock di Firebase
  cart.forEach(item => {
    const prod = products.find(p => String(p.id) === String(item.id));
    if (prod) {
      const newStock = Math.max(0, prod.stock - item.qty);
      db.ref("products/" + prod.id + "/stock").set(newStock);
    }
  });

  // Simpan Transaksi
  const transId = "TRX-" + Date.now();
  const transaction = {
    id: transId,
    date: new Date().toISOString(),
    method: paymentMethod,
    items: cart,
    total: total
  };

  db.ref("transactions/" + transId).set(transaction).then(() => {
    cart = [];
    closeModal("paymentModal");
    showToast("Transaksi berhasil! 🎉");
  });
}

function renderTransactions() {
  const tbody = document.getElementById("transactionTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach((t, i) => {
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString("id-ID") + " " + d.toLocaleTimeString("id-ID", {hour:'2-digit', minute:'2-digit'});
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${dateStr}</td>
        <td><b>${t.method}</b></td>
        <td>${formatRp(t.total)}</td>
        <td>
          <button class="btn btn-gray btn-sm" onclick="alert('Detail ID: ${t.id}')">👁️ Detail</button>
        </td>
      </tr>
    `;
  });
}

function clearTransactions() {
  if (confirm("Hapus seluruh riwayat transaksi?")) {
    db.ref("transactions").remove().then(() => {
      showToast("Riwayat dihapus");
    });
  }
}

/* =====================================================
   DASHBOARD STATS
===================================================== */

function updateDashboard() {
  const today = new Date().toDateString();

  const todayTrans = transactions.filter(t => new Date(t.date).toDateString() === today);
  const totalHariIni = todayTrans.reduce((sum, t) => sum + t.total, 0);
  
  let totalProdukTerjual = 0;
  transactions.forEach(t => {
    if (t.items) {
      t.items.forEach(i => totalProdukTerjual += i.qty);
    }
  });

  const stokMenipisCount = products.filter(p => p.stock <= 5).length;

  document.getElementById("jualHariIni").innerText = formatRp(totalHariIni);
  document.getElementById("totalTransaksi").innerText = transactions.length;
  document.getElementById("produkTerjual").innerText = totalProdukTerjual;
  document.getElementById("stokMenipis").innerText = stokMenipisCount;

  renderChart();
}

function renderChart() {
  const ctx = document.getElementById("grafik");
  if (!ctx) return;

  if (chart) chart.destroy();

  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const dataSales = [0, 0, 0, 0, 0, 0, 0];

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Penjualan',
        data: dataSales,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
