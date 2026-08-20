/* =====================================================
   1. FIREBASE CONFIGURATION
===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDn4WPWd-ijhbroy76l3quRn3IC4SlcyeQ",
  authDomain: "tess-9dcdd.firebaseapp.com",
  databaseURL: "https://tess-9dcdd-default-rtdb.firebaseio.com",
  projectId: "tess-9dcdd",
  storageBucket: "tess-9dcdd.firebasestorage.app",
  messagingSenderId: "1034836978101",
  appId: "1:1034836978101:web:b697114908e17a6955d1fc",
  measurementId: "G-4ZFH5WRCSD"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State Global
let productsData = {};
let cart = [];
let currentKasir = "";

// Akun Kasir / User Terdaftar
const validUsers = {
  "arz123": "123",
  "kasir1": "123",
  "admin": "admin123"
};

/* =====================================================
   2. SHIFT & USER LOGIN
===================================================== */
const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const appDashboard = document.getElementById("appDashboard");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (validUsers[user] && validUsers[user] === pass) {
    currentKasir = user;
    localStorage.setItem("pos_user", user);
    initApp();
    logActivity(`Login / Buka Shift Kasir (${user})`);
  } else {
    alert("Username atau Password Salah!");
  }
});

if (localStorage.getItem("pos_user")) {
  currentKasir = localStorage.getItem("pos_user");
  initApp();
}

function initApp() {
  loginScreen.classList.add("hidden");
  appDashboard.classList.remove("hidden");
  document.getElementById("activeUser").textContent = "Kasir: " + currentKasir;
}

function logout() {
  logActivity(`Logout / Tutup Shift Kasir (${currentKasir})`);
  localStorage.removeItem("pos_user");
  location.reload();
}

/* =====================================================
   3. AUDIT LOG & REALTIME DATABASE
===================================================== */
function logActivity(action) {
  const logId = "LOG-" + Date.now();
  db.ref("activity_logs/" + logId).set({
    time: new Date().toLocaleString("id-ID"),
    kasir: currentKasir,
    action: action
  });
}

// Listener Produk
db.ref("products").on("value", (snapshot) => {
  productsData = snapshot.val() || {};
  renderProductGrid(productsData);
  renderProductTable(productsData);
  document.getElementById("statTotalProducts").textContent = Object.keys(productsData).length;
});

// Listener Kas Toko
db.ref("store_cash").on("value", (snapshot) => {
  const cashData = snapshot.val() || {};
  renderCashTable(cashData);
});

// Listener Transaksi Penjualan
db.ref("transactions").on("value", (snapshot) => {
  const transactions = snapshot.val() || {};
  renderReportTable(transactions);
  calculateTodayIncome(transactions);
});

// Listener Log Aktivitas
db.ref("activity_logs").on("value", (snapshot) => {
  const logs = snapshot.val() || {};
  renderLogTable(logs);
});

/* =====================================================
   4. MANAJEMEN KAS TOKO (KEUANGAN)
===================================================== */
document.getElementById("cashForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const type = document.getElementById("cashType").value;
  const amount = Number(document.getElementById("cashAmount").value) || 0;
  const note = document.getElementById("cashNote").value.trim();

  const cashId = "CASH-" + Date.now();
  db.ref("store_cash/" + cashId).set({
    time: new Date().toLocaleString("id-ID"),
    type: type,
    amount: amount,
    note: note,
    kasir: currentKasir
  }).then(() => {
    logActivity(`Transaksi Kas (${type.toUpperCase()}): Rp ${amount.toLocaleString('id-ID')} - ${note}`);
    document.getElementById("cashForm").reset();
  });
});

function renderCashTable(cashData) {
  const tbody = document.getElementById("cashTableBody");
  tbody.innerHTML = "";
  let totalBalance = 0;

  const keys = Object.keys(cashData).reverse();
  keys.forEach((key) => {
    const c = cashData[key];
    if (c.type === "in") totalBalance += c.amount;
    else totalBalance -= c.amount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.time}</td>
      <td><span class="${c.type === 'in' ? 'badge-in' : 'badge-out'}">${c.type === 'in' ? 'MASUK' : 'KELUAR'}</span></td>
      <td>Rp ${c.amount.toLocaleString("id-ID")}</td>
      <td>${escapeHtml(c.note)}</td>
      <td>${c.kasir}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("statStoreBalance").textContent = "Rp " + totalBalance.toLocaleString("id-ID");
}

/* =====================================================
   5. TRANSAKSI KASIR & STRUK
===================================================== */
function renderProductGrid(data) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";
  
  const keys = Object.keys(data);
  if (keys.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1;" class="text-center">Tidak ada produk</p>`;
    return;
  }

  keys.forEach((key) => {
    const p = data[key];
    const card = document.createElement("div");
    card.className = "product-card-item";
    card.onclick = () => addToCart(p.id);
    card.innerHTML = `
      <h4>${escapeHtml(p.name)}</h4>
      <div class="price">Rp ${p.price.toLocaleString("id-ID")}</div>
      <div class="stock">Stok: ${p.stock}</div>
    `;
    grid.appendChild(card);
  });
}

function filterProducts() {
  const query = document.getElementById("searchProduct").value.toLowerCase();
  const filtered = {};
  Object.keys(productsData).forEach((key) => {
    const p = productsData[key];
    if (p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)) filtered[key] = p;
  });
  renderProductGrid(filtered);
}

function addToCart(productId) {
  const product = productsData[productId];
  if (!product || product.stock <= 0) return alert("Stok Habis!");

  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    if (existingItem.qty + 1 > product.stock) return alert("Stok tidak mencukupi!");
    existingItem.qty += 1;
    existingItem.subtotal = existingItem.qty * existingItem.price;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, subtotal: product.price });
  }
  renderCart();
}

function renderCart() {
  const cartTableBody = document.getElementById("cartTableBody");
  cartTableBody.innerHTML = "";
  if (cart.length === 0) {
    cartTableBody.innerHTML = `<tr><td colspan="4" class="text-center">Keranjang Masih Kosong</td></tr>`;
    document.getElementById("cartTotal").textContent = "Rp 0";
    calculateChange();
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    total += item.subtotal;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.qty}x</td>
      <td>Rp ${item.subtotal.toLocaleString("id-ID")}</td>
      <td><i class="fa-solid fa-trash" style="color:#ef4444; cursor:pointer;" onclick="removeFromCart(${index})"></i></td>
    `;
    cartTableBody.appendChild(row);
  });

  document.getElementById("cartTotal").textContent = "Rp " + total.toLocaleString("id-ID");
  calculateChange();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function calculateChange() {
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const payAmount = Number(document.getElementById("payAmount").value) || 0;
  const change = payAmount - grandTotal;
  const changeEl = document.getElementById("changeAmount");
  changeEl.textContent = (change >= 0 ? "Rp " : "- Rp ") + Math.abs(change).toLocaleString("id-ID");
  changeEl.style.color = change >= 0 ? "#10b981" : "#ef4444";
}

function checkout() {
  if (cart.length === 0) return alert("Keranjang kosong!");
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const payAmount = Number(document.getElementById("payAmount").value) || 0;
  if (payAmount < grandTotal) return alert("Uang Pembayaran Kurang!");

  const txId = "TX-" + Date.now();
  const txData = {
    id: txId,
    time: new Date().toLocaleString("id-ID"),
    kasir: currentKasir,
    items: cart,
    total: grandTotal,
    pay: payAmount,
    change: payAmount - grandTotal
  };

  db.ref("transactions/" + txId).set(txData).then(() => {
    // Tambah Saldo Kas Pemasukan
    db.ref("store_cash/CASH-" + Date.now()).set({
      time: new Date().toLocaleString("id-ID"),
      type: "in",
      amount: grandTotal,
      note: `Penjualan ${txId}`,
      kasir: currentKasir
    });

    // Potong Stok Produk
    cart.forEach((item) => {
      const currentStock = productsData[item.id].stock;
      db.ref("products/" + item.id + "/stock").set(Math.max(0, currentStock - item.qty));
    });

    logActivity(`Transaksi Penjualan (${txId}) Total: Rp ${grandTotal.toLocaleString('id-ID')}`);
    printReceipt(txData);
    cart = [];
    document.getElementById("payAmount").value = "";
    renderCart();
  });
}

function printReceipt(tx) {
  const printArea = document.getElementById("receiptPrintArea");
  let itemsHtml = "";
  tx.items.forEach((item) => {
    itemsHtml += `<div style="display:flex; justify-content:space-between;"><span>${item.name} x${item.qty}</span><span>Rp ${item.subtotal.toLocaleString("id-ID")}</span></div>`;
  });

  printArea.innerHTML = `
    <div style="text-align:center;">
      <h3 style="margin:0;">ArizkyMart POS</h3>
      <p style="font-size:10px; margin:2px 0;">ID: ${tx.id} | Kasir: ${tx.kasir}</p>
      <p style="font-size:10px; margin:2px 0;">${tx.time}</p>
      <p>--------------------------------</p>
    </div>
    ${itemsHtml}
    <p>--------------------------------</p>
    <div style="display:flex; justify-content:space-between;"><strong>TOTAL:</strong> <strong>Rp ${tx.total.toLocaleString("id-ID")}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Bayar:</span> <span>Rp ${tx.pay.toLocaleString("id-ID")}</span></div>
    <div style="display:flex; justify-content:space-between;"><span>Kembalian:</span> <span>Rp ${tx.change.toLocaleString("id-ID")}</span></div>
  `;
  window.print();
}

/* =====================================================
   6. KELOLA PRODUK & AUTO POTONG KAS
===================================================== */
const productForm = document.getElementById("productForm");
productForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const editId = document.getElementById("editId").value;
  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value) || 0;
  const stock = Number(document.getElementById("productStock").value) || 0;

  const prodId = editId ? editId : "PROD-" + Date.now();
  
  db.ref("products/" + prodId).set({ id: prodId, name, price, stock }).then(() => {
    if (!editId && stock > 0) {
      // Potong Kas Toko untuk Modal Produk Baru
      const modalCost = price * stock * 0.7; // Asumsi Modal/HPP 70% dari harga jual
      db.ref("store_cash/CASH-" + Date.now()).set({
        time: new Date().toLocaleString("id-ID"),
        type: "out",
        amount: modalCost,
        note: `Beli Stok Produk (${name} x${stock})`,
        kasir: currentKasir
      });
    }
    logActivity(`Simpan/Update Produk: ${name}`);
    resetProductForm();
  });
});

function renderProductTable(data) {
  const tbody = document.getElementById("productTableBody");
  tbody.innerHTML = "";
  Object.keys(data).forEach((key) => {
    const p = data[key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><code>${p.id}</code></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>Rp ${p.price.toLocaleString("id-ID")}</td>
      <td>${p.stock}</td>
      <td>
        <button onclick="editProduct('${p.id}')" style="background:#3b82f6; border:none; color:#fff; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
        <button onclick="deleteProduct('${p.id}')" style="background:#ef4444; border:none; color:#fff; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editProduct(id) {
  const p = productsData[id];
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productPrice").value = p.price;
  document.getElementById("productStock").value = p.stock;
  document.getElementById("formTitle").innerHTML = `<i class="fa-solid fa-pen"></i> Edit Produk`;
  document.getElementById("btnCancel").style.display = "inline-block";
}

function deleteProduct(id) {
  if (confirm("Hapus produk ini?")) {
    db.ref("products/" + id).remove();
    logActivity(`Hapus Produk ID: ${id}`);
  }
}

function resetProductForm() {
  document.getElementById("editId").value = "";
  productForm.reset();
  document.getElementById("formTitle").innerHTML = `<i class="fa-solid fa-plus-circle"></i> Tambah Produk Baru`;
  document.getElementById("btnCancel").style.display = "none";
}

/* =====================================================
   7. LAPORAN & AUDIT LOG TABLE
===================================================== */
function renderReportTable(transactions) {
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = "";
  const keys = Object.keys(transactions).reverse();

  if(keys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada transaksi</td></tr>`;
    return;
  }

  keys.forEach((key) => {
    const tx = transactions[key];
    const itemDetails = tx.items.map((i) => `${i.name} (${i.qty}x)`).join(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.time}</td>
      <td><code>${tx.id}</code></td>
      <td><span class="badge-in">${tx.kasir || 'arz123'}</span></td>
      <td>${itemDetails}</td>
      <td style="color:#10b981;"><strong>Rp ${tx.total.toLocaleString("id-ID")}</strong></td>
    `;
    tbody.appendChild(row);
  });
}

function renderLogTable(logs) {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";
  const keys = Object.keys(logs).reverse();

  if(keys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center">Belum ada aktivitas</td></tr>`;
    return;
  }

  keys.forEach((key) => {
    const l = logs[key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${l.time}</td>
      <td><strong>${l.kasir}</strong></td>
      <td>${escapeHtml(l.action)}</td>
    `;
    tbody.appendChild(row);
  });
}

function calculateTodayIncome(transactions) {
  let total = 0;
  Object.keys(transactions).forEach((key) => { total += transactions[key].total || 0; });
  document.getElementById("statTodayIncome").textContent = "Rp " + total.toLocaleString("id-ID");
}

function switchTab(tabId, evt) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  
  document.getElementById(tabId).classList.add("active");
  if(evt) evt.currentTarget.classList.add("active");

  const titles = {
    "tab-pos": "Halaman Kasir",
    "tab-produk": "Kelola Stok Produk",
    "tab-keuangan": "Manajemen Kas Toko",
    "tab-laporan": "Laporan Penjualan Detail",
    "tab-log": "Audit Log Aktivitas"
  };
  document.getElementById("pageTitle").textContent = titles[tabId];
}

function escapeHtml(text) {
  return text ? text.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
}
