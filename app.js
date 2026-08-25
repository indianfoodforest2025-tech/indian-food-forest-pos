import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, onSnapshot, deleteDoc, doc, query, orderBy, limit 
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global State
let activeCart = [];
let loadedMenu = [];
let availableTables = [];
let currentTable = "1";
let currentOrderId = "ORD-1001";

// ==========================================
// DEFAULT MENU (EXTENDED & CATEGORIZED)
// ==========================================
const defaultMenu = [
    // SOUPS
    { name: "Manchow Soup (Veg)", category: "Chinese Soup", priceHalf: 0, priceFull: 130 },
    { name: "Hot And Sour Soup (Veg)", category: "Chinese Soup", priceHalf: 0, priceFull: 140 },
    { name: "Chicken Manchow Soup", category: "Chinese Soup", priceHalf: 0, priceFull: 160 },
    { name: "Chicken Lung Fung Soup", category: "Chinese Soup", priceHalf: 0, priceFull: 290 },
    
    // STARTERS VEG
    { name: "Paneer Chilly", category: "Chinese Starters (Veg)", priceHalf: 0, priceFull: 200 },
    { name: "Paneer Crispy", category: "Chinese Starters (Veg)", priceHalf: 0, priceFull: 210 },
    { name: "Manchurian (Dry)", category: "Chinese Starters (Veg)", priceHalf: 0, priceFull: 150 },
    { name: "Veg Crispy", category: "Chinese Starters (Veg)", priceHalf: 0, priceFull: 240 },
    { name: "Mushroom Chilly", category: "Chinese Starters (Veg)", priceHalf: 0, priceFull: 230 },

    // STARTERS CHICKEN
    { name: "Chicken Crispy", category: "Chinese Starters (Non-Veg)", priceHalf: 0, priceFull: 230 },
    { name: "Chicken Lollipop", category: "Chinese Starters (Non-Veg)", priceHalf: 0, priceFull: 220 },
    { name: "Chicken 65", category: "Chinese Starters (Non-Veg)", priceHalf: 0, priceFull: 220 },
    { name: "Chicken Chilly (Dry)", category: "Chinese Starters (Non-Veg)", priceHalf: 0, priceFull: 220 },

    // NOODLES & RICE (With Half & Full Logic)
    { name: "Veg Triple Noodles", category: "Chinese Noodles & Rice", priceHalf: 150, priceFull: 210 },
    { name: "Chicken Triple Noodles", category: "Chinese Noodles & Rice", priceHalf: 160, priceFull: 230 },
    { name: "Veg Hakka Noodles", category: "Chinese Noodles & Rice", priceHalf: 0, priceFull: 150 },
    { name: "Chicken Fried Rice", category: "Chinese Noodles & Rice", priceHalf: 0, priceFull: 170 },
    { name: "Veg Triple Schezwan Rice", category: "Chinese Noodles & Rice", priceHalf: 0, priceFull: 200 },

    // TANDOORI & KABAB
    { name: "Chicken Tandoori", category: "Kabab & Tandoori", priceHalf: 0, priceFull: 460 },
    { name: "Paneer Tikka", category: "Kabab & Tandoori", priceHalf: 0, priceFull: 240 },
    { name: "Chicken Tikka", category: "Kabab & Tandoori", priceHalf: 0, priceFull: 260 },
    { name: "Chicken Malai Kabab", category: "Kabab & Tandoori", priceHalf: 0, priceFull: 270 },

    // INDIAN MAIN COURSE
    { name: "Dal Tadka", category: "Indian Main Course", priceHalf: 0, priceFull: 130 },
    { name: "Paneer Butter Masala", category: "Indian Main Course", priceHalf: 0, priceFull: 410 },
    { name: "Butter Chicken", category: "Indian Main Course", priceHalf: 0, priceFull: 250 },
    { name: "Chicken Masala", category: "Indian Main Course", priceHalf: 0, priceFull: 250 },
    { name: "Veg Kolhapuri", category: "Indian Main Course", priceHalf: 0, priceFull: 215 },

    // BIRYANI
    { name: "Chicken Biryani", category: "Rice & Biryani", priceHalf: 0, priceFull: 160 },
    { name: "Veg Dum Biryani", category: "Rice & Biryani", priceHalf: 0, priceFull: 170 },
    { name: "Prawns Biryani", category: "Rice & Biryani", priceHalf: 0, priceFull: 250 },

    // THALI
    { name: "Veg Thali", category: "Thali Specials", priceHalf: 0, priceFull: 120 },
    { name: "Chicken Thali", category: "Thali Specials", priceHalf: 0, priceFull: 180 },
    { name: "Surmai Thali", category: "Thali Specials", priceHalf: 0, priceFull: 320 }
];

// App Load Initializer
window.addEventListener('DOMContentLoaded', () => {
    initTables();
    initRealtimeListeners();
    updateDateTime();
    renderCart();
});

// Tables Setup
function initTables() {
    availableTables = [];
    for (let i = 1; i <= 20; i++) { availableTables.push(`Table ${i}`); }
    availableTables.push("Takeaway", "Delivery");
    
    const select = document.getElementById('pos-table-select');
    select.innerHTML = availableTables.map(t => `<option value="${t}">${t}</option>`).join('');
    currentTable = availableTables[0];
}

window.addNewTablePrompt = function() {
    const newName = prompt("Enter New Table Name (e.g. VIP 1):");
    if (newName && !availableTables.includes(newName)) {
        availableTables.unshift(newName);
        document.getElementById('pos-table-select').innerHTML = availableTables.map(t => `<option value="${t}">${t}</option>`).join('');
        document.getElementById('pos-table-select').value = newName;
        onTableChange(newName);
    }
};

window.onTableChange = function(val) {
    currentTable = val;
    document.getElementById('r-table').innerText = `Table: ${val}`;
};

// ==========================================
// FIREBASE LISTENERS & MENU RENDER (BUG FIXED)
// ==========================================
function initRealtimeListeners() {
    // Menu Listener
    onSnapshot(collection(db, "menu"), (snapshot) => {
        let dbMenu = [];
        snapshot.forEach(docSnap => dbMenu.push({ id: docSnap.id, ...docSnap.data() }));
        
        // BUG FIX: Ab Default Menu aur Firebase Menu dono Merge honge! (Koi gayab nahi hoga)
        loadedMenu = [...defaultMenu, ...dbMenu]; 
        
        renderMenuGrid(loadedMenu);
        renderMenuAdminTable(loadedMenu);
    });

    // Orders History Listener
    onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        renderHistoryTable(items);
    });
}

// Category Filter Logic
window.filterByCategory = function(category) {
    document.querySelectorAll('.cat-pill').forEach(pill => pill.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (category === 'All') {
        renderMenuGrid(loadedMenu);
    } else {
        const filtered = loadedMenu.filter(m => m.category === category);
        renderMenuGrid(filtered);
    }
};

window.filterMenu = function() {
    const queryStr = document.getElementById('pos-search').value.toLowerCase();
    const filtered = loadedMenu.filter(m => m.name.toLowerCase().includes(queryStr));
    renderMenuGrid(filtered);
};

// Render Menu Cards (HALF / FULL Logic)
function renderMenuGrid(items) {
    const grid = document.getElementById('pos-menu-grid');
    grid.innerHTML = items.map(item => {
        const hasHalf = item.priceHalf && item.priceHalf > 0;
        return `
            <div class="menu-card">
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-prices">
                    ${hasHalf ? `<button class="price-btn" onclick="addToCart('${item.name} (Half)', ${item.priceHalf})">HALF: ₹${item.priceHalf}</button>` : ''}
                    <button class="price-btn ${!hasHalf ? 'full-only' : ''}" onclick="addToCart('${item.name} (Full)', ${item.priceFull})">FULL: ₹${item.priceFull}</button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// CART & BILLING LOGIC
// ==========================================
window.openCustomItemModal = function() {
    const name = prompt("Enter Custom Dish/Extra Name:");
    const price = prompt("Enter Price (₹):");
    if (name && price) {
        addToCart(name + " (Custom)", parseFloat(price));
    }
};

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
    if (activeCart[index].qty <= 0) activeCart.splice(index, 1);
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
                    <span style="min-width:45px; text-align:right; font-weight:bold;">₹${total}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-grandtotal').innerText = `₹${subtotal}`;
    syncThermalReceipt(activeCart, subtotal);
}

// Receipt Sync
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
    document.getElementById('r-grandtotal-receipt').innerText = `₹${total}`;
}

// Live Time for Receipt
function updateDateTime() {
    const now = new Date();
    document.getElementById('r-date').innerText = `Date: ${now.toLocaleDateString()}`;
    document.getElementById('r-time').innerText = `Time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Save Order & Print 
window.saveAndPrintOrder = async function() {
    if (activeCart.length === 0) return alert("Bhai, Cart empty hai! Pehle item add karo.");

    const subtotal = activeCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const newOrderId = "ORD-" + Math.floor(1000 + Math.random() * 9000); 
    
    currentOrderId = newOrderId;
    updateDateTime();
    syncThermalReceipt(activeCart, subtotal, newOrderId, currentTable);
    document.getElementById('display-order-id').innerText = newOrderId;

    try {
        await addDoc(collection(db, "orders"), {
            orderId: newOrderId,
            tableNo: currentTable,
            items: activeCart,
            grandTotal: subtotal,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.warn("Offline Saved", err);
    }

    window.print();

    // Cart Clear 
    setTimeout(() => {
        activeCart = [];
        renderCart();
    }, 500);
};

// ==========================================
// ADMIN PANELS & EXPORT LOGIC
// ==========================================
window.handleMenuUpload = async function(e) {
    e.preventDefault();
    const name = document.getElementById('menu-item-name').value;
    const category = document.getElementById('menu-item-category').value;
    const priceHalf = parseFloat(document.getElementById('menu-price-half').value) || 0;
    const priceFull = parseFloat(document.getElementById('menu-price-full').value);

    await addDoc(collection(db, "menu"), { name, category, priceHalf, priceFull });
    document.getElementById('menu-form').reset();
    alert("Dish Added Successfully!");
};

function renderMenuAdminTable(items) {
    document.getElementById('menu-master-table').innerHTML = items.map(i => `
        <tr>
            <td>${i.name}</td>
            <td>${i.category}</td>
            <td>₹${i.priceHalf || 0}</td>
            <td>₹${i.priceFull}</td>
            <td><button style="color:red; background:none; border:none; cursor:pointer;" onclick="deleteRecord('menu', '${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function renderHistoryTable(items) {
    document.getElementById('bill-history-table').innerHTML = items.map(i => `
        <tr>
            <td><b>${i.orderId}</b></td>
            <td>${new Date(i.createdAt).toLocaleString()}</td>
            <td>${i.tableNo}</td>
            <td>₹${i.grandTotal}</td>
            <td><button class="btn-action" style="padding:6px; font-size:12px; background:#0ea5e9; color:white;" onclick="reprintHistoricalBill('${i.id}')">Reprint</button></td>
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

// Download Excel Logic 
window.exportToExcel = function() {
    const table = document.getElementById("report-table");
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sales Data" });
    XLSX.writeFile(workbook, "Indian_Food_Forest_Report.xlsx");
};

// Global Delete Function
window.deleteRecord = async function(collName, id) {
    if (confirm("Are you sure you want to delete this?")) {
        if(id) await deleteDoc(doc(db, collName, id));
        else alert("Cannot delete default hardcoded items. Only works for uploaded items.");
    }
};
