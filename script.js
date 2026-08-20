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

/* =====================================================
   2. SISTEM LOGIN KEAMANAN
===================================================== */
const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const appDashboard = document.getElementById("appDashboard");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  // VALIDASI USERNAME & PASSWORD
  if (user === "arz123" && pass === "123") {
    loginScreen.classList.add("hidden");
    appDashboard.classList.remove("hidden");
    localStorage.setItem("pos_logged_in", "true");
  } else {
    alert("Username atau Password Salah!");
  }
});

// Auto Login Cek dari Session LocalStorage
if (localStorage.getItem("pos_logged_in") === "true") {
  loginScreen.classList.add("hidden");
  appDashboard.classList.remove("hidden");
}

function logout() {
  localStorage.removeItem("pos_logged_in");
  location.reload();
}

/* =====================================================
   3. REALTIME DATABASE LISTENERS
===================================================== */
// Load Realtime Data Produk
db.ref("products").on("value", (snapshot) => {
  productsData = snapshot.val() || {};
  renderProductGrid(productsData);
  renderProductTable(productsData);
  document.getElementById("statTotalProducts").textContent = Object.keys(productsData).length;
});

// Load Realtime Data Transaksi
db.ref("transactions").on("value", (snapshot) => {
  const transactions = snapshot.val() || {};
  renderHistoryTable(transactions);
  calculateTodayIncome(transactions);
});

/* =====================================================
   4. TAMPILAN KASIR & KERANJANG
===================================================== */
function renderProductGrid(data) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  const keys = Object.keys(data);
  if (keys.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#64748b;">Belum ada produk</p>`;
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
    if (p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)) {
      filtered[key] = p;
    }
  });

  renderProductGrid(filtered);
}

function addToCart(productId) {
  const product = productsData[productId];
  if (!product) return;

  if (product.stock <= 0) {
    alert("Stok Habis!");
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    if (existingItem.qty + 1 > product.stock) {
      alert("Stok produk tidak mencukupi!");
      return;
    }
    existingItem.qty += 1;
    existingItem.subtotal = existingItem.qty * existingItem.price;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      subtotal: product.price
    });
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
  if (change >= 0) {
    changeEl.textContent = "Rp " + change.toLocaleString("id-ID");
    changeEl.style.color = "#10b981";
  } else {
    changeEl.textContent = "- Rp " + Math.abs(change).toLocaleString("id-ID");
    changeEl.style.color = "#ef4444";
  }
}

function checkout() {
  if (cart.length === 0) {
    alert("Keranjang belanjaan kosong!");
    return;
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const payAmount = Number(document.getElementById("payAmount").value) || 0;

  if (payAmount < grandTotal) {
    alert("Uang Pembayaran Kurang!");
    return;
  }

  const change = payAmount - grandTotal;
  const txId = "TX-" + Date.now();
  const txTime = new Date().toLocaleString("id-ID");

  const txData = {
    id: txId,
    time: txTime,
    items: cart,
    total: grandTotal,
    pay: payAmount,
    change: change
  };

  // Simpan Transaksi & Update Stok di Firebase
  db.ref("transactions/" + txId).set(txData)
    .then(() => {
      cart.forEach((item) => {
        const currentStock = productsData[item.id].stock;
        const newStock = Math.max(0, currentStock - item.qty);
        db.ref("products/" + item.id + "/stock").set(newStock);
      });

      printReceipt(txData);
      cart = [];
      document.getElementById("payAmount").value = "";
      renderCart();
    })
    .catch((err) => alert("Error: " + err.message));
}

function printReceipt(tx) {
  const printArea = document.getElementById("receiptPrintArea");
  let itemsHtml = "";

  tx.items.forEach((item) => {
    itemsHtml += `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>${item.name} x${item.qty}</span>
        <span>Rp ${item.subtotal.toLocaleString("id-ID")}</span>
      </div>
    `;
  });

  printArea.innerHTML = `
    <div style="text-align:center;">
      <h3 style="margin:0;">ArizkyMart POS</h3>
      <p style="font-size:12px; margin:2px 0;">Struk Pembayaran Tunai</p>
      <p style="font-size:10px; margin:2px 0;">ID: ${tx.id} | ${tx.time}</p>
      <p>--------------------------------</p>
    </div>
    ${itemsHtml}
    <p>--------------------------------</p>
    <div style="display:flex; justify-content:space-between;"><strong>TOTAL:</strong> <strong>Rp ${tx.total.toLocaleString("id-ID")}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Bayar:</span> <span>Rp ${tx.pay.toLocaleString("id-ID")}</span></div>
    <div style="display:flex; justify-content:space-between;"><span>Kembalian:</span> <span>Rp ${tx.change.toLocaleString("id-ID")}</span></div>
    <p style="text-align:center; margin-top:15px; font-size:11px;">-- Terima Kasih --</p>
  `;

  window.print();
}

/* =====================================================
   5. CRUD KELOLA PRODUK
===================================================== */
const productForm = document.getElementById("productForm");
productForm.addEventListener("submit", function (e) {
  e.preventDefault();
  
  const editId = document.getElementById("editId").value;
  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value) || 0;
  const stock = Number(document.getElementById("productStock").value) || 0;

  const prodId = editId ? editId : "PROD-" + Date.now();
  db.ref("products/" + prodId).set({ id: prodId, name, price, stock })
    .then(() => resetProductForm());
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
  }
}

function resetProductForm() {
  document.getElementById("editId").value = "";
  productForm.reset();
  document.getElementById("formTitle").innerHTML = `<i class="fa-solid fa-plus-circle"></i> Tambah Produk Baru`;
  document.getElementById("btnCancel").style.display = "none";
}

/* =====================================================
   6. RIWAYAT & UTILS
===================================================== */
function renderHistoryTable(transactions) {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  const keys = Object.keys(transactions).reverse();
  keys.forEach((key) => {
    const tx = transactions[key];
    const itemsCount = tx.items.reduce((sum, item) => sum + item.qty, 0);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><code>${tx.id}</code></td>
      <td>${tx.time}</td>
      <td>${itemsCount} Item</td>
      <td style="color:#10b981;"><strong>Rp ${tx.total.toLocaleString("id-ID")}</strong></td>
      <td>Rp ${tx.pay.toLocaleString("id-ID")}</td>
      <td>Rp ${tx.change.toLocaleString("id-ID")}</td>
    `;
    tbody.appendChild(row);
  });
}

function calculateTodayIncome(transactions) {
  let total = 0;
  Object.keys(transactions).forEach((key) => {
    total += transactions[key].total || 0;
  });
  document.getElementById("statTodayIncome").textContent = "Rp " + total.toLocaleString("id-ID");
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");

  const titles = {
    "tab-pos": "Halaman Kasir",
    "tab-produk": "Kelola Stok Produk",
    "tab-riwayat": "Riwayat Penjualan"
  };
  document.getElementById("pageTitle").textContent = titles[tabId];
}

function escapeHtml(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
