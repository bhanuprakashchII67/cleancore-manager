const SUPABASE_URL="https://rwfamxkfqslorxcryjrp.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_tzfe2xVn6OAwF-Mh5_u_zQ_a_bAW7tO";
const {createClient}=supabase; const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const bootSignout=db.auth.signOut({scope:"local"}).catch(()=>null);
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n||0));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const phoneRE=/^[6-9]\d{9}$/;
const gstRE=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
let user=null,products=[],invoices=[],customers=[],enquiries=[],rawMaterials=[];
let editingProductId=null, editingCustomerId=null, editingRawId=null;

function toast(m,ok=true){const t=$("toast");t.textContent=m;t.className="toast show "+(ok?"ok":"bad");setTimeout(()=>t.className="toast",3200)}
function table(h,rows){if(!rows.length)return '<div class="empty">No records yet.</div>';return `<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
function normalizePhone(v){return String(v||"").replace(/\D/g,"").replace(/^91/,"")}
function validPhone(v){return phoneRE.test(normalizePhone(v))}
function validGstin(v){return !v || gstRE.test(String(v).trim().toUpperCase())}
function isoDate(d){return new Date(d).toLocaleDateString("en-IN")}
function mediaUrls(p,key){const v=p?.[key];return Array.isArray(v)?v:[]}

async function adminCheck(){const {data,error}=await db.from("profiles").select("role").eq("id",user.id).single();if(error||data?.role!=="admin")throw new Error("This account is not authorized as a CleanCore admin.")}
async function enter(){try{await adminCheck();$("loginView").classList.add("hidden");$("appView").classList.remove("hidden");$("profileEmail").textContent=user.email;await loadAll()}catch(e){await db.auth.signOut({scope:"local"});toast(e.message,false)}}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const password=$("loginPassword").value;if(!password)return toast("Enter your admin password.",false);try{await bootSignout; const {data,error}=await db.auth.signInWithPassword({email:"bhanuprakashchadalawada10@gmail.com",password});if(error)return toast("Login failed: "+error.message,false);if(!data?.session)return toast("Login failed: No session returned.",false);user=data.user;await enter()}catch(err){console.error("CleanCore login error",err);return toast("Supabase connection failed. Please refresh and try again.",false)}});
$("logout").onclick=async()=>{await db.auth.signOut({scope:"local"});location.reload()};
document.querySelectorAll(".nav[data-section]").forEach(b=>b.onclick=()=>go(b.dataset.section));
document.querySelectorAll(".goto").forEach(b=>b.onclick=()=>go(b.dataset.goto));
function go(id){document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".nav[data-section]").forEach(b=>b.classList.toggle("active",b.dataset.section===id));$("title").textContent=document.querySelector(`.nav[data-section="${id}"]`)?.textContent||id}

async function loadAll(){
 const [p,i,c,e,r]=await Promise.all([
  db.from("products").select("*").order("name"),
  db.from("invoices").select("*").order("created_at",{ascending:false}),
  db.from("customers").select("*").order("name"),
  db.from("enquiries").select("*").order("created_at",{ascending:false}),
  db.from("raw_materials").select("*").order("name")
 ]);
 if(p.error)return toast(p.error.message,false);
 if(i.error)return toast(i.error.message,false);
 if(c.error)return toast(c.error.message,false);
 if(e.error)return toast(e.error.message,false);
 if(r.error)return toast(r.error.message,false);
 products=p.data||[];invoices=i.data||[];customers=c.data||[];enquiries=e.data||[];rawMaterials=r.data||[];
 renderAll();
}
function renderAll(){
 const now=new Date(),day=new Date(now.getFullYear(),now.getMonth(),now.getDate()),mon=new Date(now.getFullYear(),now.getMonth(),1);
 const td=invoices.filter(x=>new Date(x.created_at)>=day),mo=invoices.filter(x=>new Date(x.created_at)>=mon);
 $("today").textContent=money(td.reduce((a,x)=>a+Number(x.total),0));
 $("month").textContent=money(mo.reduce((a,x)=>a+Number(x.total),0));
 $("profit").textContent=money(mo.reduce((a,x)=>a+Number(x.profit),0));
 $("low").textContent=products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length+rawMaterials.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length;
 $("recent").innerHTML=table(["Invoice","Customer","Total","Date"],invoices.slice(0,8).map(x=>[esc(x.invoice_no),esc(x.customer_name),money(x.total),new Date(x.created_at).toLocaleString("en-IN")]));
 $("productsTable").innerHTML=table(["Product","Unit","Selling","Cost","Stock","Status","Action"],products.map(p=>[
  esc(p.name),esc(p.unit),money(p.selling_price),money(p.cost_price),p.stock,
  Number(p.stock)<=Number(p.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>',
  `<button class="link" onclick="editProduct('${p.id}')">Edit</button>`
 ]));
 $("rawTable").innerHTML=table(["Raw material","Unit","Cost / unit","Stock","Status","Action"],rawMaterials.map(r=>[
  esc(r.name),esc(r.unit),money(r.cost_per_unit),r.stock,
  Number(r.stock)<=Number(r.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>',
  `<button class="link" onclick="editRawMaterial('${r.id}')">Edit</button>`
 ]));
 renderSales();
 renderCustomers();
 $("enquiriesTable").innerHTML=table(["Name","Phone","Business","Message","Status","Date"],enquiries.map(x=>[esc(x.name),esc(x.phone),esc(x.business),esc(x.message),esc(x.status),isoDate(x.created_at)]));
 rebuildLines();
}
function renderSales(){
 const from=$("salesFrom")?.value,to=$("salesTo")?.value;
 let list=invoices.slice();
 if(from){const d=new Date(from+"T00:00:00");list=list.filter(x=>new Date(x.created_at)>=d)}
 if(to){const d=new Date(to+"T23:59:59");list=list.filter(x=>new Date(x.created_at)<=d)}
 $("salesSummary").textContent=list.length+" bill"+(list.length===1?"":"s")+" • "+money(list.reduce((a,x)=>a+Number(x.total),0))+" sales";
 $("salesTable").innerHTML=table(["Invoice","Customer","Subtotal","Discount","GST","Total","Profit","Date","Action"],list.map(x=>[
  esc(x.invoice_no),esc(x.customer_name),money(x.subtotal),money(x.discount),String(Number(x.gst_percent||0))+"%",money(x.total),money(x.profit),new Date(x.created_at).toLocaleString("en-IN"),
  '<button class="link" onclick="viewInvoice(\''+x.id+'\')">View Bill</button>'
 ]));
}
function renderCustomers(){
 $("customersTable").innerHTML=table(["Customer","Business","Phone","Email","GSTIN","Billing address","Delivery address","Purchases","Action"],customers.map(x=>[
  esc(x.name),esc(x.business_name),esc(x.phone),esc(x.email),esc(x.gstin),esc(x.billing_address),esc(x.delivery_address),
  money(x.total_purchases),`<button class="link" onclick="editCustomer('${x.id}')">Edit</button>`
 ]));
 $("billingCustomer").innerHTML=`<option value="">New / enter customer</option>${customers.map(x=>`<option value="${x.id}">${esc(x.name)}${x.business_name?" — "+esc(x.business_name):""} (${esc(x.phone)})</option>`).join("")}`;
}

function resetProductForm(){
 editingProductId=null;
 ["pname","punit","pcost","pstock","pdesc","pdetails"].forEach(id=>$(id).value="");
 $("pprice").value=349;$("plow").value=5;$("pimages").value="";$("pvideos").value="";
 $("productMedia").innerHTML="";$("productDialogTitle").textContent="Add New Product";
}
$("addProduct").onclick=()=>{resetProductForm();$("productDialog").showModal()};
window.editProduct=id=>{
 const p=products.find(x=>x.id===id);if(!p)return;editingProductId=id;
 $("pname").value=p.name||"";$("punit").value=p.unit||"";$("pprice").value=p.selling_price??349;$("pcost").value=p.cost_price??0;$("pstock").value=p.stock??0;$("plow").value=p.low_stock_threshold??5;
 $("pdesc").value=p.description||"";$("pdetails").value=p.additional_details||"";$("pimages").value="";$("pvideos").value="";
 $("productDialogTitle").textContent="Edit Product";renderProductMedia(p);$("productDialog").showModal()
}
function renderProductMedia(p){
 const imgs=mediaUrls(p,"image_urls"),vids=mediaUrls(p,"video_urls");
 $("productMedia").innerHTML=(imgs.length?`<div><b>Photos</b><div class="media-grid">${imgs.map(u=>`<div class="media-item"><img src="${esc(u)}"><button type="button" class="link danger" onclick="removeProductMedia('${p.id}','image','${encodeURIComponent(u)}')">Remove</button></div>`).join("")}</div></div>`:"")+
 (vids.length?`<div><b>Videos</b><div class="media-grid">${vids.map(u=>`<div class="media-item"><video src="${esc(u)}" controls></video><button type="button" class="link danger" onclick="removeProductMedia('${p.id}','video','${encodeURIComponent(u)}')">Remove</button></div>`).join("")}</div></div>`:"");
}
async function uploadFiles(files,folder){
 const urls=[];
 for(const file of [...files]){
  const ext=(file.name.split(".").pop()||"bin").toLowerCase(),path=`products/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from("product-media").upload(path,file,{upsert:false,contentType:file.type||undefined});
  if(error)throw error;
  urls.push(db.storage.from("product-media").getPublicUrl(path).data.publicUrl);
 }
 return urls;
}
window.removeProductMedia=async(id,type,encoded)=>{
 const p=products.find(x=>x.id===id);if(!p)return;const u=decodeURIComponent(encoded),key=type==="image"?"image_urls":"video_urls";
 const next=mediaUrls(p,key).filter(x=>x!==u);const {error}=await db.from("products").update({[key]:next}).eq("id",id);if(error)return toast(error.message,false);toast("Media removed");await loadAll();const fresh=products.find(x=>x.id===id);if(fresh)renderProductMedia(fresh);
}
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("pname").value.trim(),price=+$("pprice").value,cost=+$("pcost").value,stock=+$("pstock").value,low=+$("plow").value;
 if(!name)return toast("Enter product name",false);
 const old=editingProductId?products.find(p=>p.id===editingProductId):null;
 let image_urls=mediaUrls(old,"image_urls"),video_urls=mediaUrls(old,"video_urls");
 try{
  if($("pimages").files.length)image_urls=image_urls.concat(await uploadFiles($("pimages").files,"images"));
  if($("pvideos").files.length)video_urls=video_urls.concat(await uploadFiles($("pvideos").files,"videos"));
 }catch(err){return toast("Media upload failed: "+err.message,false)}
 const x={name,unit:$("punit").value.trim(),selling_price:price,cost_price:cost,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
 const q=editingProductId?db.from("products").update(x).eq("id",editingProductId):db.from("products").insert(x);
 const {error}=await q;if(error)return toast(error.message,false);$("productDialog").close();toast("Product saved");loadAll();
});

function resetRawForm(){editingRawId=null;$("rawName").value="";$("rawUnit").value="Kg";$("rawCost").value=0;$("rawStock").value=0;$("rawLow").value=5;$("rawDialogTitle").textContent="Add Raw Material"}
$("addRaw").onclick=()=>{resetRawForm();$("rawDialog").showModal()};
window.editRawMaterial=id=>{const r=rawMaterials.find(x=>x.id===id);if(!r)return;editingRawId=id;$("rawName").value=r.name||"";$("rawUnit").value=r.unit||"Kg";$("rawCost").value=r.cost_per_unit??0;$("rawStock").value=r.stock??0;$("rawLow").value=r.low_stock_threshold??5;$("rawDialogTitle").textContent="Edit Raw Material";$("rawDialog").showModal()};
$("rawForm").addEventListener("submit",async e=>{e.preventDefault();const x={name:$("rawName").value.trim(),unit:$("rawUnit").value.trim(),cost_per_unit:+$("rawCost").value,stock:+$("rawStock").value,low_stock_threshold:+$("rawLow").value};if(!x.name)return toast("Enter raw material name",false);const q=editingRawId?db.from("raw_materials").update(x).eq("id",editingRawId):db.from("raw_materials").insert(x);const {error}=await q;if(error)return toast(error.message,false);$("rawDialog").close();toast("Raw material saved");loadAll()});

function addLine(){
 const r=document.createElement("div");r.className="line";
 r.innerHTML=`<select class="lp">${products.map(p=>`<option value="${p.id}">${esc(p.name)} — ₹${p.selling_price} (${p.stock} in stock)</option>`).join("")}</select><input class="lq" type="number" min="1" value="1"><span class="lv">₹0</span><button type="button" class="remove">×</button>`;
 $("lines").appendChild(r);r.querySelectorAll("select,input").forEach(x=>x.oninput=calc);r.querySelector(".remove").onclick=()=>{r.remove();calc()};calc()
}
function rebuildLines(){if(!$("lines").children.length && products.length)addLine()}
$("addLine").onclick=addLine;$("discount").oninput=calc;$("gstPercent").oninput=calc;
$("billingCustomer").onchange=()=>{
 const c=customers.find(x=>x.id===$("billingCustomer").value);if(!c)return;
 $("custName").value=c.name||"";$("custBusiness").value=c.business_name||"";$("custPhone").value=c.phone||"";$("custEmail").value=c.email||"";$("custGstin").value=c.gstin||"";$("custBilling").value=c.billing_address||"";$("custDelivery").value=c.delivery_address||"";$("gstPercent").value=c.gstin?$("gstPercent").value:"";
 calc();
};
function calc(){
 let subtotal=0;
 document.querySelectorAll(".line").forEach(r=>{const p=products.find(x=>x.id===r.querySelector(".lp").value),q=+r.querySelector(".lq").value||0,v=(p?.selling_price||0)*q;subtotal+=v;r.querySelector(".lv").textContent=money(v)});
 const discount=Math.max(0,+$("discount").value||0),taxable=Math.max(0,subtotal-discount),gstin=$("custGstin").value.trim().toUpperCase(),gp=gstin?(+$("gstPercent").value||0):0,gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin ? gstin.slice(0,2)==="36" : false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 $("subtotal").textContent=money(subtotal);$("discountShow").textContent=money(discount);$("gstShow").textContent=`${gp}% • ${money(gst)}`;$("total").textContent=money(total);
 $("gstWrap").classList.toggle("hidden",!gstin);
 $("taxBreakdown").classList.toggle("hidden",!gstin);
 $("taxBreakdown").innerHTML=gstin?(intraState?`<div>CGST ${cgstPercent}%: <strong>${money(cgstAmount)}</strong></div><div>SGST ${sgstPercent}%: <strong>${money(sgstAmount)}</strong></div>`:`<div>IGST ${igstPercent}%: <strong>${money(igstAmount)}</strong></div>`):"";
}
$("custGstin").oninput=()=>{const v=$("custGstin").value.trim().toUpperCase();$("custGstin").value=v;calc()};
$("custPhone").oninput=e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,10)};
$("clearBill").onclick=()=>{$("billForm").reset();$("lines").innerHTML="";calc();rebuildLines()};
$("billForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("custName").value.trim(),business=$("custBusiness").value.trim(),phone=normalizePhone($("custPhone").value),email=$("custEmail").value.trim(),gstin=$("custGstin").value.trim().toUpperCase(),billing=$("custBilling").value.trim(),delivery=$("custDelivery").value.trim();
 if(!name)return toast("Enter customer name",false);
 if(!validPhone(phone))return toast("Phone must be exactly 10 digits and start with 6-9",false);
 if(!validGstin(gstin))return toast("Enter a valid 15-character GSTIN",false);
 const gp=gstin?+$("gstPercent").value:0;if(gstin && !(gp>0&&gp<=100))return toast("Enter GST percentage for this bill",false);
 const items=[...document.querySelectorAll(".line")].map(r=>{const p=products.find(x=>x.id===r.querySelector(".lp").value);return {p,q:+r.querySelector(".lq").value||0}}).filter(x=>x.p&&x.q>0);
 if(!items.length)return toast("Add an item",false);
 for(const x of items)if(x.q>x.p.stock)return toast(`${x.p.name}: only ${x.p.stock} cans in stock`,false);
 const subtotal=items.reduce((a,x)=>a+x.p.selling_price*x.q,0),discount=Math.min(subtotal,Math.max(0,+$("discount").value||0)),taxable=subtotal-discount,gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin ? gstin.slice(0,2)==="36" : false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 const profit=items.reduce((a,x)=>a+(x.p.selling_price-x.p.cost_price)*x.q,0)-discount;
 const no="CC-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+String(Date.now()).slice(-5);
 let c=customers.find(x=>x.id===$("billingCustomer").value)||customers.find(x=>x.phone===phone);
 const customerData={name, business_name:business, phone,email,gstin,billing_address:billing,delivery_address:delivery};
 if(!c){const q=await db.from("customers").insert(customerData).select().single();if(q.error)return toast(q.error.message,false);c=q.data}
 else{const q=await db.from("customers").update(customerData).eq("id",c.id);if(q.error)return toast(q.error.message,false)}
 const inv=await db.from("invoices").insert({invoice_no:no,customer_id:c.id,customer_name:name,customer_phone:phone,customer_business:business,customer_email:email,gstin,billing_address:billing,delivery_address:delivery,subtotal,discount,gst_percent:gp,gst_amount:gst,cgst_percent:cgstPercent,cgst_amount:cgstAmount,sgst_percent:sgstPercent,sgst_amount:sgstAmount,igst_percent:igstPercent,igst_amount:igstAmount,total,profit}).select().single();
 if(inv.error)return toast(inv.error.message,false);
 for(const x of items){
  const a=await db.from("invoice_items").insert({invoice_id:inv.data.id,product_id:x.p.id,product_name:x.p.name,qty:x.q,unit_price:x.p.selling_price,cost_price:x.p.cost_price,line_total:x.p.selling_price*x.q,line_profit:(x.p.selling_price-x.p.cost_price)*x.q});
  if(a.error)return toast(a.error.message,false);
  const b=await db.from("products").update({stock:Number(x.p.stock)-x.q}).eq("id",x.p.id);if(b.error)return toast(b.error.message,false);
 }
 toast("Invoice "+no+" saved successfully");
 $("billForm").reset();$("lines").innerHTML="";await loadAll();rebuildLines();
});
$("salesFrom").onchange=renderSales;$("salesTo").onchange=renderSales;$("clearSalesFilter").onclick=()=>{$("salesFrom").value="";$("salesTo").value="";renderSales()};
$("addCustomer").onclick=()=>{resetCustomerForm();$("customerDialog").showModal()};
function resetCustomerForm(){editingCustomerId=null;["customerName","businessName","customerPhone","customerEmail","customerGstin","billingAddress","deliveryAddress"].forEach(id=>$(id).value="");$("customerDialogTitle").textContent="Add New Customer"}
window.editCustomer=id=>{const c=customers.find(x=>x.id===id);if(!c)return;editingCustomerId=id;$("customerName").value=c.name||"";$("businessName").value=c.business_name||"";$("customerPhone").value=c.phone||"";$("customerEmail").value=c.email||"";$("customerGstin").value=c.gstin||"";$("billingAddress").value=c.billing_address||"";$("deliveryAddress").value=c.delivery_address||"";$("customerDialogTitle").textContent="Edit Customer";$("customerDialog").showModal()};
$("customerPhone").oninput=e=>e.target.value=e.target.value.replace(/\D/g,"").slice(0,10);
$("customerGstin").oninput=e=>e.target.value=e.target.value.toUpperCase().slice(0,15);
$("customerForm").addEventListener("submit",async e=>{e.preventDefault();const phone=normalizePhone($("customerPhone").value),gstin=$("customerGstin").value.trim().toUpperCase();if(!validPhone(phone))return toast("Phone must be exactly 10 digits and start with 6-9",false);if(!validGstin(gstin))return toast("Enter a valid 15-character GSTIN",false);const x={name:$("customerName").value.trim(),business_name:$("businessName").value.trim(),phone,email:$("customerEmail").value.trim(),gstin,billing_address:$("billingAddress").value.trim(),delivery_address:$("deliveryAddress").value.trim()};if(!x.name)return toast("Enter customer name",false);const q=editingCustomerId?db.from("customers").update(x).eq("id",editingCustomerId):db.from("customers").insert(x);const {error}=await q;if(error)return toast(error.message,false);$("customerDialog").close();toast("Customer saved");loadAll()});
$("addEnquiry").onclick=()=>$("enquiryDialog").showModal();
$("enquiryForm").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("enquiries").insert({name:$("ename").value.trim(),phone:$("ephone").value.trim(),business:$("ebusiness").value.trim(),message:$("emessage").value.trim(),status:$("estatus").value});if(error)return toast(error.message,false);$("enquiryDialog").close();toast("Enquiry saved");loadAll()});
$("export").onclick=()=>{const rows=[["Invoice","Customer","Phone","Subtotal","Discount","GST %","GST Amount","Total","Profit","Date"],...invoices.map(x=>[x.invoice_no,x.customer_name,x.customer_phone,x.subtotal,x.discount,x.gst_percent||0,x.gst_amount||0,x.total,x.profit,x.created_at])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="cleancore-sales.csv";a.click()};

window.viewInvoice=async id=>{
 const inv=invoices.find(x=>x.id===id); if(!inv)return;
 const r=await db.from("invoice_items").select("*").eq("invoice_id",id).order("created_at");
 if(r.error)return toast(r.error.message,false);
 const intra=Number(inv.cgst_amount||0)>0 || Number(inv.sgst_amount||0)>0;
 const tax=intra
  ? "<div>CGST "+Number(inv.cgst_percent||0)+"%: <b>"+money(inv.cgst_amount)+"</b></div><div>SGST "+Number(inv.sgst_percent||0)+"%: <b>"+money(inv.sgst_amount)+"</b></div>"
  : (Number(inv.igst_amount||0)>0 ? "<div>IGST "+Number(inv.igst_percent||0)+"%: <b>"+money(inv.igst_amount)+"</b></div>" : "");
 $("invoicePreview").innerHTML="<div class='invoice-preview'>"+
 "<h2>CleanCore Chemical & Cleaning</h2><p>Hyderabad • +91 91827 25773</p>"+
 "<p><b>Invoice:</b> "+esc(inv.invoice_no)+"<br><b>Date:</b> "+new Date(inv.created_at).toLocaleString("en-IN")+"</p><hr>"+
 "<p><b>Customer:</b> "+esc(inv.customer_name)+"<br><b>Business:</b> "+esc(inv.customer_business||"—")+"<br><b>Phone:</b> "+esc(inv.customer_phone||"—")+"<br><b>GSTIN:</b> "+esc(inv.gstin||"—")+"<br><b>Billing:</b> "+esc(inv.billing_address||"—")+"<br><b>Delivery:</b> "+esc(inv.delivery_address||"—")+"</p>"+
 "<table class='invoice-items'><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>"+
 (r.data||[]).map(it=>"<tr><td>"+esc(it.product_name)+"</td><td>"+it.qty+"</td><td>"+money(it.unit_price)+"</td><td>"+money(it.line_total)+"</td></tr>").join("")+
 "</tbody></table><div class='invoice-totals'>Subtotal: <b>"+money(inv.subtotal)+"</b><br>Discount: <b>"+money(inv.discount)+"</b><br>"+tax+"<br><strong>Total: "+money(inv.total)+"</strong></div></div>";
 $("invoiceDialog").showModal();
};
$("closeInvoice").onclick=()=>$("invoiceDialog").close();
$("printInvoice").onclick=()=>{
 const w=window.open("","_blank","width=900,height=900");
 if(!w)return toast("Allow pop-ups to print the bill.",false);
 w.document.write("<html><head><title>CleanCore Invoice</title><style>body{font-family:Arial;padding:30px}.invoice-items{width:100%;border-collapse:collapse}.invoice-items th,.invoice-items td{border:1px solid #ccc;padding:8px}.invoice-totals{text-align:right;margin-top:20px}</style></head><body>"+$("invoicePreview").innerHTML+"</body></html>");
 w.document.close(); w.focus(); w.print();
};
$("profileBtn").onclick=()=>{ $("profileEmail").textContent=user?.email||""; $("profileMenu").classList.toggle("hidden"); };
$("profileChangePassword").onclick=()=>{ $("profileMenu").classList.add("hidden"); $("passwordBox").classList.remove("hidden"); go("settings"); };
$("profileLogout").onclick=async()=>{await db.auth.signOut();location.reload()};
$("changePassword").onclick=()=>$("passwordBox").classList.toggle("hidden");
$("sendReauth").onclick=async()=>{const {error}=await db.auth.reauthenticate();if(error)return toast(error.message,false);toast("Reauthentication OTP sent to your email.")};
$("updatePw").onclick=async()=>{const current_password=$("currentPw").value,password=$("newPw").value,nonce=$("reauthCode")?.value.trim();if(password.length<12)return toast("Use at least 12 characters",false);if(!nonce)return toast("Enter the reauthentication OTP",false);const {error}=await db.auth.updateUser({password,current_password,nonce});if(error)return toast(error.message,false);toast("Password updated");$("passwordBox").classList.add("hidden")};

// Clean session policy: a browser reload/new page starts logged out.
// While the tab is open, inactivity for 30 minutes also signs out.
const INACTIVITY_MS=30*60*1000;
let inactivityTimer;
async function forceLogout(){try{await db.auth.signOut({scope:"local"})}finally{sessionStorage.removeItem("cleancore_session");location.reload()}}
function armInactivity(){
  clearTimeout(inactivityTimer);
  inactivityTimer=setTimeout(forceLogout,INACTIVITY_MS);
}
["click","keydown","pointerdown","mousemove","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{if(user)armInactivity()},{passive:true}));
window.addEventListener("pagehide",()=>{try{db.auth.signOut({scope:"local"})}catch(e){}});
document.addEventListener("visibilitychange",()=>{if(user){if(document.visibilityState==="hidden"){try{db.auth.signOut({scope:"local"})}catch(e){}}else{forceLogout()}}});
sessionStorage.removeItem("cleancore_session");
user=null;

