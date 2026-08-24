import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLpg8fQo01qyNbLdWeHtzS8YSujGyN7MA",
    authDomain: "indian-food-forest-pos.firebaseapp.com",
    projectId: "indian-food-forest-pos",
    storageBucket: "indian-food-forest-pos.firebasestorage.app",
    messagingSenderId: "324822787673",
    appId: "1:324822787673:web:979ab044f03327ed743348"
};

// Initialize Firebase & Database Instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global POS State & Default Values
let activeCart = [
    { name: "Panir Tika", qty: 1, price: 250 },
    { name: "Veg Thali", qty: 1, price: 70 }
];
let loadedMenu = [];
let currentTable = "2";
let currentOrderId = "ORD106632";

// Window Load Initializer
window.addEventListener('DOMContentLoaded', () => {
    initRealtimeListeners();
    updateDateTime();
    renderCart();
});

// Realtime Firestore Listeners
function initRealtimeListeners() {
    // 1. Menu Collection
    onSnapshot(collection(db, "menu"), (snapshot) => {
        loadedMenu = [];
        snapshot.forEach(docSnap => {
            loadedMenu.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderMenuGrid(loadedMenu);
        renderMenuAdminTable(loadedMenu);
    });

    // 2. Inventory Collection
    onSnapshot(collection(db, "inventory"), (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        renderInventoryTable(items);
    });

    // 3. Expenses Collection
    onSnapshot(collection(db, "expenses"), (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        renderExpenseTable(items);
    });

    // 4. History Collection
    onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        renderHistoryTable(items);
    });
}

// Live Date & Time Formatter
function updateDateTime() {
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    document.getElementById('r-date').innerText = `Date: ${dateStr}`;
    document.getElementById('r-time').innerText = `Time: ${timeStr}`;
}

// POS Menu Grid Rendering
function renderMenuGrid(items) {
    const grid = document.getElementById('pos-menu-grid');
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="menu-card" onclick="addToCart('Panir Tika', 250)">
                <div class="menu-card-title">Panir Tika</div>
                <div class="menu-card-price">₹250</div>
            </div>
            <div class="menu-card" onclick="addToCart('Veg Thali', 70)">
                <div class="menu-card-title">Veg Thali</div>
                <div class="menu-card-price">₹70</div>
            </div>`;
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="menu-card" onclick="addToCart('${item.name}', ${item.priceFull})">
            <div class="menu-card-title">${item.name}</div>
            <div class="menu-card-price">₹${item.priceFull}</div>
        </div>
    `).join('');
}

// Cart Items Management
window.addToCart = function(name, price) {
    const existing = activeCart.find(i => i.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        activeCart.push({ name, qty: 1, price });
    }
    renderCart();
};

window.updateQty = function(index, delta) {
    activeCart[index].qty += delta;
    if (activeCart[index].qty <= 0) {
        activeCart.splice(index, 1);
    }
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cart-items-container');
    let subtotal = 0;

    container.innerHTML = activeCart.map((item, index) => {
        const total = item.price * item.qty;
        subtotal += total;
        return `
            <div class="cart-row">
                <span class="cart-row-title">${item.name}</span>
                <div class="cart-row-controls">
                    <button class="btn-qty" onclick="updateQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="btn-qty" onclick="updateQty(${index}, 1)">+</button>
                    <span style="min-width:45px; text-align:right;">₹${total}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('cart-grandtotal').innerText = `₹${subtotal}`;

    syncThermalReceipt(activeCart, subtotal);
}

// Sync Preview Receipt Layout
function syncThermalReceipt(items, total, orderId = currentOrderId, table = currentTable) {
    const rList = document.getElementById('r-items-list');
    
    rList.innerHTML = items.map(i => `
        <tr>
            <td>${i.name}</td>
            <td class="r-center">${i.qty}</td>
            <td class="r-right">${i.price * i.qty}</td>
        </tr>
    `).join('');

    document.getElementById('r-table').innerText = `Table: ${table}`;
    document.getElementById('r-order-id').innerText = `Order: ${orderId}`;
    document.getElementById('r-subtotal').innerText = `₹${total}`;
    document.getElementById('r-grandtotal').innerText = `₹${total}`;
}

// Table Selection Handler
window.onTableChange = function(val) {
    currentTable = val;
    document.getElementById('r-table').innerText = `Table: ${val}`;
};

// Search Menu Items
window.filterMenu = function() {
    const queryStr = document.getElementById('pos-search').value.toLowerCase();
    const filtered = loadedMenu.filter(m => m.name.toLowerCase().includes(queryStr));
    renderMenuGrid(filtered);
};

// Add Custom Dish Prompt
window.openCustomItemModal = function() {
    const name = prompt("Dish Name:");
    const price = prompt("Price (₹):");
    if (name && price) {
        addToCart(name, parseFloat(price));
    }
};

// Save Order to Firebase & Print Thermal Receipt
window.saveAndPrintOrder = async function() {
    if (activeCart.length === 0) return alert("Cart empty hai!");

    const subtotal = activeCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const newOrderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

    const billPayload = {
        orderId: newOrderId,
        tableNo: currentTable,
        items: activeCart,
        grandTotal: subtotal,
        paymentStatus: "PAID IN FULL",
        createdAt: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "orders"), billPayload);
    } catch (err) {
        console.warn("Saving offline / local print execution...", err);
    }

    currentOrderId = newOrderId;
    syncThermalReceipt(activeCart, subtotal, newOrderId, currentTable);

    window.print();
};

// Repost Last Receipt
window.repostLastBill = async function() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
            const data = docSnap.data();
            syncThermalReceipt(data.items, data.grandTotal, data.orderId, data.tableNo);
            window.print();
        });
    } catch (err) {
        alert("Previous order fetch karne me issue aaya!");
    }
};

// Admin Section Handlers (Menu, Stock, Expense)
window.handleMenuUpload = async function(e) {
    e.preventDefault();
    const name = document.getElementById('menu-item-name').value;
    const category = document.getElementById('menu-item-category').value;
    const priceHalf = parseFloat(document.getElementById('menu-price-half').value) || 0;
    const priceFull = parseFloat(document.getElementById('menu-price-full').value);

    await addDoc(collection(db, "menu"), { name, category, priceHalf, priceFull });
    document.getElementById('menu-form').reset();
};

window.handleInventoryAdd = async function(e) {
    e.preventDefault();
    const name = document.getElementById('inv-name').value;
    const qty = parseFloat(document.getElementById('inv-qty').value);
    const unit = document.getElementById('inv-unit').value;

    await addDoc(collection(db, "inventory"), { name, qty, unit, updatedAt: new Date().toISOString() });
    document.getElementById('inventory-form').reset();
};

window.handleExpenseAdd = async function(e) {
    e.preventDefault();
    const title = document.getElementById('exp-title').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;

    await addDoc(collection(db, "expenses"), { title, amount, category, date: new Date().toISOString() });
    document.getElementById('expense-form').reset();
};

// Render Admin Tables Data
function renderMenuAdminTable(items) {
    const body = document.getElementById('menu-master-table');
    body.innerHTML = items.map(i => `
        <tr>
            <td>${i.name}</td>
            <td>${i.category}</td>
            <td>₹${i.priceHalf}</td>
            <td>₹${i.priceFull}</td>
            <td><button style="color:#ef4444; border:none; background:none; cursor:pointer;" onclick="deleteRecord('menu', '${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function renderInventoryTable(items) {
    const body = document.getElementById('inventory-table-body');
    body.innerHTML = items.map(i => `
        <tr>
            <td>${i.name}</td>
            <td>${i.qty}</td>
            <td>${i.unit}</td>
            <td><span style="color:#10b981;">In Stock</span></td>
            <td><button style="color:#ef4444; border:none; background:none; cursor:pointer;" onclick="deleteRecord('inventory', '${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function renderExpenseTable(items) {
    const body = document.getElementById('expense-table-body');
    body.innerHTML = items.map(i => `
        <tr>
            <td>${new Date(i.date).toLocaleDateString()}</td>
            <td>${i.title}</td>
            <td>${i.category}</td>
            <td style="color:#ef4444; font-weight:bold;">₹${i.amount}</td>
        </tr>
    `).join('');
}

function renderHistoryTable(items) {
    const body = document.getElementById('bill-history-table');
    body.innerHTML = items.map(i => `
        <tr>
            <td><b>${i.orderId}</b></td>
            <td>${new Date(i.createdAt).toLocaleString()}</td>
            <td>Table ${i.tableNo}</td>
            <td>₹${i.grandTotal}</td>
            <td><span class="r-badge">${i.paymentStatus}</span></td>
            <td><button style="background:#8b5cf6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="reprintHistoricalBill('${i.id}')">Reprint</button></td>
        </tr>
    `).join('');

    window.reprintHistoricalBill = function(docId) {
        const order = items.find(o => o.id === docId);
        if (order) {
            syncThermalReceipt(order.items, order.grandTotal, order.orderId, order.tableNo);
            window.print();
        }
    };
}

// Firestore Delete Helper
window.deleteRecord = async function(collName, id) {
    if (confirm("Record delete karein?")) {
        await deleteDoc(doc(db, collName, id));
    }
};
