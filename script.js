// ⚠️ LIFF ID 
const LIFF_ID = "2008984741-8hcXjikx"; 

// ⚠️⚠️⚠️ สำคัญมาก! ใส่ URL ของ Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby4qaEDYaAnWM2qB7Zhd8vJ2nZGbFU-m9D4vOkvyelDIpwIYJrCD18bGKwMH-4QA3UG/exec";

// ⚠️ ใส่เบอร์โทร หรือ เลขบัตร ปชช. ที่ผูกพร้อมเพย์ (ห้ามมีขีด)
const PROMPTPAY_ID = "0990063438";

// เก็บข้อมูลลูกค้าที่โหลดมา
let customersData = [];

// ---- Data (ชุดข้อมูลสินค้า) ----
const DATA = {
  mice: [
    ["3XS", 8.00, 7.00], ["2XS", 11.00, 10.00], ["XS", 13.00, 11.00],
    ["S", 18.00, 15.00], ["M", 23.00, 21.00], ["L", 28.00, 26.00],
    ["XL", 34.00, 31.00], ["2XL", 38.00, 35.00], ["3XL", 42.00, 40.00],
  ],
  rat: [
    ["S", 35.00, 33.00], ["M1", 40.00, 38.00], ["M2", 45.00, 43.00], ["M3", 50.00, 48.00],
    ["L1", 55.00, 53.00], ["L2", 60.00, 58.00], ["XL", 65.00, 63.00], ["2XL", 70.00, 68.00],
    ["3XL", 75.00, 73.00], ["4XL", 85.00, 83.00], ["5XL", 95.00, 93.00], ["JB", 100.00, 98.00],
  ]
};

// ---- Helpers ----
const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString("th-TH", {minimumFractionDigits:(n%1?2:0), maximumFractionDigits:2});
const getSelectedAnimals = () => Array.from(document.querySelectorAll('input[name="animal"]:checked')).map(i=>i.value);
const animalLabel = key => key === 'mice' ? 'Mice' : 'Rat';
let qtyInputs = [];
let customPriceInputs = []; 

// 🌟 คำนวณส่วนลดท้ายบิล (สำหรับเปอร์เซ็นต์ หรือ ลดเหมา)
function getGlobalDiscount(subNet){ 
  const type = $('#promoType')?.value || 'none';
  const raw = parseFloat($('#promoValue')?.value || '0') || 0;
  let d = 0;
  if(type==='baht') d = Math.max(0, Math.min(raw, subNet));
  else if(type==='percent') d = Math.max(0, Math.min(100, raw))*subNet/100;
  return d;
}

// ============================================================
// 🆕 ฟังก์ชัน Google Sheet Customers (ดึงเกรดจากคอลัมน์ E)
// ============================================================
function getSheetIdFromUrl(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function loadCustomersFromSheet(isAutoLoad = false) {
  const sheetUrl = $('#sheetUrlInput').value.trim();
  const select = $('#customerSelect');
  if (!sheetUrl) { if (!isAutoLoad) Swal.fire('แจ้งเตือน', 'กรุณาใส่ลิงก์ Google Sheet ก่อนครับ', 'warning'); return; }
  const sheetId = getSheetIdFromUrl(sheetUrl);
  if (!sheetId) { if (!isAutoLoad) Swal.fire('ผิดพลาด', 'ลิงก์ไม่ถูกต้อง', 'error'); return; }
  
  try {
    if (isAutoLoad) select.innerHTML = '<option value="" selected>🔄 กำลังโหลดข้อมูลเก่า...</option>';
    else { select.innerHTML = '<option value="" selected>⏳ กำลังโหลดข้อมูล...</option>'; Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: () => Swal.showLoading() }); }
    
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`);
    if (!response.ok) throw new Error('ไม่สามารถเข้าถึง Google Sheet ได้\nตรวจสอบสิทธิ์การแชร์เป็น "Anyone with the link"');
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    if (rows.length < 2) throw new Error('ไม่พบข้อมูลในชีต');
    
    customersData = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].trim() !== '') {
        let id = rows[i][0].trim();
        let name = rows[i][1] ? rows[i][1].trim() : 'ไม่ระบุชื่อ';
        
        // 🌟 ดึงเกรดลูกค้าจากคอลัมน์ E (Index ที่ 4 ใน Array)
        let grade = rows[i][4] ? rows[i][4].trim() : ''; 
        
        let weight = 4; // ค่าเริ่มต้นให้อยู่ล่างสุด
        let prefix = '';
        
        if (grade === 'VIP' || grade === 'vip' || grade === 'แดง') { 
            weight = 1; prefix = '🔴 '; 
        } else if (grade === 'ประจำ' || grade === 'น้ำเงิน') { 
            weight = 2; prefix = '🔵 '; 
        } else if (grade === 'ขาจร' || grade === 'เหลือง') { 
            weight = 3; prefix = '🟡 '; 
        }else if (grade === 'Admin' || grade === 'ไฟ') { 
            weight = 4; prefix = '🔥 ';
        }
        
        customersData.push({ id: id, name: name, weight: weight, prefix: prefix });
      }
    }
    
    // เรียงลำดับตามสี และชื่อ
    customersData.sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight;
        return a.name.localeCompare(b.name, 'th');
    });

    select.innerHTML = '<option value="" selected disabled>-- เลือกรายชื่อลูกค้า --</option>';
    if (customersData.length === 0) {
      select.innerHTML = '<option value="" selected>ไม่พบข้อมูลลูกค้า</option>';
      if (!isAutoLoad) Swal.fire('ไม่พบข้อมูล', 'ไม่พบข้อมูลลูกค้าในชีต', 'warning');
      return;
    }
    
    customersData.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id; 
      option.setAttribute('data-clean-name', c.name); // ซ่อนชื่อที่ไม่มีดาวไว้ใช้งาน
      option.textContent = c.prefix + c.name; // แสดงดาวบนหน้าเว็บ
      select.appendChild(option);
    });
    localStorage.setItem('sheetUrl', sheetUrl);
    
    if (!isAutoLoad) Swal.fire({ icon: 'success', title: 'โหลดข้อมูลสำเร็จ!', text: `พบลูกค้า ${customersData.length} คน`, timer: 2000, showConfirmButton: false });
  } catch (error) {
    select.innerHTML = '<option value="" selected>❌ เกิดข้อผิดพลาด</option>';
    if (!isAutoLoad) Swal.fire({ icon: 'error', title: 'ไม่สามารถโหลดข้อมูลได้', text: error.message, confirmButtonText: 'ตกลง' });
  }
}

function parseCSV(text) {
  const rows = []; let currentRow = []; let currentField = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentField += '"'; i++; } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) { currentRow.push(currentField); currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim() !== '')) rows.push(currentRow);
      currentRow = []; currentField = '';
    } else currentField += char;
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) rows.push(currentRow);
  }
  return rows;
}

// ============================================================
// 🌟 Build Table (แก้ไขอินพุตราคาขายเพื่อให้แมตช์ธีมมินิมอลส้ม)
// ============================================================
function buildTable(){
  const animals = getSelectedAnimals();
  const ptype = document.querySelector('input[name="ptype"]:checked').value;
  const priceIdx = ptype==='retail'?1:2;
  qtyInputs=[];
  customPriceInputs=[];

  if(animals.length===0){
    $("#tableWrap").innerHTML='<div class="hint" style="padding: 20px; text-align: center;">โปรดเลือกอย่างน้อย 1 ประเภทด้านบน (Mice/Rat)</div>';
    return;
  }

  let html='';
  animals.forEach(animal=>{
    const rows=DATA[animal].map(([size,ret,whl])=>{
      const unit=priceIdx===1?ret:whl;
      return `
        <tr>
          <td style="font-weight: 600;">${size}</td>
          <td class="muted">${fmt(unit)}</td>
          <td><input type="number" min="0" step="0.5" data-animal="${animal}" data-size="${size}" class="custom-price" placeholder="${unit}" style="width:75px; text-align:center; border: 1px solid var(--accent); background: #fffdfa; padding: 6px; font-size:13px; font-weight:700; color:var(--accent);"></td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="fresh" data-size="${size}" data-unit="${unit}" class="qty" placeholder="0" style="padding: 6px; font-size:14px;"></td>
          <td><input type="number" min="0" step="1" data-animal="${animal}" data-type="frozen" data-size="${size}" data-unit="${unit}" class="qty" placeholder="0" style="padding: 6px; font-size:14px;"></td>
          <td class="line" data-animal="${animal}" data-size="${size}" style="font-weight: 700;">0</td>
        </tr>`;
    }).join("");
    html += `
      <div class="head" style="margin-top:16px; padding-left: 6px;"><h2 style="color:var(--text);">${animalLabel(animal)}</h2></div>
      <table><thead><tr>
        <th>ไซส์</th><th>ราคาปกติ</th><th>ราคาขายพิเศษ</th><th>แช่ (ตัว)</th><th>เป็น (ตัว)</th><th>รวม (บาท)</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  });

  $("#tableWrap").innerHTML=html;
  
  qtyInputs=Array.from(document.querySelectorAll(".qty"));
  customPriceInputs=Array.from(document.querySelectorAll(".custom-price"));
  qtyInputs.forEach(i=> i.addEventListener("input", recalc));
  customPriceInputs.forEach(i=> i.addEventListener("input", recalc));
  recalc();
}

// ============================================================
// 🌟 Recalc 
// ============================================================
function recalc(){
  const shipMethod = $("#shipMethod").value;
  const shipCostEl = $("#shipCost");
  if (shipMethod === "รับเอง"){ shipCostEl.value = 0; shipCostEl.disabled = true; }
  else { shipCostEl.disabled = false; }
  if (!$("#shipCost").value) $("#shipCost").value = 0;

  let subFullPrice = 0; 
  let customDiscTotal = 0; 

  const animals = getSelectedAnimals();
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z = document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const cp = document.querySelector(`input.custom-price[data-animal="${a}"][data-size="${size}"]`);
      
      const qf = parseInt(f?.value||0,10)||0;
      const qz = parseInt(z?.value||0,10)||0;
      const unit = parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      
      const effectivePrice = (cp && cp.value !== "") ? parseFloat(cp.value) : unit;
      const discPerItem = unit - effectivePrice; 
      
      const totalQty = qf + qz;
      subFullPrice += totalQty * unit; 
      if (discPerItem > 0) customDiscTotal += totalQty * discPerItem; 

      const lineNet = totalQty * effectivePrice;
      const cell=document.querySelector(`.line[data-animal="${a}"][data-size="${size}"]`);
      if(cell) cell.textContent=fmt(lineNet);
    });
  });

  const subNetAfterCustom = subFullPrice - customDiscTotal;
  const globalDiscount = getGlobalDiscount(subNetAfterCustom); 
  const totalDiscount = customDiscTotal + globalDiscount; 
  
  const ship = parseFloat($("#shipCost").value||0);
  const grand = subFullPrice - totalDiscount + ship;
  
  $("#subTotal").textContent=fmt(subFullPrice);
  $("#promoTotal").textContent=fmt(totalDiscount);
  $("#shipTotal").textContent=fmt(ship);
  $("#grandTotal").textContent=fmt(grand);
  
  buildMessage(subFullPrice, ship, totalDiscount, customDiscTotal, globalDiscount);
}

// ============================================================
// 🌟 Build Message
// ============================================================
function buildMessage(subFullPrice, ship, totalDiscount, customDiscTotal, globalDiscount){
  const prefix=$("#msgPrefix").value.trim();
  const suffixTpl=$("#msgSuffix").value.trim();
  const shipMethod=$("#shipMethod").value;
  const ptype=document.querySelector('input[name="ptype"]:checked').value;
  const pLabel=ptype==='retail'?'ปลีก':'ส่ง';
  const animals=getSelectedAnimals();
  const header=`${prefix} (${pLabel}) ${animals.map(animalLabel).join(' + ')}`;
  const body=[];
  
  animals.forEach(a=>{
    DATA[a].forEach(([size])=>{
      const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
      const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
      const cp=document.querySelector(`input.custom-price[data-animal="${a}"][data-size="${size}"]`);
      
      const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
      const qf=parseInt(f?.value||0,10)||0;
      const qz=parseInt(z?.value||0,10)||0;
      
      const effectivePrice = (cp && cp.value !== "") ? parseFloat(cp.value) : unit;
      const discPerItem = unit - effectivePrice;

      if(qf) {
        let txt = `[${animalLabel(a)}] ${size} (แช่) ${qf} ตัว ราคา ${fmt(qf*unit)} บาท`;
        if (discPerItem > 0) txt += `\n   ↳ (ราคาพิเศษ ${fmt(effectivePrice)}บ./ตัว ประหยัดไป ${fmt(qf*discPerItem)}บ.)`;
        body.push(txt);
      }
      if(qz) {
        let txt = `[${animalLabel(a)}] ${size} (เป็น) ${qz} ตัว ราคา ${fmt(qz*unit)} บาท`;
        if (discPerItem > 0) txt += `\n   ↳ (ราคาพิเศษ ${fmt(effectivePrice)}บ./ตัว ประหยัดไป ${fmt(qz*discPerItem)}บ.)`;
        body.push(txt);
      }
    });
  });
  
  if(globalDiscount>0) body.push(`\nส่วนลดเพิ่มเติม ${fmt(globalDiscount)} บาท`);
  if(totalDiscount>0) body.push(`\n🎉 รวมประหยัดไปทั้งหมด ${fmt(totalDiscount)} บาท`);
  
  if(ship>0 && shipMethod!=="รับเอง") body.push(`ขนส่ง ${shipMethod} ${fmt(ship)} บาท`);
  
  const totalText=suffixTpl.replace("{TOTAL}",fmt(subFullPrice - totalDiscount + ship));
  $("#messageBox").textContent=`${header}\n\n${body.join("\n")}\n\n${totalText}`.trim();
}

// ---- Receipt Modal ----
function openReceipt(){ $("#billContent").innerHTML=buildReceiptHTML(); $("#billModal").classList.add("open"); }
function closeReceipt(){ $("#billModal").classList.remove("open"); }
async function copyReceipt(){ await navigator.clipboard.writeText($("#billContent").innerText); }
function buildReceiptHTML(){
    const now=new Date();
    let html=`<div class="meta">วันที่ ${now.toLocaleDateString('th-TH')}</div><table><thead><tr><th>รายการสินค้า</th><th>ยอดรวม</th></tr></thead><tbody>`;
    
    let subFullPrice = 0;
    let customDiscTotal = 0;
    
    const animals=getSelectedAnimals();
    animals.forEach(a=>{
        DATA[a].forEach(([size])=>{
        const f=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="fresh"]`);
        const z=document.querySelector(`input.qty[data-animal="${a}"][data-size="${size}"][data-type="frozen"]`);
        const cp=document.querySelector(`input.custom-price[data-animal="${a}"][data-size="${size}"]`);
        
        const unit=parseFloat(f?.dataset.unit||z?.dataset.unit||0);
        const qf=parseInt(f?.value||0,10)||0;
        const qz=parseInt(z?.value||0,10)||0;
        
        const effectivePrice = (cp && cp.value !== "") ? parseFloat(cp.value) : unit;
        const discPerItem = unit - effectivePrice;
        
        if (discPerItem > 0) customDiscTotal += (qf + qz) * discPerItem;

        if(qf){
            subFullPrice += qf*unit;
            html+=`<tr><td>[${animalLabel(a)}] ${size} (แช่) × ${qf}</td><td>${fmt(qf*unit)}</td></tr>`;
        }
        if(qz){
            subFullPrice += qz*unit;
            html+=`<tr><td>[${animalLabel(a)}] ${size} (เป็น) × ${qz}</td><td>${fmt(qz*unit)}</td></tr>`;
        }
        });
    });
    
    const globalDiscount = getGlobalDiscount(subFullPrice - customDiscTotal);
    const totalDiscount = customDiscTotal + globalDiscount;
    const ship=parseFloat($("#shipCost").value||0);
    const shipMethod=$("#shipMethod").value;
    const grand = subFullPrice - totalDiscount + ship;
    
    html+=`</tbody><tfoot><tr><td>รวมค่าสินค้า</td><td>${fmt(subFullPrice)}</td></tr>${totalDiscount>0?`<tr><td>ส่วนลดหักออก</td><td style="color:#df2121;">-${fmt(totalDiscount)}</td></tr>`:''}${ship>0?`<tr><td>ค่าส่ง (${shipMethod})</td><td>${fmt(ship)}</td></tr>`:''}<tr><td class="grand">สุทธิที่ต้องชำระ</td><td class="grand">${fmt(grand)}</td></tr></tfoot></table>`;
    return html;
}

// ============================================================
// 🚀 ฟังก์ชันส่งบิล Flex Message 
// ============================================================
async function sendFlexBill() {
    const selectEl = document.getElementById("customerSelect");
    const customerId = selectEl.value;
    let customerName = "คุณลูกค้า";
    if (selectEl.selectedIndex >= 0) {
        const opt = selectEl.options[selectEl.selectedIndex];
        customerName = opt.getAttribute("data-clean-name") || opt.text;
    }
    if (customerName.includes("เลือกรายชื่อ")) customerName = "คุณลูกค้า";

    if (!customerId) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกหรือกรอกรายชื่อลูกค้าก่อนครับ', 'warning'); return; }

    let items = [];
    let subFullPrice = 0;
    let customDiscTotal = 0;

    document.querySelectorAll(".qty").forEach(e => {
        let q = parseInt(e.value) || 0;
        if (q > 0) {
            const animalKey = e.dataset.a || e.dataset.animal;
            const sizeKey   = e.dataset.s || e.dataset.size;
            const typeKey   = e.dataset.t || e.dataset.type;
            const priceKey  = parseFloat(e.dataset.p || e.dataset.unit || 0);
            
            const cp = document.querySelector(`input.custom-price[data-animal="${animalKey}"][data-size="${sizeKey}"]`);
            const effectivePrice = (cp && cp.value !== "") ? parseFloat(cp.value) : priceKey;
            const discPerItem = priceKey - effectivePrice;
            
            const lineGross = q * priceKey;
            const lineDisc = q * discPerItem;
            
            subFullPrice += lineGross;
            if (discPerItem > 0) customDiscTotal += lineDisc;

            items.push({
                animal: animalLabel(animalKey),
                size: sizeKey,
                type: typeKey === 'fresh' ? 'แช่' : (typeKey === 'frozen' ? 'เป็น' : typeKey),
                qty: q,
                fullPrice: lineGross,
                effectivePrice: effectivePrice,
                discPerItem: discPerItem,
                lineDisc: lineDisc
            });
        }
    });

    if (items.length === 0) { Swal.fire('เตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning'); return; }

    const ship = parseFloat($("#shipCost").value || 0);
    const shipMethod = $("#shipMethod").value;
    const globalDiscount = getGlobalDiscount(subFullPrice - customDiscTotal);
    const totalDiscount = customDiscTotal + globalDiscount;
    const total = subFullPrice - totalDiscount + ship;
    const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    let flexItems = [];
    items.forEach(i => {
        flexItems.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": i.animal, "size": "sm", "color": "#555555", "flex": 0 },
                { "type": "text", "text": `${i.size} (${i.type})`, "margin": "sm", "size": "sm", "color": "#555555", "flex": 0 },
                { "type": "text", "text": String(i.qty), "size": "sm", "margin": "md", "flex": 0, "color": "#111111" },
                { "type": "text", "text": fmt(i.fullPrice), "size": "sm", "color": "#111111", "align": "end" }
            ]
        });
        
        if (i.discPerItem > 0) {
            flexItems.push({
                "type": "box", "layout": "baseline", "spacing": "sm",
                "contents": [
                    { "type": "text", "text": `   ↳ ลดเหลือ ${fmt(i.effectivePrice)}฿/ตัว`, "size": "xs", "color": "#ff6a00", "flex": 3 },
                    { "type": "text", "text": `-${fmt(i.lineDisc)}`, "size": "xs", "color": "#ff6a00", "align": "end", "flex": 1 }
                ]
            });
        }
    });

    if (ship > 0) {
        flexItems.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": "ค่าส่ง", "size": "sm", "color": "#555555", "flex": 0 },
                { "type": "text", "text": shipMethod, "margin": "sm", "size": "sm", "color": "#555555", "flex": 1, "wrap": true },
                { "type": "text", "text": fmt(ship), "size": "sm", "color": "#111111", "align": "end" }
            ]
        });
    }

    if (totalDiscount > 0) {
        flexItems.push({
            "type": "box", "layout": "baseline",
            "contents": [
                { "type": "text", "text": "รวมส่วนลด", "size": "sm", "color": "#ff3333", "flex": 0 },
                { "type": "text", "text": "-" + fmt(totalDiscount), "size": "sm", "color": "#ff3333", "align": "end" }
            ]
        });
    }

    const qrUrl = `https://promptpay.io/${PROMPTPAY_ID}/${total}`;

    const flexMessage = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "contents": [ { "type": "image", "url": "https://image2url.com/r2/default/images/1769504171528-44fb59f7-c558-4d57-bb8e-820f68ccd885.png", "margin": "md", "size": "sm" } ] },
        "body": {
            "type": "box", "layout": "vertical",
            "contents": [
                { "type": "text", "text": "บิลแจ้งยอดชำระ", "weight": "bold", "size": "xl" },
                { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [ { "type": "text", "text": "วันที่:", "color": "#aaaaaa", "size": "sm", "flex": 1 }, { "type": "text", "text": dateStr, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 } ] },
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [ { "type": "text", "text": "ลูกค้า:", "color": "#aaaaaa", "size": "sm", "flex": 1 }, { "type": "text", "text": customerName, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 } ] }
                ]},
                { "type": "separator", "margin": "xxl" },
                { "type": "box", "layout": "vertical", "margin": "xxl", "spacing": "sm", "contents": flexItems },
                { "type": "separator", "margin": "xxl" },
                { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#555555", "weight": "bold" }, { "type": "text", "text": fmt(total) + " ฿", "size": "xl", "color": "#111111", "align": "end", "weight": "bold" } ] }
            ]
        },
        "footer": {
            "type": "box", "layout": "vertical", "spacing": "md",
            "contents": [
                { "type": "text", "text": "สแกนเพื่อชำระเงิน (พร้อมเพย์)", "size": "xs", "align": "center", "color": "#aaaaaa" },
                { "type": "image", "url": qrUrl, "size": "lg", "aspectMode": "cover", "margin": "md" },
                { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "xs", "contents": [ { "type": "text", "text": "ธ.กรุงไทย", "size": "sm", "weight": "bold", "align": "center" }, { "type": "text", "text": "983-1-84269-3", "size": "sm", "align": "center", "color": "#555555" }, { "type": "text", "text": "ชื่อ: กฤตธนัท สมานเพ็ขร์", "size": "xs", "align": "center", "color": "#aaaaaa" } ] }
            ], "paddingAll": "20px", "backgroundColor": "#ffffff"
        }
    };

    Swal.fire({ title: 'กำลังส่งบิล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
              action: 'sendFlex', 
              userId: customerId, 
              flexMessage: flexMessage,
              altText: "💰 บิลแจ้งยอดชำระจาก Big Mouse" }),
            redirect: 'follow'
        });
        const result = await response.json();
        if (result.status === 'success') Swal.fire('สำเร็จ!', 'ส่งบิลเรียบร้อยแล้วครับ 🐭', 'success');
        else Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + result.message, 'error');
    } catch (error) { Swal.fire('Error', 'ไม่สามารถส่งบิลได้: ' + error.message, 'error'); }
}

// ============================================================
// 🚚 ฟังก์ชันส่งแจ้งเลขพัสดุ (Tracking Flex Message)
// ============================================================
async function sendTrackingFlex() {
    const selectEl = document.getElementById("customerSelect");
    const customerId = selectEl.value;
    let customerName = "คุณลูกค้า";
    if (selectEl.selectedIndex >= 0) {
        const opt = selectEl.options[selectEl.selectedIndex];
        customerName = opt.getAttribute("data-clean-name") || opt.text;
    }
    
    if (!customerId || customerName.includes("เลือกรายชื่อ")) {
        Swal.fire('แจ้งเตือน', 'กรุณาโหลดและเลือกรายชื่อลูกค้าด้านบนก่อนครับ', 'warning');
        return;
    }

    const transportSelect = document.getElementById("trackTransport").value;
    const otherNameElement = document.getElementById("otherTransportName");
    const otherName = otherNameElement ? otherNameElement.value.trim() : "";
    const transport = (transportSelect === 'other') ? (otherName || "ไม่ระบุ") : transportSelect;

    const trackNo = document.getElementById("trackNo").value.trim() || "-";
    const trackUrl = document.getElementById("trackUrl").value.trim();
    const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    if (!document.getElementById("trackNo").value.trim()) {
        const confirm = await Swal.fire({
            title: 'ยังไม่ได้ใส่เลขพัสดุ', text: 'ต้องการส่งโดยไม่ระบุเลขพัสดุใช่หรือไม่?', icon: 'question', showCancelButton: true
        });
        if (!confirm.isConfirmed) return;
    }

    let footerContents = [];
    if (trackUrl && trackUrl.startsWith('http')) {
        footerContents.push({
            "type": "button",
            "style": "primary",
            "color": "#222423",
            "action": { "type": "uri", "label": "เช็คสถานะพัสดุ", "uri": trackUrl }
        });
    }

    const flexMessage = {
        "type": "bubble",
        "size": "mega",
        "header": {
            "type": "box", "layout": "vertical", "backgroundColor": "#222423",
            "paddingTop": "19px", "paddingAll": "12px", "paddingBottom": "16px",
            "contents": [
                { "type": "text", "text": "🚚 จัดส่งสินค้าเรียบร้อย", "weight": "bold", "color": "#ffffff", "size": "xl" }
            ]
        },
        "body": {
            "type": "box", "layout": "vertical", "spacing": "md",
            "contents": [
                {
                    "type": "box", "layout": "baseline", "spacing": "sm",
                    "contents": [
                        { "type": "text", "text": "ลูกค้า:", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                        { "type": "text", "text": customerName, "wrap": true, "color": "#444444", "size": "sm", "flex": 5, "weight": "bold" }
                    ]
                },
                {
                    "type": "box", "layout": "baseline", "spacing": "sm",
                    "contents": [
                        { "type": "text", "text": "ขนส่ง:", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                        { "type": "text", "text": transport, "wrap": true, "color": "#444444", "size": "sm", "flex": 5 }
                    ]
                },
                {
                    "type": "box", "layout": "baseline", "spacing": "sm",
                    "contents": [
                        { "type": "text", "text": "เลขพัสดุ:", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                        { "type": "text", "text": trackNo, "wrap": true, "color": "#ff6a00", "size": "md", "flex": 5, "weight": "bold" }
                    ]
                },
                {
                    "type": "box", "layout": "baseline", "spacing": "sm",
                    "contents": [
                        { "type": "text", "text": "วันที่ส่ง:", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                        { "type": "text", "text": dateStr, "wrap": true, "color": "#444444", "size": "sm", "flex": 5 }
                    ]
                },
                { "type": "separator", "margin": "lg" },
                { "type": "text", "text": "ขอบพระคุณที่อุดหนุน Big Mouse ครับ 🐭", "size": "xs", "color": "#aaaaaa", "wrap": true, "margin": "lg", "align": "center" }
            ]
        }
    };

    if (footerContents.length > 0) {
        flexMessage.footer = { "type": "box", "layout": "vertical", "contents": footerContents };
    }

    Swal.fire({ title: 'กำลังส่งแจ้งเลขพัสดุ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
              action: 'sendFlex', 
              userId: customerId, 
              flexMessage: flexMessage,
              altText: "🚚 อัปเดตสถานะการจัดส่งพัสดุ" }),
            redirect: 'follow'
        });

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire('สำเร็จ!', 'ยิงเลขพัสดุให้ลูกค้าเรียบร้อยครับ 🚚', 'success');
            
            document.getElementById("trackNo").value = "";
            document.getElementById("trackUrl").value = "";
            if (document.getElementById("otherTransportName")) document.getElementById("otherTransportName").value = "";
            if (document.getElementById("otherTransportWrap")) document.getElementById("otherTransportWrap").style.display = "none";
            document.getElementById("trackTransport").value = "Nim Express"; 

        } else {
            Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + result.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'ไม่สามารถส่งได้: ' + error.message, 'error');
    }
}

// ---- Events ----
function wireEvents(){
  document.querySelectorAll('input[name="animal"]').forEach(cb=>cb.addEventListener('change',buildTable));
  document.querySelectorAll('input[name="ptype"]').forEach(r=>r.addEventListener('change',buildTable));
  $("#shipMethod").addEventListener('change',recalc);
  $("#shipCost").addEventListener('input',recalc);
  $("#msgPrefix").addEventListener('input',recalc);
  $("#msgSuffix").addEventListener('input',recalc);
  $("#promoType").addEventListener('change',recalc);
  $("#promoValue").addEventListener('input',recalc);
  $("#copyBtn").addEventListener('click',async()=>{
    await navigator.clipboard.writeText($("#messageBox").textContent);
    Swal.fire({ icon: 'success', title: 'คัดลอกข้อความแล้ว', timer: 1500, showConfirmButton: false });
  });
  
  $("#showReceiptBtn").addEventListener('click',openReceipt);
  $("#billClose").addEventListener('click',closeReceipt);
  $("#billDone").addEventListener('click',closeReceipt);
  $("#billCopy").addEventListener('click',copyReceipt);
  document.querySelector('#billModal .modal-backdrop').addEventListener('click',closeReceipt);

  $("#loadSheetBtn").addEventListener('click', () => loadCustomersFromSheet(false));
  $("#sheetUrlInput").addEventListener('keypress', (e) => { if (e.key === 'Enter') loadCustomersFromSheet(false); });
  
  const lineBtn = document.getElementById('sendLineFlexBtn');
  if(lineBtn) lineBtn.addEventListener('click', sendFlexBill);

  // 🌟 ผูกปุ่มส่งเลขพัสดุ
  const trackBtn = document.getElementById('sendTrackingBtn');
  if(trackBtn) trackBtn.addEventListener('click', sendTrackingFlex);

  // 🌟 ดักการแสดงผลช่องกรอกอื่นๆ
  const transportSelect = document.getElementById('trackTransport');
  if (transportSelect) {
      transportSelect.addEventListener('change', function() {
          const otherWrap = document.getElementById('otherTransportWrap');
          if (this.value === 'other') {
              otherWrap.style.display = 'block';
              document.getElementById('otherTransportName').focus();
          } else {
              otherWrap.style.display = 'none';
              document.getElementById('otherTransportName').value = '';
          }
      });
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  buildTable();
  wireEvents();
  
  const savedUrl = localStorage.getItem('sheetUrl');
  if (savedUrl) {
    $('#sheetUrlInput').value = savedUrl;
    loadCustomersFromSheet(true); 
  }
  
  try { await liff.init({ liffId: LIFF_ID }); } catch (err) {}
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