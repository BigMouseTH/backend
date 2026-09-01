// ⚠️ URL ล่าสุดของคุณ 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwcfYozMfzchT98X2rOZnT_9otOFrkGMxosTixCBUMJvIsAhN62CUaZoH8gM_L3Ol_mA/exec';

const $ = (id) => document.getElementById(id);

// --- ฐานข้อมูลราคา ---
const PRICES = {
  Mice: {
    retail:    { '3XS':8, '2XS':11, 'XS':13, 'S':18, 'M':23, 'L':28, 'XL':34, '2XL':38, '3XL':42 },
    wholesale: { '3XS':7, '2XS':10, 'XS':11, 'S':15, 'M':21, 'L':26, 'XL':31, '2XL':35, '3XL':40 }
  },
  Rat: {
    retail:    { 'S':35, 'M1':40, 'M2':45, 'M3':50, 'L1':55, 'L2':60, 'XL':65, '2XL':70, '3XL':75, '4XL':85, '5XL':95, 'JB':100 },
    wholesale: { 'S':33, 'M1':38, 'M2':43, 'M3':48, 'L1':53, 'L2':58, 'XL':63, '2XL':68, '3XL':73, '4XL':83, '5XL':93, 'JB':98 }
  }
};

const MICE_SIZES = Object.keys(PRICES.Mice.retail);
const RAT_SIZES  = Object.keys(PRICES.Rat.retail);

let cart = []; 
let currentAnimal = 'Mice';
let currentSize = '';
window.globalSalesRecords = []; // เก็บประวัติการขายเอาไว้ใช้นับออเดอร์

function init() {
  $('sale-date').value = new Date().toISOString().split('T')[0];
  $('sale-date').addEventListener('change', generateAutoOrderNo); // เมื่อเปลี่ยนวัน ให้รันเลขใหม่
  
  updateSizeList();
  loadSalesHistory();
  
  $('prom-type').addEventListener('change', toggleDiscountType);
  $('prom-val').addEventListener('input', calcPreviewDiscount);
  $('prod-qty').addEventListener('input', calcPreviewDiscount);
  $('prod-price').addEventListener('input', calcPreviewDiscount);
}
// ฟังก์ชันใหม่: จัดการเมื่อกดปุ่มเลือกประเภทสัตว์
function selectAnimal(animal) {
  currentAnimal = animal;
  document.querySelectorAll('#animal-group .btn-select').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === animal);
  });
  updateSizeList();
}

// ฟังก์ชันใหม่: จัดการเมื่อกดปุ่มเลือกไซส์
function selectSize(size) {
  currentSize = size;
  document.querySelectorAll('#size-group .btn-select').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === size);
  });
  updatePrice();
}

function toggleDiscountType() {
  const type = $('prom-type').value;
  const lbl = $('lbl-prom-val');
  if (type === 'perItem') {
    lbl.textContent = 'ราคา/ตัวที่ลด (฿)';
  } else {
    lbl.textContent = 'ส่วนลดพิเศษ (ProM.)';
  }
  calcPreviewDiscount();
}

function calcPreviewDiscount() {
  const type = $('prom-type').value;
  const val = parseFloat($('prom-val').value) || 0;
  const qty = parseInt($('prod-qty').value) || 0;
  const price = parseFloat($('prod-price').value) || 0;
  
  let totalDisc = 0;
  if (type === 'baht') totalDisc = val;
  else if (type === 'percent') totalDisc = (price * qty) * (val / 100);
  else if (type === 'perItem') totalDisc = val * qty; 
  
  const previewBox = $('disc-preview-box');
  if (totalDisc > 0) {
     previewBox.style.display = 'block';
     $('disc-preview-total').textContent = totalDisc.toLocaleString();
  } else {
     previewBox.style.display = 'none';
  }
}

function openSettings() { $('settings-modal').classList.add('open'); }
function closeSettings() { $('settings-modal').classList.remove('open'); }

async function saveSettings() {
  const salesUrl = $('sheet-url-input').value; 
  const walletUrl = $('wallet-url-input') ? $('wallet-url-input').value : ""; 
  if (!salesUrl) return Swal.fire('แจ้งเตือน', 'กรุณาวางลิงก์ Google Sheet สำหรับบันทึกยอดขาย', 'warning');
  
  const btn = event.target;
  const oldTxt = btn.innerText;
  btn.innerText = 'กำลังบันทึก...';
  btn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: 'setSheetUrl', url: salesUrl, walletUrl: walletUrl }) });
    const result = await res.json();
    if (result.status === 'success') { Swal.fire('สำเร็จ', result.message, 'success'); closeSettings(); } 
    else throw new Error(result.message);
  } catch (err) { Swal.fire('Error', err.message, 'error'); } 
  finally { btn.innerText = oldTxt; btn.disabled = false; }
}

function updateSizeList() {
  const sizeGroup = $('size-group');
  sizeGroup.innerHTML = '';
  const list = (currentAnimal === 'Mice') ? MICE_SIZES : RAT_SIZES;
  
  list.forEach((s, index) => {
    const btn = document.createElement('button');
    btn.className = 'btn-select';
    if (index === 0) {
      btn.classList.add('active'); // เลือกไซส์แรกเป็นค่าเริ่มต้น
      currentSize = s;
    }
    btn.textContent = s;
    btn.dataset.val = s;
    btn.onclick = () => selectSize(s);
    sizeGroup.appendChild(btn);
  });
  updatePrice();
}

function updatePrice() {
  const isWholesale = $('type-wholesale').checked;
  const priceType = isWholesale ? 'wholesale' : 'retail';
  const price = PRICES[currentAnimal][priceType][currentSize] || 0; // อัปเดตให้ดึงจากตัวแปรปุ่ม
  $('prod-price').value = price;
  calcPreviewDiscount(); 
}

function addToCart() {
  const animal = currentAnimal; // อัปเดตให้ดึงจากตัวแปรปุ่ม
  let size     = currentSize;   // อัปเดตให้ดึงจากตัวแปรปุ่ม
  const price  = parseFloat($('prod-price').value);
  const qty    = parseInt($('prod-qty').value);
  const isLive = $('prod-live').checked; 
  const isWholesale = $('type-wholesale').checked;
  
  if (isWholesale) { size = size + ' w'; }

  let promVal = parseFloat($('prom-val').value) || 0;
  const promType = $('prom-type').value;

  if (!price || !qty || qty <= 0) { Swal.fire('แจ้งเตือน', 'กรุณาระบุราคาและจำนวน', 'warning'); return; }

  let discountBaht = 0;
  let totalRaw = price * qty;
  
  if (promVal > 0) {
    if (promType === 'percent') discountBaht = totalRaw * (promVal / 100);
    else if (promType === 'perItem') discountBaht = promVal * qty; 
    else discountBaht = promVal;
  }

  let displayTxt = '';
  if (promVal > 0) {
      if (promType === 'percent') displayTxt = `ลด ${promVal}%`;
      else if (promType === 'perItem') displayTxt = `ลดตัวละ ${promVal}บ.`;
      else displayTxt = `ลด ${promVal}บ.`;
  }

  cart.push({ 
    animal, size, price, qty, isLive,
    discount: discountBaht,
    promDisplay: displayTxt ? `(${displayTxt})` : ''
  });

  $('prod-qty').value = '';
  $('prom-val').value = '';
  $('prod-live').checked = false; 
  $('disc-preview-box').style.display = 'none'; 
  
  renderCart();
}

function renderCart() {
  const container = $('cart-items');
  const wrapper = $('cart-container');
  container.innerHTML = '';
  
  if (cart.length === 0) { wrapper.style.display = 'none'; $('grand-total').textContent = '0'; return; }
  
  wrapper.style.display = 'block';
  let totalNet = 0;

  cart.forEach((item, index) => {
    const sum = (item.price * item.qty) - item.discount;
    totalNet += sum;
    // ปรับสีให้เข้าธีม
    const condition = item.isLive ? '<span style="color:#ff6a00; font-weight:700;">[เป็น]</span>' : '<span style="color:#111111; font-weight:700;">[แช่]</span>';
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div>
        <b>${item.animal} ${item.size}</b> ${condition}<br>
        <span style="color:#666666;">${item.price} x ${item.qty} = ${(item.price * item.qty).toLocaleString()}</span> 
        <span style="color:#ff6a00; font-size:12px; font-weight:600;">${item.promDisplay ? '- ' + item.discount + ' บ. ' + item.promDisplay : ''}</span>
      </div>
      <div style="font-weight:800; font-size:16px;">${sum.toLocaleString()} บ.</div>
      <div class="cart-del" onclick="remItem(${index})">×</div>
    `;
    container.appendChild(div);
  });
  $('grand-total').textContent = totalNet.toLocaleString();
}

function remItem(index) { cart.splice(index, 1); renderCart(); }

async function submitSaleOrder() {
  if (cart.length === 0) return Swal.fire('แจ้งเตือน', 'ตะกร้าว่างเปล่า', 'warning');
  const date = $('sale-date').value;
  const no   = $('sale-no').value;
  if (!date) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่', 'warning');

  const btn = $('btn-save');
  const oldTxt = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ กำลังบันทึกออเดอร์...';

  try {
    const payload = {
      action: 'saveSales', date: date, orderNo: no, items: cart, paymentType: $('pay-type').value,
      shipMethod: $('ship-method').value, shipCost: parseFloat($('ship-cost').value) || 0, shipPaid: parseFloat($('ship-paid').value) || 0
    };

    const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.status === 'success') { 
        Swal.fire({ icon: 'success', title: '✅ บันทึกยอดขายสำเร็จ!', timer: 2000, showConfirmButton: false });
        cart = []; renderCart(); $('sale-no').value = ''; loadSalesHistory(); 
    } else throw new Error(result.message);
  } catch (err) { Swal.fire('Error', err.message, 'error'); } 
  finally { btn.disabled = false; btn.textContent = oldTxt; }
}

// ==========================================
// 📊 ส่วนประวัติการขาย (Sales History)
// ==========================================

async function loadSalesHistory() {
  const monthSelect = $('history-month-filter');
  const selectedMonth = monthSelect ? monthSelect.value : "";
  const tbody = $('history-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: gray;">กำลังโหลดข้อมูลประวัติ... ⏳</td></tr>';

  try {
    const response = await fetch(SCRIPT_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify({ action: 'getSalesHistory', month: selectedMonth === 'current' ? '' : selectedMonth }) 
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const data = result.data;
      
      window.globalSalesRecords = data.records || []; 
      
      if (monthSelect && (monthSelect.options.length <= 1 || selectedMonth === 'current' || selectedMonth === '')) {
        monthSelect.innerHTML = "";
        data.months.forEach(m => {
          const option = document.createElement("option"); option.value = m.value; option.text = m.label;
          if (m.value === data.selectedMonth) option.selected = true; monthSelect.appendChild(option);
        });
      }
      renderHistoryTable(data.records);
      generateAutoOrderNo(); 
    } else {
      // ดึง Error จากหลังบ้านมาแสดงหน้าเว็บ
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:20px; font-weight:bold;">เกิดข้อผิดพลาด: ${result.message}</td></tr>`;
    }
  } catch (error) { 
    // ดึง Error กรณีเชื่อมต่อไม่ได้
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:20px; font-weight:bold;">ปัญหาการเชื่อมต่อ: ${error.message}</td></tr>`; 
  }
}

// สร้างฟังก์ชันใหม่ สำหรับคำนวณและรันเลขออเดอร์อัตโนมัติ (ใส่ไว้ล่างสุดของไฟล์หรือต่อจาก renderHistoryTable)
function generateAutoOrderNo() {
  const selectedDate = $('sale-date').value;
  let maxNo = 0;
  
  if (window.globalSalesRecords) {
    // กรองหาบิลเฉพาะของวันที่เลือก
    const todayRecords = window.globalSalesRecords.filter(r => r.date === selectedDate);
    
    todayRecords.forEach(r => {
      const no = parseInt(r.orderNo);
      if (!isNaN(no) && no > maxNo) {
        maxNo = no; // ดึงเลขที่มากที่สุดของวันนั้นออกมา
      }
    });
    
    // สำรอง: หาก Google Script ของคุณไม่ได้ส่ง item.orderNo กลับมาใน History
    // ให้ใช้วิธีนับจำนวนบรรทัดของบิลในวันนั้นแทน 
    if (maxNo === 0 && todayRecords.length > 0) {
      maxNo = todayRecords.length; 
    }
  }
  
  // กำหนดเลขที่ออเดอร์ต่อไป
  $('sale-no').value = maxNo + 1;
}

function renderHistoryTable(records) {
  const tbody = $('history-body'); const summary = $('history-summary');
  if (!tbody) return; tbody.innerHTML = '';
  
  const monthSelect = $('history-month-filter');
  const currentMonthVal = monthSelect ? monthSelect.value : "";

  let sumPrice = 0; let sumShipProfit = 0;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:gray;">ไม่มีข้อมูลการขายในเดือนนี้</td></tr>';
    if (summary) summary.style.display = 'none'; return;
  }

  records.forEach(item => {
    const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #e2e8f0";
    const shipCharge = parseFloat(item.shipCharge) || 0; const shipActual = parseFloat(item.shipActual) || 0;
    const shipProfit = shipCharge - shipActual; const price = parseFloat(item.price) || 0;
    sumPrice += price; sumShipProfit += shipProfit;

    // ปรับสีให้เข้าธีม
    const typeLabel = (item.type === 'เป็น' || item.type === 'Live') ? '<span style="color:#ff6a00; font-weight:bold;">[เป็น]</span>' : '<span style="color:#111111; font-weight:bold;">[แช่]</span>';

    tr.innerHTML = `
      <td>${item.date}</td>
      <td style="font-weight:600;">${item.animal} ${item.size}</td>
      <td>${typeLabel}</td>
      <td>${item.qty}</td>
      <td style="font-weight:bold;">${price.toLocaleString()}</td>
      <td style="color:#666666;">${shipCharge.toLocaleString()}</td>
      <td style="color:#ff6a00; font-weight:bold;">
         ${shipActual.toLocaleString()}
         <span class="action-icon edit-icon" onclick="editShipping(${item.row}, '${currentMonthVal}', ${shipActual})" title="แก้ไขค่าส่ง">✏️</span>
      </td>
      <td style="text-align:center;">
         <span class="action-icon" onclick="deleteSale(${item.row}, '${currentMonthVal}')" title="ลบรายการนี้">🗑️</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (summary) {
    summary.style.display = 'block';
    if ($('sum-monthly-price')) $('sum-monthly-price').textContent = sumPrice.toLocaleString();
    if ($('sum-monthly-ship')) $('sum-monthly-ship').textContent = sumShipProfit.toLocaleString();
  }
}

async function editShipping(row, month, currentVal) {
  if (!month || month === 'current') {
      const dateObj = new Date(); month = dateObj.getFullYear() + '-' + ("0" + (dateObj.getMonth() + 1)).slice(-2);
  }
  
  const { value: newAmt } = await Swal.fire({
    title: 'แก้ไขค่าส่ง (จ่ายจริง)',
    input: 'number',
    inputValue: currentVal,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก'
  });

  if (newAmt !== undefined && newAmt !== null && newAmt !== String(currentVal)) {
    Swal.fire({ title: 'กำลังอัปเดต...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(SCRIPT_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateShipActual', row: row, month: month, newActual: parseFloat(newAmt) || 0 }) 
      });
      const result = await res.json();
      if (result.status === 'success') { Swal.fire('สำเร็จ', result.message, 'success'); loadSalesHistory(); } 
      else throw new Error(result.message);
    } catch(err) { Swal.fire('Error', err.message, 'error'); }
  }
}

async function deleteSale(row, month) {
  if (!month || month === 'current') {
      const dateObj = new Date(); month = dateObj.getFullYear() + '-' + ("0" + (dateObj.getMonth() + 1)).slice(-2);
  }

  const confirm = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: "ลบแล้วยอดเงินจะถูกหักออกจากกระเป๋ากลับอัตโนมัติ",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'ใช่, ลบเลย!'
  });

  if (confirm.isConfirmed) {
    Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(SCRIPT_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteSaleItem', row: row, month: month }) 
      });
      const result = await res.json();
      if (result.status === 'success') { Swal.fire('ลบสำเร็จ', result.message, 'success'); loadSalesHistory(); } 
      else throw new Error(result.message);
    } catch(err) { Swal.fire('Error', err.message, 'error'); }
  }
}

window.addEventListener('DOMContentLoaded', init);

// ============================================================
// 📱 Mobile Hamburger Menu Toggle
// ============================================================
const menuToggle = document.getElementById('menuToggle');
const navTabs = document.getElementById('navTabs');

if (menuToggle && navTabs) {
  menuToggle.addEventListener('click', () => {
    navTabs.classList.toggle('open');
  });
}