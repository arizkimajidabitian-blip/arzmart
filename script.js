/* =====================================================
   1. FIREBASE CONFIG & INITIALIZATION
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

// State Lokal
let productsData = {};
let cart = [];

/* =====================================================
   2. ELEMENT DOM REFERENCES
===================================================== */
const productForm = document.getElementById("productForm");
const productTableBody = document.getElementById("productTableBody");
const cartTableBody = document.getElementById("cartTableBody");
const historyTableBody = document.getElementById("historyTableBody");

const editIdInput = document.getElementById("editId");
const productNameInput = document.getElementById("productName");
const productPriceInput = document.getElementById("productPrice");
const productStockInput = document.getElementById("productStock");

const formTitle = document.getElementById("formTitle");
const btnSave = document.getElementById("btnSave");
const btnCancel = document.getElementById("btnCancel");

const cartTotalEl = document.getElementById("cartTotal");
const payAmountInput = document.getElementById("payAmount");
const changeAmountEl = document.getElementById("changeAmount");

/* =====================================================
   3. EVENT LISTENERS
===================================================== */
productForm.addEventListener("submit", function (e) {
  e.preventDefault();
  saveProduct();
});

/* =====================================================
   4. REALTIME DATABASE LISTENERS
===================================================== */
// Load Realtime Produk
db.ref("products").on("value", (snapshot) => {
  productsData = snapshot.val() || {};
  renderProductsTable(productsData);
});

// Load Realtime Riwayat Penjualan
db.ref("transactions").on("value", (snapshot) => {
  const transactions = snapshot.val() || {};
  renderHistoryTable(transactions);
});

/* =====================================================
   5. FITUR CRUD PRODUK
===================================================== */
function saveProduct() {
  const editId = editIdInput.value;
  const name = productNameInput.value.trim();
  const price = Number(productPriceInput.value) || 0;
  const stock = Number(productStockInput.value) || 0;

  if (!name || price <= 0) {
    alert("Isi nama dan harga produk dengan benar!");
    return;
  }

  const prodId = editId ? editId : "PROD-" + Date.now();
  const productData = { id: prodId, name, price, stock };

  db.ref("products/" + prodId).set(productData)
    .then(() => resetProductForm())
    .catch((err) => alert("Gagal menyimpan: " + err.message));
}

function renderProductsTable(data) {
  productTableBody.innerHTML = "";
  const keys = Object.keys(data);

  if (keys.length === 0) {
    productTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada produk tersimpan.</td></tr>`;
    return;
  }

  keys.forEach((key) => {
    const p = data[key];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><code>${p.id}</code></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>Rp ${p.price.toLocaleString("id-ID")}</td>
      <td>${p.stock}</td>
      <td class="action-btns">
        <button class="btn btn-add-cart" onclick="addToCart('${p.id}')">+ Kasir</button>
        <button class="btn btn-edit" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Hapus</button>
      </td>
    `;
    productTableBody.appendChild(row);
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

  renderProductsTable(filtered);
}

function editProduct(id) {
  const p = productsData[id];
  if (!p) return;

  editIdInput.value = p.id;
  productNameInput.value = p.name;
  productPriceInput.value = p.price;
  productStockInput.value = p.stock;

  formTitle.textContent = "Edit Produk (" + p.id + ")";
  btnSave.textContent = "Update Produk";
  btnCancel.style.display = "inline-block";
}

function deleteProduct(id) {
  if (confirm("Apakah kamu yakin ingin menghapus produk ini?")) {
    db.ref("products/" + id).remove().catch((err) => alert("Gagal hapus: " + err.message));
  }
}

function resetProductForm() {
  editIdInput.value = "";
  productForm.reset();
  formTitle.textContent = "Tambah Produk Baru";
  btnSave.textContent = "Simpan Produk";
  btnCancel.style.display = "none";
}

/* =====================================================
   6. FITUR KASIR & KERANJANG
===================================================== */
function addToCart(productId) {
  const product = productsData[productId];
  if (!product) return;

  if (product.stock <= 0) {
    alert("Stok produk habis!");
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    if (existingItem.qty + 1 > product.stock) {
      alert("Jumlah melebihi stok yang tersedia!");
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
  cartTableBody.innerHTML = "";

  if (cart.length === 0) {
    cartTableBody.innerHTML = `<tr><td colspan="4" class="text-center">Keranjang masih kosong</td></tr>`;
    cartTotalEl.textContent = "Rp 0";
    calculateChange();
    return;
  }

  let grandTotal = 0;

  cart.forEach((item, index) => {
    grandTotal += item.subtotal;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>
        <input type="number" value="${item.qty}" min="1" style="width: 50px; padding: 2px 4px;" onchange="updateCartQty(${index}, this.value)" />
      </td>
      <td>Rp ${item.subtotal.toLocaleString("id-ID")}</td>
      <td><button class="btn btn-danger" onclick="removeFromCart(${index})">X</button></td>
    `;
    cartTableBody.appendChild(row);
  });

  cartTotalEl.textContent = "Rp " + grandTotal.toLocaleString("id-ID");
  calculateChange();
}

function updateCartQty(index, newQty) {
  const qty = Number(newQty);
  const item = cart[index];
  const originalStock = productsData[item.id].stock;

  if (qty <= 0) {
    removeFromCart(index);
    return;
  }

  if (qty > originalStock) {
    alert("Stok tidak mencukupi! Maksimal: " + originalStock);
    renderCart();
    return;
  }

  item.qty = qty;
  item.subtotal = item.qty * item.price;
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function calculateChange() {
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const payAmount = Number(payAmountInput.value) || 0;
  const change = payAmount - grandTotal;

  if (change >= 0) {
    changeAmountEl.textContent = "Rp " + change.toLocaleString("id-ID");
  } else {
    changeAmountEl.textContent = "Kurang Rp " + Math.abs(change).toLocaleString("id-ID");
  }
}

/* =====================================================
   7. CHECKOUT TRANSAKSI & CETAK STRUK
===================================================== */
function checkout() {
  if (cart.length === 0) {
    alert("Keranjang belanjaan kosong!");
    return;
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const payAmount = Number(payAmountInput.value) || 0;

  if (payAmount < grandTotal) {
    alert("Uang pembayaran kurang!");
    return;
  }

  const change = payAmount - grandTotal;
  const txId = "TX-" + Date.now();
  const txTime = new Date().toLocaleString("id-ID");

  const transactionData = {
    id: txId,
    time: txTime,
    items: cart,
    total: grandTotal,
    pay: payAmount,
    change: change
  };

  // 1. Simpan Transaksi ke Firebase
  db.ref("transactions/" + txId).set(transactionData)
    .then(() => {
      // 2. Potong Stok Produk di Firebase
      cart.forEach((item) => {
        const currentStock = productsData[item.id].stock;
        const newStock = Math.max(0, currentStock - item.qty);
        db.ref("products/" + item.id + "/stock").set(newStock);
      });

      // 3. Cetak Struk
      printReceipt(transactionData);

      // 4. Clear Keranjang
      cart = [];
      payAmountInput.value = "";
      renderCart();
      alert("Transaksi Berhasil!");
    })
    .catch((err) => alert("Gagal transaksi: " + err.message));
}

function printReceipt(tx) {
  const printArea = document.getElementById("receiptPrintArea");
  
  let itemsHtml = "";
  tx.items.forEach((item) => {
    itemsHtml += `
      <div style="display:flex; justify-content:space-between;">
        <span>${item.name} x${item.qty}</span>
        <span>Rp ${item.subtotal.toLocaleString("id-ID")}</span>
      </div>
    `;
  });

  printArea.innerHTML = `
    <div style="text-align:center;">
      <h2 style="margin:0;">ArizkyMart</h2>
      <p style="margin:2px 0;">--------------------------------</p>
      <p style="margin:2px 0;">ID: ${tx.id}</p>
      <p style="margin:2px 0;">${tx.time}</p>
      <p style="margin:2px 0;">--------------------------------</p>
    </div>
    ${itemsHtml}
    <p style="margin:2px 0;">--------------------------------</p>
    <div style="display:flex; justify-content:space-between;">
      <strong>Total:</strong>
      <strong>Rp ${tx.total.toLocaleString("id-ID")}</strong>
    </div>
    <div style="display:flex; justify-content:space-between;">
      <span>Bayar:</span>
      <span>Rp ${tx.pay.toLocaleString("id-ID")}</span>
    </div>
    <div style="display:flex; justify-content:space-between;">
      <span>Kembali:</span>
      <span>Rp ${tx.change.toLocaleString("id-ID")}</span>
    </div>
    <p style="margin:2px 0;">--------------------------------</p>
    <p style="text-align:center; margin-top:10px;">Terima Kasih Telah Berbelanja!</p>
  `;

  window.print();
}

/* =====================================================
   8. RIWAYAT PENJUALAN
===================================================== */
function renderHistoryTable(transactions) {
  historyTableBody.innerHTML = "";
  const keys = Object.keys(transactions).reverse(); // urutkan paling baru

  if (keys.length === 0) {
    historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada riwayat transaksi</td></tr>`;
    return;
  }

  keys.forEach((key) => {
    const tx = transactions[key];
    const totalItems = tx.items.reduce((sum, item) => sum + item.qty, 0);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><code>${tx.id}</code></td>
      <td>${tx.time}</td>
      <td>${totalItems} item</td>
      <td><strong>Rp ${tx.total.toLocaleString("id-ID")}</strong></td>
      <td>Rp ${tx.pay.toLocaleString("id-ID")}</td>
      <td>Rp ${tx.change.toLocaleString("id-ID")}</td>
    `;
    historyTableBody.appendChild(row);
  });
}

function escapeHtml(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
