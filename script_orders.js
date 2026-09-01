// ⚠️ ตรวจสอบ URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzevDDOgRBy5i4WjKzX72JBeSJc8e44N9kwC3aeVU5PebS3lHIyfi-nmDcHYR4esv5K7Q/exec';

const $ = (id) => document.getElementById(id);

function init() {
  $('order-date').value = new Date().toISOString().split('T')[0];
  
  // เพิ่ม Listener ให้ช่อง Discount
  $('order-price').addEventListener('input', calculateTotal);
  $('order-qty').addEventListener('input', calculateTotal);
  $('order-shipping').addEventListener('input', calculateTotal);
  $('order-discount').addEventListener('input', calculateTotal);
  
  loadDashboard();
}

function calculateTotal() {
  const price = parseFloat($('order-price').value) || 0;
  const qty = parseFloat($('order-qty').value) || 0;
  const shipping = parseFloat($('order-shipping').value) || 0;
  const discount = parseFloat($('order-discount').value) || 0;
  
  // สูตรใหม่: (ราคา x จำนวน) + ค่าส่ง - ส่วนลด
  const total = (price * qty) + shipping - discount;
  
  $('total-display').textContent = total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

async function loadDashboard() {
  const date = $('order-date').value;
  if (!date) return;

  $('dash-sales').innerText = '...';
  $('dash-expenses').innerText = '...';
  $('order-table').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">กำลังโหลดข้อมูล...</td></tr>';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'getDashboard', date: date })
    });
    
    const result = await res.json();
    
    if (result.status === 'success') {
      const sum = result.summary;
      $('dash-sales').innerText = parseFloat(sum.sales).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      $('dash-expenses').innerText = parseFloat(sum.expenses).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      
      const profit = parseFloat(sum.profit);
      const profitEl = $('dash-profit');
      profitEl.innerText = profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      profitEl.style.color = profit >= 0 ? '#3b82f6' : '#ef4444';

      $('dash-balance').innerText = parseFloat(sum.balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      
      if ($('dash-cash')) $('dash-cash').innerText = parseFloat(sum.cash || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
      if ($('dash-digital')) $('dash-digital').innerText = parseFloat(sum.digital || 0).toLocaleString(undefined, {minimumFractionDigits: 2});

      const tbody = $('order-table').querySelector('tbody');
      tbody.innerHTML = '';
      if (result.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">ไม่มีรายการรายจ่ายในเดือนนี้</td></tr>';
      } else {
        result.orders.forEach(o => {
          let d = new Date(o.date);
          if (isNaN(d.getTime())) d = new Date();
          let dStr = d.getDate() + '/' + (d.getMonth()+1);
          
          let tr = document.createElement('tr');
          const monthParam = date.split('-')[0] + '-' + date.split('-')[1];

          tr.innerHTML = `
            <td>${dStr}</td>
            <td>
              <div style="font-weight:700; color:var(--text);">${o.item}</div>
              <div style="font-size:11px; color:var(--muted);">${o.supplier || '-'}</div>
            </td>
            <td style="text-align:right; font-weight:800; color:var(--text);">${parseFloat(o.total).toLocaleString()}</td>
            <td style="text-align:center;">
                <span style="cursor:pointer; font-size:18px; color:var(--muted); transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--muted)'" onclick="deleteOrder(${o.row}, '${monthParam}')" title="ลบรายการนี้">🗑️</span>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  } catch (err) { console.error(err); }
}

async function submitOrder() {
  const date = $('order-date').value;
  const item = $('order-item').value;
  const supplier = $('order-supplier').value;
  const price = parseFloat($('order-price').value);
  const qty = parseInt($('order-qty').value);
  const shipping = parseFloat($('order-shipping').value) || 0;
  const discount = parseFloat($('order-discount').value) || 0;
  const note = $('order-note').value;
  const payType = $('order-pay-type') ? $('order-pay-type').value : "";

  if (!date || !item || !price || !qty) {
      if (typeof Swal !== 'undefined') Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
      else alert('กรุณากรอกข้อมูลให้ครบ');
      return;
  }

  const btn = $('btn-save');
  const oldTxt = btn.innerText;
  btn.disabled = true;
  btn.innerText = '⏳ กำลังบันทึก...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: 'saveOrder', 
        date, item, supplier, price, qty, shipping, discount, note, payType 
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: '✅ บันทึกรายจ่ายสำเร็จ!', timer: 1500, showConfirmButton: false });
      else alert('✅ บันทึกสำเร็จ!');
      
      $('order-item').value = ''; $('order-price').value = ''; 
      $('order-qty').value = '1'; $('order-shipping').value = ''; 
      $('order-discount').value = ''; 
      $('order-supplier').value = ''; $('order-note').value = ''; calculateTotal();
      loadDashboard(); 
    } else {
      if (typeof Swal !== 'undefined') Swal.fire('Error', result.message, 'error');
      else alert('Error: ' + result.message);
    }
  } catch (err) { 
      if (typeof Swal !== 'undefined') Swal.fire('Error', err.message, 'error');
      else alert('Error: ' + err.message); 
  } 
  finally { btn.disabled = false; btn.innerText = oldTxt; }
}

async function deleteOrder(row, monthParam) {
    if (typeof Swal === 'undefined') {
        if(!confirm("ยืนยันการลบรายการ? ยอดเงินจะถูกดึงกลับเข้ากระเป๋าอัตโนมัติ")) return;
        executeDelete(row, monthParam);
    } else {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ยอดเงินของรายการนี้ จะถูกดึงกลับเข้ากระเป๋าให้อัตโนมัติ",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ใช่, ลบเลย!'
        });
        if (confirm.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            executeDelete(row, monthParam);
        }
    }
}

async function executeDelete(row, monthParam) {
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteOrder', row: row, month: monthParam })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            if (typeof Swal !== 'undefined') Swal.fire('สำเร็จ!', result.message, 'success');
            else alert('สำเร็จ: ' + result.message);
            loadDashboard(); 
        } else {
            throw new Error(result.message);
        }
    } catch(err) {
        if (typeof Swal !== 'undefined') Swal.fire('Error', err.message, 'error');
        else alert('Error: ' + err.message);
    }
}

function openTransferModal() { 
  $('transfer-modal').classList.add('open'); 
  if (!$('transfer-date').value) $('transfer-date').value = new Date().toISOString().split('T')[0];
}

function closeTransferModal() { 
  $('transfer-modal').classList.remove('open'); 
}

async function submitTransfer() {
  const date = $('transfer-date').value;
  const type = $('transfer-type').value;
  const amount = parseFloat($('transfer-amount').value);
  const note = $('transfer-note').value;

  if (!date || !amount) {
      if (typeof Swal !== 'undefined') Swal.fire('แจ้งเตือน', 'กรุณากรอกวันที่และจำนวนเงินให้ครบถ้วน', 'warning');
      else alert('กรุณากรอกวันที่และจำนวนเงินให้ครบถ้วน');
      return;
  }

  const btn = event.target;
  const oldTxt = btn.innerText;
  btn.disabled = true; btn.innerText = '⏳กำลังบันทึก...';

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'saveTransfer', date, type, amount, note })
    });
    const result = await res.json();
    if (result.status === 'success') {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: '✅ โยกเงินสำเร็จ!', timer: 1500, showConfirmButton: false });
      else alert('✅ บันทึกประวัติโยกเงินสำเร็จ!');
      
      $('transfer-amount').value = ''; $('transfer-note').value = '';
      closeTransferModal();
      loadDashboard(); 
    } else throw new Error(result.message);
  } catch(e) { 
      if (typeof Swal !== 'undefined') Swal.fire('Error', e.message, 'error');
      else alert('Error: ' + e); 
  }
  finally { btn.disabled = false; btn.innerText = oldTxt; }
}

function openSettings() { $('settings-modal').classList.add('open'); }
function closeSettings() { $('settings-modal').classList.remove('open'); }
async function saveSettings() {
  const url = $('sheet-url-input').value;
  if (!url) {
      if (typeof Swal !== 'undefined') Swal.fire('แจ้งเตือน', 'กรุณาวางลิงก์ Google Sheet', 'warning');
      else alert('กรุณาวางลิงก์');
      return;
  }
  const btn = event.target; btn.innerText='กำลังบันทึก...'; btn.disabled = true;
  try {
      const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'setSheetUrl', url: url })
    });
    const r = await res.json();
    if(r.status==='success') { 
        if (typeof Swal !== 'undefined') Swal.fire('สำเร็จ', 'อัปเดตไฟล์ฐานข้อมูลเรียบร้อย', 'success');
        else alert('อัปเดตไฟล์เรียบร้อย');
        closeSettings(); loadDashboard(); 
    }
  } catch(e){ 
      if (typeof Swal !== 'undefined') Swal.fire('Error', e.message, 'error');
      else alert(e); 
  }
  btn.innerText='บันทึกข้อมูล'; btn.disabled = false;
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