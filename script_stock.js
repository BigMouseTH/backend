// ⚠️ ใส่ URL ของโปรเจกต์ STOCK เดิม
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJ2tw3avSP6v1480WAMKL93HSulENpExuKnTY_GQP7_kMBbx4xBegojg8FgR0SXnmRgQ/exec';

const MICE_SIZES = ['3XS','2XS','XS','S','M','L','XL','2XL','3XL'];
const RAT_SIZES  = ['S','M1','M2','M3','L1','L2','XL','2XL','3XL','4XL','5XL','JB'];
const $ = (sel) => document.querySelector(sel);

// --- Settings ---
function openSettings() { $('#settings-modal').classList.add('open'); }
function closeSettings() { $('#settings-modal').classList.remove('open'); }

async function saveSettings() {
  const url = $('#sheet-url-input').value;
  if (!url) return alert('กรุณาวางลิงก์ Google Sheet');
  
  const btn = event.target;
  const oldTxt = btn.innerText;
  btn.innerText = 'บันทึก...';
  btn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'setSheetUrl', url: url })
    });
    
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ ' + result.message);
      closeSettings();
      loadStockTable(); 
    } else {
      throw new Error(result.message);
    }
  } catch (err) { alert('❌ Error: ' + err.message); } 
  finally { btn.innerText = oldTxt; btn.disabled = false; }
}

// --- Render ---
function renderStockTables(rows) {
  const miceBody = $('#stock-table-mice tbody');
  const ratBody  = $('#stock-table-rat tbody');
  miceBody.innerHTML = ''; ratBody.innerHTML = '';

  const addEmptyRow = (tbody) => tbody.innerHTML = '<tr><td colspan="2" class="hint" style="text-align:center">ไม่พบข้อมูล</td></tr>';

  if (!Array.isArray(rows) || rows.length === 0) {
    addEmptyRow(miceBody); addEmptyRow(ratBody); return;
  }

  const sorted = [...rows].sort((a, b) => {
    const animalA = (a.animal || '').toLowerCase();
    const animalB = (b.animal || '').toLowerCase();
    if (animalA !== animalB) return animalA === 'mice' ? -1 : 1;
    if (animalA === 'mice') return MICE_SIZES.indexOf(a.size) - MICE_SIZES.indexOf(b.size);
    return RAT_SIZES.indexOf(a.size) - RAT_SIZES.indexOf(b.size);
  });

  let m=0, r=0;
  sorted.forEach(row => {
    const animal = (row.animal||'').toLowerCase();
    const stockVal = parseInt(row.stock);
    let style = (isNaN(stockVal)||stockVal<=0) ? 'color:#df2121;font-weight:700;' : (stockVal<5?'color:#ff6a00;font-weight:700;':'font-weight:600;');
    
    const tr = `<tr><td style="font-weight:600;">${row.size}</td><td style="${style}">${row.stock}</td></tr>`;
    if(animal==='mice'){ miceBody.innerHTML+=tr; m++; }
    else if(animal==='rat'){ ratBody.innerHTML+=tr; r++; }
  });
  if(m===0) addEmptyRow(miceBody);
  if(r===0) addEmptyRow(ratBody);
}

// --- Load ---
async function loadStockTable() {
  try {
    if($('#stock-table-mice tbody').children.length === 0) 
       $('#stock-table-mice tbody').innerHTML = '<tr><td colspan="2" class="hint" style="text-align:center">กำลังโหลดข้อมูล...</td></tr>';
       $('#stock-table-rat tbody').innerHTML = '<tr><td colspan="2" class="hint" style="text-align:center">กำลังโหลดข้อมูล...</td></tr>';
       
    const res = await fetch(`${SCRIPT_URL}?action=getStock`);
    const data = await res.json();
    
    if(data.status === 'error') throw new Error(data.message);
    renderStockTables(data);
  } catch (err) { console.error(err); }
}

// --- Submit ---
async function submitStockUpdate() {
  const date = $('#upd-date').value;
  const animal = $('#upd-animal').value;
  const size = $('#upd-size').value;
  const qty = parseInt($('#upd-qty').value);

  if (!date || !animal || !size || !qty) return alert('กรอกข้อมูลไม่ครบถ้วน');

  const btn = $('#btn-submit');
  btn.disabled = true;
  btn.innerText = 'กำลังบันทึก...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: 'updateStock', 
        date: date, 
        animal: animal, 
        size: size, 
        qty: qty 
      })
    });
    
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ บันทึกการเติมสต็อกเรียบร้อย');
      $('#upd-qty').value = ''; 
      await loadStockTable(); 
    } else {
      throw new Error(result.message);
    }
  } catch (e) { alert('❌ เกิดข้อผิดพลาด: ' + e.message); } 
  finally { btn.disabled = false; btn.innerText = 'บันทึกการเติมสต็อก'; }
}

window.addEventListener('DOMContentLoaded', () => {
  $('#upd-date').value = new Date().toISOString().split('T')[0];
  $('#upd-animal').addEventListener('change', (e) => {
    const sizes = e.target.value === 'Mice' ? MICE_SIZES : RAT_SIZES;
    $('#upd-size').innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join('');
  });
  $('#btn-submit').addEventListener('click', submitStockUpdate);
  loadStockTable();
});

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