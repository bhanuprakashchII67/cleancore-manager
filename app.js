const SUPABASE_URL="https://rwfamxkfqslorxcryjrp.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_tzfe2xVn6OAwF-Mh5_u_zQ_a_bAW7tO"; const BUSINESS_EMAIL="cleancorehyd@gmail.com";
const {createClient}=supabase; const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const bootSignout=db.auth.signOut({scope:"local"}).catch(()=>null);
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n||0));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const phoneRE=/^[6-9]\d{9}$/;
const gstRE=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ADMIN_EMAIL="bhanuprakashchadalawada10@gmail.com";
const STAFF_AUTH_DOMAIN="@staff.cleancore.local";
const ALL_MODULES=["dashboard","products","billing","sales","customers","enquiries","website_orders","expenses"];
const MODULE_LABELS={dashboard:"Dashboard",products:"Products & Stock",billing:"Billing",sales:"Sales",customers:"Customers",enquiries:"Leads / Enquiries",website_orders:"Website Orders",expenses:"Expenses"};
const SECTION_MODULE={dashboard:"dashboard",products:"products",billing:"billing",sales:"sales",customers:"customers",enquiries:"enquiries",expenses:"expenses",settings:"settings"};
let user=null,isAdmin=false,employee=null,employeePermissions=new Set(),employeePermissionRows=[],products=[],invoices=[],customers=[],enquiries=[],rawMaterials=[],expenses=[],payments=[],websiteOrders=[],employees=[],changeRequests=[],accessRequests=[],managerNotifications=[];
let editingProductId=null, editingCustomerId=null, editingRawId=null, editingExpenseId=null; let billTotal=0;

function toast(m,ok=true){const t=$("toast");t.textContent=m;t.className="toast show "+(ok?"ok":"bad");setTimeout(()=>t.className="toast",3200)}
function table(h,rows){if(!rows.length)return '<div class="empty">No records yet.</div>';return `<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
function normalizePhone(v){return String(v||"").replace(/\D/g,"").replace(/^91/,"")}
function validPhone(v){return phoneRE.test(normalizePhone(v))}
function validGstin(v){return !v || gstRE.test(String(v).trim().toUpperCase())}
function isoDate(d){return new Date(d).toLocaleDateString("en-IN")}
function dateKey(d=new Date()){const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function mediaUrls(p,key){const v=p?.[key];return Array.isArray(v)?v:[]}

function syntheticStaffEmail(username){return String(username||"").trim().toLowerCase()+STAFF_AUTH_DOMAIN}
function canAccess(module){return isAdmin||employeePermissions.has(module)}
async function loadAccess(){
  isAdmin=false;employee=null;employeePermissions=new Set();
  const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role==="admin"){isAdmin=true;employeePermissions=new Set(ALL_MODULES);return;}
  const {data:emp,error}=await db.from("employees").select("*").eq("auth_user_id",user.id).maybeSingle();
  if(error||!emp)throw new Error("Employee account not found.");
  const now=Date.now(),start=emp.starts_at?new Date(emp.starts_at).getTime():-Infinity,end=emp.ends_at?new Date(emp.ends_at).getTime():Infinity;
  if(!emp.active||now<start||now>end)throw new Error("Your employee access is inactive or outside the allowed date/time.");
  const {data:perms,error:perr}=await db.from("employee_permissions").select("module").eq("employee_id",emp.id).eq("enabled",true);
  if(perr)throw new Error(perr.message);
  employee=emp;employeePermissions=new Set((perms||[]).map(x=>x.module));
}
function applyAccess(){
  document.querySelectorAll(".nav[data-section]").forEach(b=>{
    const module=SECTION_MODULE[b.dataset.section];
    b.classList.toggle("hidden",!isAdmin && module!=="settings" && !canAccess(module));
    if(b.dataset.section==="settings")b.classList.toggle("hidden",!isAdmin);
  });
}
async function logUnauthorized(module,action,reason=""){
  if(isAdmin)return;
  try{await db.rpc("log_employee_access_attempt",{p_module:module,p_action:action,p_reason:reason})}catch(e){}
}
async function submitChange(module,action,targetTable,targetId,payload,reason=""){
  if(isAdmin)return false;
  if(!canAccess(module)){await logUnauthorized(module,"CHANGE_REQUEST",reason||"Change attempted without permission");toast("Access denied. This action has been logged.",false);return false;}
  const {data,error}=await db.rpc("submit_change_request",{p_module:module,p_action:action,p_target_table:targetTable,p_target_id:targetId||null,p_payload:payload||{},p_reason:reason||""});
  if(error){toast(error.message,false);return false;}
  toast("Change submitted to Manager for approval. Request "+String(data||"").slice(0,8));
  return true;
}
async function enter(){
 try{
   await loadAccess();
   $("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
   $("profileEmail").textContent=isAdmin?user.email:(employee.full_name+" • "+employee.username);
   applyAccess();
   await loadAll();
   const first=isAdmin?"dashboard":ALL_MODULES.find(x=>employeePermissions.has(x))||"dashboard";
   await go(first);
 }catch(e){await db.auth.signOut({scope:"local"});location.reload();}
}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const identifier=$("loginIdentifier").value.trim(),password=$("loginPassword").value;
 if(!identifier||!password)return toast("Enter username and password.",false);
 try{
   await bootSignout;
   const email=identifier.includes("@")?identifier.toLowerCase():syntheticStaffEmail(identifier);
   const {data,error}=await db.auth.signInWithPassword({email,password});
   if(error)return toast("Login failed: "+error.message,false);
   if(!data?.session)return toast("Login failed: No session returned.",false);
   user=data.user;await enter();
 }catch(err){console.error("CleanCore login error",err);return toast("Supabase connection failed. Please refresh and try again.",false)}
});
$("logout").onclick=async()=>{await db.auth.signOut({scope:"local"});location.reload()};
document.querySelectorAll(".nav[data-section]").forEach(b=>b.onclick=()=>go(b.dataset.section));
document.querySelectorAll(".goto").forEach(b=>b.onclick=()=>go(b.dataset.goto));
async function go(id){
 const module=SECTION_MODULE[id];
 const allowed=id==="enquiries" ? (isAdmin||canAccess("enquiries")||canAccess("website_orders")) : (isAdmin||!!module&&canAccess(module));
 if(!allowed){await logUnauthorized(module||id,"NAVIGATION","Attempted to open restricted Manager section");toast("Access denied. The Manager has been notified.",false);return;}
 document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));
 document.querySelectorAll(".nav[data-section]").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
 $("title").textContent=document.querySelector('.nav[data-section="'+id+'"]')?.textContent||id;
}
async function loadAll(){
 const qP=(isAdmin||canAccess("products")||canAccess("billing"))?db.from("products").select("*").order("name"):null;
 const qI=(isAdmin||canAccess("billing")||canAccess("sales"))?db.from("invoices").select("*").order("created_at",{ascending:false}):null;
 const qC=(isAdmin||canAccess("customers")||canAccess("billing"))?db.from("customers").select("*").order("name"):null;
 const qE=(isAdmin||canAccess("enquiries"))?db.from("enquiries").select("*").order("created_at",{ascending:false}):null;
 const qR=(isAdmin||canAccess("products"))?db.from("raw_materials").select("*").order("name"):null;
 const qX=(isAdmin||canAccess("expenses"))?db.from("expenses").select("*").order("expense_date",{ascending:false}).order("created_at",{ascending:false}):null;
 const qPM=(isAdmin||canAccess("billing")||canAccess("sales")||canAccess("customers"))?db.from("payments").select("*").order("payment_date",{ascending:false}).order("created_at",{ascending:false}):null;
 const qWO=(isAdmin||canAccess("website_orders"))?db.from("website_orders").select("*").order("created_at",{ascending:false}):null;
 const qs=await Promise.all([qP,qI,qC,qE,qR,qX,qPM,qWO]);
 const [p,i,cu,e,r,x,pm,wo]=qs;
 for(const q of qs)if(q?.error)return toast(q.error.message,false);
 products=p?.data||[];invoices=i?.data||[];customers=cu?.data||[];enquiries=e?.data||[];rawMaterials=r?.data||[];expenses=x?.data||[];payments=pm?.data||[];websiteOrders=wo?.data||[];
 if(isAdmin){
   const [er,ep,cr,ar,nr]=await Promise.all([
     db.from("employees").select("*").order("created_at",{ascending:false}),
     db.from("employee_permissions").select("*"),
     db.from("change_requests").select("*").order("requested_at",{ascending:false}),
     db.from("access_requests").select("*").order("created_at",{ascending:false}),
     db.from("manager_notifications").select("*").order("created_at",{ascending:false})
   ]);
   for(const q of [er,ep,cr,ar,nr])if(q?.error)return toast(q.error.message,false);
   employees=er.data||[];employeePermissionRows=ep.data||[];changeRequests=cr.data||[];accessRequests=ar.data||[];managerNotifications=nr.data||[];
 }
 renderAll();
}

function formatAccessDate(v){return v?new Date(v).toLocaleString("en-IN"):"—"}
function employeePermissionsFor(id){
 return employeePermissionRows.filter(x=>x.employee_id===id&&x.enabled).map(x=>MODULE_LABELS[x.module]||x.module);
}
function employeeById(id){return employees.find(x=>x.id===id)}
function renderEmployeeData(){
 if(!isAdmin)return;
 if($("employeesTable")){
   $("employeesTable").innerHTML=table(["Employee","Username","Team","Access","Start","End","Permissions","Action"],employees.map(e=>{
     const expired=e.ends_at&&new Date(e.ends_at)<new Date();
     const state=e.active&&!expired?"Active":"Disabled / expired";
     const perms=employeePermissionsFor(e.id).join(", ")||"None";
     return [esc(e.full_name),esc(e.username),esc(e.team),state,formatAccessDate(e.starts_at),formatAccessDate(e.ends_at),esc(perms),
       "<button class='link' onclick=\"toggleEmployeeActive('"+e.id+"',"+(!e.active)+")\">"+(e.active?"Disable":"Enable")+"</button> <button class='link' onclick=\"resetEmployeePassword('"+e.id+"')\">Reset password</button>"];
   }));
 }
 const pending=changeRequests.filter(x=>x.status==="Pending");
 if($("approvalCount"))$("approvalCount").textContent=String(pending.length);
 if($("accessAlertCount"))$("accessAlertCount").textContent=String(accessRequests.length);
 if($("approvalSummary"))$("approvalSummary").textContent=pending.length+" request"+(pending.length===1?"":"s")+" waiting for Manager approval.";
 if($("changeRequestsTable")){
   $("changeRequestsTable").innerHTML=table(["Employee","Module","Action","Target","Requested","Status","Review"],changeRequests.map(r=>{
     const e=employeeById(r.employee_id);
     const action=esc(r.action);
     const status=esc(r.status);
     const buttons=r.status==="Pending"
       ? "<button class='link' onclick=\"reviewChange('"+r.id+"',true)\">Approve</button> <button class='link danger' onclick=\"reviewChange('"+r.id+"',false)\">Reject</button>"
       : "Reviewed";
     return [esc(e?.username||"—"),esc(MODULE_LABELS[r.module]||r.module),action,esc(r.target_table||"—"),formatAccessDate(r.requested_at),status,buttons];
   }));
 }
 if($("accessRequestsTable")){
   $("accessRequestsTable").innerHTML=table(["Employee","Module","Action","Reason","Date"],accessRequests.slice(0,100).map(r=>{
     const e=employeeById(r.employee_id);
     return [esc(e?.username||"—"),esc(MODULE_LABELS[r.module]||r.module),esc(r.action),esc(r.reason||"—"),formatAccessDate(r.created_at)];
   }));
 }
 if($("notificationTable")){
   $("notificationTable").innerHTML=table(["Type","Subject","Email","Status","Date"],managerNotifications.slice(0,100).map(n=>[esc(n.notification_type),esc(n.subject),esc(n.email_to),esc(n.email_status),formatAccessDate(n.created_at)]));
 }
}
window.toggleEmployeeActive=async function(id,active){
 if(!isAdmin)return;
 const {error}=await db.from("employees").update({active,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)return toast(error.message,false);
 await loadAll();toast(active?"Employee enabled":"Employee disabled");
};
window.resetEmployeePassword=async function(id){
 if(!isAdmin)return;
 const e=employeeById(id);if(!e)return;
 const password=prompt("New password for "+e.username+" (minimum 8 characters):","");
 if(password===null)return;
 if(password.length<8)return toast("Password must be at least 8 characters.",false);
 const {data,error}=await db.functions.invoke("employee-admin",{body:{action:"reset_password",employee_id:id,password}});
 if(error)return toast(error.message||"Password reset failed.",false);
 if(data?.error)return toast(data.error,false);
 toast("Password reset for "+e.username);
};
window.reviewChange=async function(id,approve){
 if(!isAdmin)return;
 const note=approve?"":(prompt("Reason for rejection (optional):","")||"");
 const {data,error}=await db.rpc("review_change_request",{p_request_id:id,p_approve:approve,p_note:note});
 if(error)return toast(error.message,false);
 toast(approve?"Change approved and applied.":"Change request rejected.");
 await loadAll();
};
function defaultEmployeeModules(team){
 if(team==="account")return ["products","billing","expenses"];
 if(team==="crm")return ["customers","enquiries","website_orders"];
 return ["dashboard"];
}
function employeeModuleChecks(selected){
 return ALL_MODULES.map(m=>"<label class='permission-check'><input type='checkbox' name='employeeModule' value='"+m+"' "+(selected.has(m)?"checked":"")+"><span>"+esc(MODULE_LABELS[m])+"</span></label>").join("");
}
function renderEmployeeModuleChecks(team){
 const wrap=$("employeePermissions");
 if(!wrap)return;
 const selected=new Set(defaultEmployeeModules(team||$("employeeTeam")?.value||"custom"));
 wrap.innerHTML=employeeModuleChecks(selected);
}
function collectEmployeeModules(){
 return [...document.querySelectorAll('input[name="employeeModule"]:checked')].map(x=>x.value);
}
function resetEmployeeForm(){
 $("employeeUsername").value="";$("employeeFullName").value="";$("employeeAlertEmail").value="";
 $("employeeTeam").value="account";$("employeePassword").value="";
 $("employeeStarts").value="";$("employeeEnds").value="";
 renderEmployeeModuleChecks("account");$("employeeStatus").textContent="";
}
$("addEmployee").onclick=()=>{resetEmployeeForm();$("employeeDialog").showModal()};
$("employeeTeam").onchange=()=>renderEmployeeModuleChecks($("employeeTeam").value);
$("employeeForm").addEventListener("submit",createEmployee);

async function createEmployee(e){
 e.preventDefault();
 const status=$("employeeStatus");
 const username=$("employeeUsername").value.trim().toLowerCase();
 const full_name=$("employeeFullName").value.trim();
 const alert_email=$("employeeAlertEmail").value.trim();
 const password=$("employeePassword").value;
 const team=$("employeeTeam").value;
 const starts_at=$("employeeStarts").value?new Date($("employeeStarts").value).toISOString():null;
 const ends_at=$("employeeEnds").value?new Date($("employeeEnds").value).toISOString():null;
 const modules=collectEmployeeModules();
 if(!/^[a-z0-9._-]{3,40}$/.test(username))return status.textContent="Username must be 3-40 characters using letters, numbers, dot, underscore or hyphen.";
 if(password.length<8)return status.textContent="Password must be at least 8 characters.";
 if(starts_at&&ends_at&&new Date(starts_at)>=new Date(ends_at))return status.textContent="End date/time must be after start date/time.";
 if(!modules.length)return status.textContent="Select at least one Manager section.";
 const {data,error}=await db.functions.invoke("employee-admin",{body:{action:"create",username,full_name,team,alert_email,password,starts_at,ends_at,modules}});
 if(error)return status.textContent=error.message||"Could not create employee.";
 if(data?.error)return status.textContent=data.error;
 $("employeeDialog").close();toast("Employee "+username+" created.");await loadAll();
}
function renderAll(){
 const now=new Date(),day=new Date(now.getFullYear(),now.getMonth(),now.getDate()),mon=new Date(now.getFullYear(),now.getMonth(),1);
 const todayKey=dateKey(now),monthKey=todayKey.slice(0,7);
 const td=invoices.filter(x=>new Date(x.created_at)>=day),mo=invoices.filter(x=>new Date(x.created_at)>=mon);
 const grossMonth=mo.reduce((a,x)=>a+Number(x.profit||0),0);
 const monthExpenses=expenses.filter(x=>String(x.expense_date||"").startsWith(monthKey)).reduce((a,x)=>a+Number(x.amount||0),0);
 $("today").textContent=money(td.reduce((a,x)=>a+Number(x.total),0));
 $("month").textContent=money(mo.reduce((a,x)=>a+Number(x.total),0));
 $("grossProfit").textContent=money(grossMonth);
 $("monthlyExpenses").textContent=money(monthExpenses);
 $("netProfit").textContent=money(grossMonth-monthExpenses);
 $("low").textContent=products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length+rawMaterials.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length;
 if($("websiteOrdersNew"))$("websiteOrdersNew").textContent=websiteOrders.filter(o=>o.status==="New").length;
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
 renderExpenses();
 renderCustomers();
 renderWebsiteOrders();
 $("enquiriesTable").innerHTML=table(["Name","Phone","Business","Email","Product","Qty","Source","Message","Status","Date"],enquiries.map(x=>[esc(x.name),esc(x.phone),esc(x.business),esc(x.email),esc(x.product_name||"—"),esc(x.quantity??"—"),esc(x.source||"manager"),esc(x.message),esc(x.status),isoDate(x.created_at)]));
 if($("websiteOrdersPanel"))$("websiteOrdersPanel").style.display=(isAdmin||canAccess("website_orders"))?"":"none";
 if($("enquiriesPanel"))$("enquiriesPanel").style.display=(isAdmin||canAccess("enquiries"))?"":"none";
 if($("addEnquiry"))$("addEnquiry").disabled=(!isAdmin&&!canAccess("enquiries"));
 rebuildLines();
}
function expenseList(){
 const from=$("expenseFrom")?.value||"",to=$("expenseTo")?.value||"";
 return expenses.filter(x=>(!from||String(x.expense_date)>=from)&&(!to||String(x.expense_date)<=to));
}
function renderExpenses(){
 const list=expenseList();
 const gross=invoices.filter(inv=>{
   const d=new Date(inv.created_at);
   const from=$("expenseFrom")?.value||"",to=$("expenseTo")?.value||"";
   return (!from||d>=new Date(from+"T00:00:00"))&&(!to||d<=new Date(to+"T23:59:59"));
 }).reduce((a,x)=>a+Number(x.profit||0),0);
 const totalExp=list.reduce((a,x)=>a+Number(x.amount||0),0);
 $("expenseSummary").textContent=list.length+" expense"+(list.length===1?"":"s")+" • "+money(totalExp);
 $("expenseToday").textContent=money(expenses.filter(x=>String(x.expense_date)===dateKey()).reduce((a,x)=>a+Number(x.amount||0),0));
 $("expensePeriod").textContent=money(totalExp);
 $("expenseGross").textContent=money(gross);
 $("expenseNet").textContent=money(gross-totalExp);
 $("expensesTable").innerHTML=table(["Date","Category","Vendor / Payee","Payment","Amount","Notes","Action"],list.map(x=>[
  esc(x.expense_date),esc(x.category),esc(x.vendor||"—"),esc(x.payment_method),money(x.amount),esc(x.notes||""),
  "<button class='link' onclick=\"editExpense('"+x.id+"')\">Edit</button> <button class='link danger' onclick=\"deleteExpense('"+x.id+"')\">Delete</button>"
 ]));
}
function refreshExpenseRawMaterials(){const el=$("expenseRawMaterial");el.innerHTML="<option value=\"\">Select raw material (optional)</option>"+rawMaterials.map(r=>"<option value=\""+r.id+"\">"+esc(r.name)+" ("+esc(r.unit)+")</option>").join("")}
function resetExpenseForm(){
 editingExpenseId=null;
 refreshExpenseRawMaterials();
 $("expenseDate").value=dateKey();
 $("expenseCategory").value="Other";
 $("expenseAmount").value="";
 $("expenseVendor").value="";
 $("expensePayment").value="Cash";
 $("expenseNotes").value="";
 $("expenseRawMaterial").value="";
 $("expenseQty").value="";
 $("expenseRawWrap").classList.add("hidden");
 $("expenseQtyWrap").classList.add("hidden");
 $("expenseDialogTitle").textContent="Add Business Expense";
}
function toggleExpenseRawFields(){
 const show=$("expenseCategory").value==="Raw Materials";
 $("expenseRawWrap").classList.toggle("hidden",!show);
 $("expenseQtyWrap").classList.toggle("hidden",!show);
 if(!show){$("expenseRawMaterial").value="";$("expenseQty").value=""}
}
$("addExpense").onclick=()=>{resetExpenseForm();$("expenseDialog").showModal()};
$("expenseCategory").onchange=toggleExpenseRawFields;
window.editExpense=id=>{
 const x=expenses.find(e=>e.id===id);if(!x)return;
 editingExpenseId=id;
 refreshExpenseRawMaterials();
 $("expenseDate").value=x.expense_date||dateKey();
 $("expenseCategory").value=x.category||"Other";
 $("expenseAmount").value=x.amount??"";
 $("expenseVendor").value=x.vendor||"";
 $("expensePayment").value=x.payment_method||"Cash";
 $("expenseNotes").value=x.notes||"";
 $("expenseRawMaterial").value=x.raw_material_id||"";
 $("expenseQty").value=x.quantity??"";
 $("expenseDialogTitle").textContent="Edit Business Expense";
 toggleExpenseRawFields();
 $("expenseDialog").showModal();
};
window.deleteExpense=async id=>{
 if(!confirm("Delete this expense?"))return;
 if(!isAdmin){const ok=await submitChange("expenses","expense_delete","expenses",id,{},"Employee expense deletion");if(ok)await loadAll();return;}
 const {error}=await db.from("expenses").delete().eq("id",id);
 if(error)return toast(error.message,false);
 toast("Expense deleted");
 await loadAll();
};
$("expenseForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const date=$("expenseDate").value,category=$("expenseCategory").value,amount=+$("expenseAmount").value;
 if(!date)return toast("Select expense date",false);
 if(!(amount>0))return toast("Enter an expense amount greater than 0",false);
 const qty=category==="Raw Materials"?(+$("expenseQty").value||0):null;
 if(category==="Raw Materials" && qty<0)return toast("Quantity cannot be negative",false);
 const x={
   expense_date:date,category,amount,
   vendor:$("expenseVendor").value.trim(),
   payment_method:$("expensePayment").value,
   notes:$("expenseNotes").value.trim(),
   raw_material_id:category==="Raw Materials"&&$("expenseRawMaterial").value?$("expenseRawMaterial").value:null,
   quantity:qty,
   unit_cost:category==="Raw Materials"&&qty>0?amount/qty:null
 };
 if(!isAdmin){const ok=await submitChange("expenses",editingExpenseId?"expense_update":"expense_create","expenses",editingExpenseId,x,"Employee expense change");if(ok)$("expenseDialog").close();return;}
 const q=editingExpenseId?db.from("expenses").update(x).eq("id",editingExpenseId):db.from("expenses").insert(x);
 const {error}=await q;if(error)return toast(error.message,false);
 $("expenseDialog").close();toast("Expense saved");await loadAll();
});
$("expenseFrom").onchange=renderExpenses;$("expenseTo").onchange=renderExpenses;
$("clearExpenseFilter").onclick=()=>{$("expenseFrom").value="";$("expenseTo").value="";renderExpenses()};
$("exportExpenses").onclick=()=>{
 const list=expenseList();
 const rows=[["Date","Category","Vendor / Payee","Payment Method","Amount","Notes"],...list.map(x=>[x.expense_date,x.category,x.vendor,x.payment_method,x.amount,x.notes])];
 const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="cleancore-expenses.csv";a.click();
};
function renderSales(){
 const from=$("salesFrom")?.value,to=$("salesTo")?.value;
 let list=invoices.slice();
 if(from){const d=new Date(from+"T00:00:00");list=list.filter(x=>new Date(x.created_at)>=d)}
 if(to){const d=new Date(to+"T23:59:59");list=list.filter(x=>new Date(x.created_at)<=d)}
 $("salesSummary").textContent=list.length+" bill"+(list.length===1?"":"s")+" • "+money(list.reduce((a,x)=>a+Number(x.total),0))+" sales";
 $("salesTable").innerHTML=table(["Invoice","Customer","Subtotal","Discount","GST","Total","Profit","Paid","Credit","Status","Date","Action"],list.map(x=>[
  esc(x.invoice_no),esc(x.customer_name),money(x.subtotal),money(x.discount),String(Number(x.gst_percent||0))+"%",money(x.total),money(x.profit),money(x.paid_amount),money(x.due_amount),esc(x.payment_status||"Credit"),new Date(x.created_at).toLocaleString("en-IN"),
  '<button class="link" onclick="viewInvoice(\\\''+x.id+'\\\')">View Bill</button>'
 ]));
}
function customerStats(id){
 const bills=invoices.filter(x=>x.customer_id===id);
 const totalPurchases=bills.reduce((a,x)=>a+Number(x.total||0),0);
 const totalPaid=bills.reduce((a,x)=>a+Number(x.paid_amount||0),0);
 const creditDue=bills.reduce((a,x)=>a+Number(x.due_amount||0),0);
 const lastPurchase=bills.length?bills.reduce((a,x)=>new Date(x.created_at)>new Date(a)?x.created_at:a,bills[0].created_at):null;
 return {bills,totalPurchases,totalPaid,creditDue,lastPurchase};
}

function renderWebsiteOrders(){
 const list=websiteOrders.slice();
 $("websiteOrdersSummary").textContent=list.filter(x=>x.status==="New").length+" new order"+(list.filter(x=>x.status==="New").length===1?"":"s")+" • "+list.length+" total website orders";
 $("websiteOrdersTable").innerHTML=table(["Order","Customer","Business","Phone","Total","Status","Date","Action"],list.map(o=>{
   const cust=customers.find(c=>c.id===o.customer_id);
   const statuses=["New","Confirmed","Processing","Out for Delivery","Delivered","Cancelled"];
   const opts=statuses.map(s=>"<option value=\""+s+"\""+(s===o.status?" selected":"")+">"+s+"</option>").join("");
   return [
     esc(o.order_no),
     esc(cust?.name||"—"),
     esc(cust?.business_name||"—"),
     esc(cust?.phone||"—"),
     money(o.total),
     "<select class=\"order-status\" aria-label=\"Order status\" onchange=\"updateWebsiteOrderStatus('"+o.id+"',this.value)\">"+opts+"</select>",
     new Date(o.created_at).toLocaleString("en-IN"),
     "<button class=\"link\" onclick=\"viewWebsiteOrder('"+o.id+"')\">View</button>"
   ];
 }));
}
window.updateWebsiteOrderStatus=async function(id,status){
 const allowed=["New","Confirmed","Processing","Out for Delivery","Delivered","Cancelled"];
 if(!allowed.includes(status))return;
 if(!isAdmin){const ok=await submitChange("website_orders","website_order_status","website_orders",id,{status},"Employee website-order status change");if(ok){const o=websiteOrders.find(x=>x.id===id);if(o)o.status=status;renderWebsiteOrders();}return;}
 const {error}=await db.from("website_orders").update({status,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)return toast(error.message,false);
 const o=websiteOrders.find(x=>x.id===id);if(o)o.status=status;
 renderWebsiteOrders();
 $("websiteOrdersNew").textContent=websiteOrders.filter(x=>x.status==="New").length;
 toast("Website order status updated");
};
window.viewWebsiteOrder=async function(id){
 const o=websiteOrders.find(x=>x.id===id);if(!o)return;
 const cust=customers.find(c=>c.id===o.customer_id);
 const {data,error}=await db.from("website_order_items").select("*").eq("order_id",id).order("created_at");
 if(error)return toast(error.message,false);
 $("websiteOrderTitle").textContent=o.order_no+" — "+(cust?.business_name||cust?.name||"Customer");
 $("websiteOrderSummary").innerHTML="<div class=\"history-cards\"><div><span>Customer</span><b>"+esc(cust?.name||"—")+"</b></div><div><span>Phone</span><b>"+esc(cust?.phone||"—")+"</b></div><div><span>Status</span><b>"+esc(o.status)+"</b></div><div><span>Total</span><b>"+money(o.total)+"</b></div></div>";
 $("websiteOrderCustomer").innerHTML="<p><b>Business:</b> "+esc(cust?.business_name||"—")+"<br><b>Email:</b> "+esc(cust?.email||"—")+"<br><b>Delivery address:</b> "+esc(cust?.delivery_address||"—")+"</p>";
 $("websiteOrderItems").innerHTML=table(["Product","Unit","Qty","Rate","Line total"],(data||[]).map(it=>[esc(it.product_name),esc(it.unit),it.qty,money(it.unit_price),money(it.line_total)]));
 $("websiteOrderNotes").textContent=o.notes||"No order note.";
 $("websiteOrderDialog").showModal();
};
$("closeWebsiteOrder").onclick=function(){$("websiteOrderDialog").close()};
function renderCustomers(){
 $("customersTable").innerHTML=table(["Customer","Business","Phone","Website account","Total purchases","Paid","Credit due","Last purchase","Action"],customers.map(x=>{
  const account=x.auth_user_id?"<span class='badge ok'>Website</span>":"—";
  const s=customerStats(x.id);
  return [esc(x.name),esc(x.business_name),esc(x.phone),account,money(s.totalPurchases),money(s.totalPaid),money(s.creditDue),s.lastPurchase?isoDate(s.lastPurchase):"—",
   "<button class=\"link\" onclick=\"viewCustomerHistory(\'"+x.id+"\')\">Purchase history</button> <button class=\"link\" onclick=\"editCustomer(\'"+x.id+"\')\">Edit</button>"];
 }));
 $("billingCustomer").innerHTML="<option value=\"\">New / enter customer</option>"+customers.map(x=>"<option value=\""+x.id+"\">"+esc(x.name)+(x.business_name?" — "+esc(x.business_name):"")+" ("+esc(x.phone)+")</option>").join("");
}
window.viewCustomerHistory=function(id){
 const c=customers.find(x=>x.id===id);if(!c)return;
 const s=customerStats(id);
 $("customerHistoryTitle").textContent=(c.business_name||c.name)+" — Purchase History";
 $("customerHistorySummary").innerHTML="<div class=\"history-cards\"><div><span>Total purchases</span><b>"+money(s.totalPurchases)+"</b></div><div><span>Total paid</span><b>"+money(s.totalPaid)+"</b></div><div><span>Credit due</span><b>"+money(s.creditDue)+"</b></div><div><span>Last purchase</span><b>"+(s.lastPurchase?isoDate(s.lastPurchase):"—")+"</b></div></div>";
 $("customerHistoryTable").innerHTML=table(["Invoice","Purchase date","Total","Paid","Credit due","Payment status","Due date","Action"],s.bills.map(inv=>[
   esc(inv.invoice_no),new Date(inv.created_at).toLocaleString("en-IN"),money(inv.total),money(inv.paid_amount),money(inv.due_amount),esc(inv.payment_status||"Credit"),inv.due_date?isoDate(inv.due_date):"—",
   Number(inv.due_amount||0)>0?"<button class=\"link\" onclick=\"recordPayment(\'"+inv.id+"\')\">Record payment</button>":"Paid"
 ]));
 $("customerHistoryDialog").showModal();
};
$("closeCustomerHistory").onclick=function(){$("customerHistoryDialog").close()};
window.recordPayment=function(invoiceId){
 const inv=invoices.find(x=>x.id===invoiceId);if(!inv||Number(inv.due_amount||0)<=0)return;
 $("paymentInvoiceId").value=invoiceId;$("paymentInvoiceNo").textContent=inv.invoice_no;$("paymentCustomerName").textContent=inv.customer_name;$("paymentOutstanding").textContent=money(inv.due_amount);
 $("paymentDate").value=dateKey();$("paymentAmount").value=Number(inv.due_amount).toFixed(2);$("paymentMethod").value="Cash";$("paymentNotes").value="";$("paymentDialog").showModal();
};
$("closePayment").onclick=function(){$("paymentDialog").close()};
$("paymentForm").addEventListener("submit",async function(e){
 e.preventDefault();
 const invoiceId=$("paymentInvoiceId").value,inv=invoices.find(x=>x.id===invoiceId);
 if(!inv)return toast("Invoice not found",false);
 const amount=+$("paymentAmount").value;
 if(!(amount>0&&amount<=Number(inv.due_amount||0)))return toast("Payment must be greater than 0 and not exceed the outstanding credit.",false);
 const payment_date=$("paymentDate").value||dateKey();
 if(!isAdmin){
   const ok=await submitChange("billing","payment_create","invoices",inv.id,{customer_id:inv.customer_id,amount,payment_date,payment_method:$("paymentMethod").value,notes:$("paymentNotes").value.trim()},"Employee payment record");
   if(ok)$("paymentDialog").close();
   return;
 }
 const ins=await db.from("payments").insert({invoice_id:inv.id,customer_id:inv.customer_id,amount,payment_date,payment_method:$("paymentMethod").value,notes:$("paymentNotes").value.trim()});
 if(ins.error)return toast(ins.error.message,false);
 const paid=Number(inv.paid_amount||0)+amount,due=Math.max(Number(inv.total||0)-paid,0);
 const status=due===0?"Paid":"Part Paid";
 const upd=await db.from("invoices").update({paid_amount:paid,due_amount:due,payment_status:status,due_date:due>0?inv.due_date:null,payment_method:$("paymentMethod").value}).eq("id",inv.id);
 if(upd.error)return toast(upd.error.message,false);
 $("paymentDialog").close();toast("Payment recorded");await loadAll();
});
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
 const next=mediaUrls(p,key).filter(x=>x!==u);
 if(!isAdmin){await submitChange("products","product_media_update","products",id,{[key]:next},"Employee product media change");return;}
 const {error}=await db.from("products").update({[key]:next}).eq("id",id);if(error)return toast(error.message,false);toast("Media removed");await loadAll();const fresh=products.find(x=>x.id===id);if(fresh)renderProductMedia(fresh);
}
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("pname").value.trim(),price=+$("pprice").value,cost=+$("pcost").value,stock=+$("pstock").value,low=+$("plow").value;
 if(!name)return toast("Enter product name",false);
 const old=editingProductId?products.find(p=>p.id===editingProductId):null;
 let image_urls=mediaUrls(old,"image_urls"),video_urls=mediaUrls(old,"video_urls");
 if(!isAdmin){
   const x={name,unit:$("punit").value.trim(),selling_price:price,cost_price:cost,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
   const ok=await submitChange("products",editingProductId?"product_update":"product_create","products",editingProductId,x,"Employee product change");
   if(ok)$("productDialog").close();
   return;
 }
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
$("rawForm").addEventListener("submit",async e=>{e.preventDefault();const x={name:$("rawName").value.trim(),unit:$("rawUnit").value.trim(),cost_per_unit:+$("rawCost").value,stock:+$("rawStock").value,low_stock_threshold:+$("rawLow").value};if(!x.name)return toast("Enter raw material name",false);if(!isAdmin){const ok=await submitChange("products",editingRawId?"raw_material_update":"raw_material_create","raw_materials",editingRawId,x,"Employee raw-material change");if(ok)$("rawDialog").close();return} const q=editingRawId?db.from("raw_materials").update(x).eq("id",editingRawId):db.from("raw_materials").insert(x);const {error}=await q;if(error)return toast(error.message,false);$("rawDialog").close();toast("Raw material saved");loadAll()});

function addLine(){
 const r=document.createElement("div");r.className="line";
 r.innerHTML=`<select class="lp">${products.map(p=>`<option value="${p.id}">${esc(p.name)} — ₹${p.selling_price} (${p.stock} in stock)</option>`).join("")}</select><input class="lq" type="number" min="1" value="1"><span class="lv">₹0</span><button type="button" class="remove">×</button>`;
 $("lines").appendChild(r);r.querySelectorAll("select,input").forEach(x=>x.oninput=calc);r.querySelector(".remove").onclick=()=>{r.remove();calc()};calc()
}
function rebuildLines(){if(!$("lines").children.length && products.length)addLine()}
$("addLine").onclick=addLine;$("discount").oninput=calc;$("gstPercent").oninput=calc;$("paymentStatus").onchange=updatePaymentFields;
$("billingCustomer").onchange=()=>{
 const c=customers.find(x=>x.id===$("billingCustomer").value);if(!c)return;
 $("custName").value=c.name||"";$("custBusiness").value=c.business_name||"";$("custPhone").value=c.phone||"";$("custEmail").value=c.email||"";$("custGstin").value=c.gstin||"";$("custBilling").value=c.billing_address||"";$("custDelivery").value=c.delivery_address||"";$("gstPercent").value=c.gstin?$("gstPercent").value:"";
 calc();
};
function updatePaymentFields(){
 const status=$("paymentStatus")?.value||"Credit",paid=$("paidAmount"),due=$("dueDate"),method=$("billPaymentMethod"),preview=$("paymentPreview");
 if(!paid)return;
 if(status==="Paid"){paid.value=billTotal.toFixed(2);paid.disabled=true;due.value="";due.disabled=true;method.value="Cash";}
 else if(status==="Credit"){paid.value="0";paid.disabled=true;due.disabled=false;method.value="Credit";}
 else {paid.disabled=false;due.disabled=false;if(method.value==="Credit")method.value="Cash";}
 const p=Number(paid.value||0),d=Math.max(billTotal-p,0);
 preview.textContent=billTotal?"Paid "+money(p)+" • Credit due "+money(d):"Enter items to calculate payment";
}
function calc(){
 let subtotal=0;
 document.querySelectorAll(".line").forEach(r=>{const p=products.find(x=>x.id===r.querySelector(".lp").value),q=+r.querySelector(".lq").value||0,v=(p?.selling_price||0)*q;subtotal+=v;r.querySelector(".lv").textContent=money(v)});
 const discount=Math.max(0,+$("discount").value||0),taxable=Math.max(0,subtotal-discount),gstin=$("custGstin").value.trim().toUpperCase(),gp=gstin?(+$("gstPercent").value||0):0,gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin ? gstin.slice(0,2)==="36" : false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 billTotal=total;$("subtotal").textContent=money(subtotal);$("discountShow").textContent=money(discount);$("gstShow").textContent=`${gp}% • ${money(gst)}`;$("total").textContent=money(total);updatePaymentFields();
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
 const paymentStatus=$("paymentStatus").value,paymentMethod=$("billPaymentMethod").value;
 const enteredPaid=paymentStatus==="Paid"?null:(paymentStatus==="Credit"?0:(+$("paidAmount").value||0));
 const items=[...document.querySelectorAll(".line")].map(r=>{const p=products.find(x=>x.id===r.querySelector(".lp").value);return {p,q:+r.querySelector(".lq").value||0}}).filter(x=>x.p&&x.q>0);
 if(!items.length)return toast("Add an item",false);
 for(const x of items)if(x.q>x.p.stock)return toast(`${x.p.name}: only ${x.p.stock} cans in stock`,false);
 const subtotal=items.reduce((a,x)=>a+x.p.selling_price*x.q,0),discount=Math.min(subtotal,Math.max(0,+$("discount").value||0)),taxable=subtotal-discount,gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin ? gstin.slice(0,2)==="36" : false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 const profit=items.reduce((a,x)=>a+(x.p.selling_price-x.p.cost_price)*x.q,0)-discount;
 const paidAmount=paymentStatus==="Paid"?total:Math.max(0,enteredPaid),dueAmount=Math.max(total-paidAmount,0);
 if(paymentStatus==="Part Paid" && !(paidAmount>0&&paidAmount<total))return toast("For Part Paid, enter an amount between 0 and the bill total.",false);
 const dueDate=dueAmount>0?($("dueDate").value||null):null;
 const no="CC-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+String(Date.now()).slice(-5);
 if(!isAdmin){
   const payload={
     invoice_no:no,
     customer_id:$("billingCustomer").value||null,
     customer_name:name,customer_phone:phone,gstin,customer_business:business,customer_email:email,
     billing_address:billing,delivery_address:delivery,subtotal,discount,gst_percent:gp,gst_amount:gst,
     cgst_percent:cgstPercent,cgst_amount:cgstAmount,sgst_percent:sgstPercent,sgst_amount:sgstAmount,
     igst_percent:igstPercent,igst_amount:igstAmount,total,profit,payment_status:paymentStatus,
     paid_amount:paidAmount,due_amount:dueAmount,due_date:dueDate,payment_method:paymentMethod,
     items:items.map(x=>({product_id:x.p.id,product_name:x.p.name,qty:x.q,unit_price:x.p.selling_price,cost_price:x.p.cost_price,line_total:x.p.selling_price*x.q,line_profit:(x.p.selling_price-x.p.cost_price)*x.q}))
   };
   const ok=await submitChange("billing","invoice_create","invoices",null,payload,"Employee bill submitted for manager approval");
   if(ok){$("billForm").reset();$("lines").innerHTML="";rebuildLines();}
   return;
 }
 let c=customers.find(x=>x.id===$("billingCustomer").value)||customers.find(x=>x.phone===phone);
 const customerData={name, business_name:business, phone,email,gstin,billing_address:billing,delivery_address:delivery};
 if(!c){const q=await db.from("customers").insert(customerData).select().single();if(q.error)return toast(q.error.message,false);c=q.data}
 else{const q=await db.from("customers").update(customerData).eq("id",c.id);if(q.error)return toast(q.error.message,false)}
 const inv=await db.from("invoices").insert({invoice_no:no,customer_id:c.id,customer_name:name,customer_phone:phone,customer_business:business,customer_email:email,gstin,billing_address:billing,delivery_address:delivery,subtotal,discount,gst_percent:gp,gst_amount:gst,cgst_percent:cgstPercent,cgst_amount:cgstAmount,sgst_percent:sgstPercent,sgst_amount:sgstAmount,igst_percent:igstPercent,igst_amount:igstAmount,total,profit,payment_status:paymentStatus,paid_amount:paidAmount,due_amount:dueAmount,due_date:dueDate,payment_method:paymentMethod}).select().single();
 if(inv.error)return toast(inv.error.message,false);
 if(paidAmount>0){const pay=await db.from("payments").insert({invoice_id:inv.data.id,customer_id:c.id,amount:paidAmount,payment_date:dateKey(),payment_method:paymentMethod,notes:"Initial payment"});if(pay.error)return toast(pay.error.message,false)}
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
$("customerForm").addEventListener("submit",async e=>{e.preventDefault();const phone=normalizePhone($("customerPhone").value),gstin=$("customerGstin").value.trim().toUpperCase();if(!validPhone(phone))return toast("Phone must be exactly 10 digits and start with 6-9",false);if(!validGstin(gstin))return toast("Enter a valid 15-character GSTIN",false);const x={name:$("customerName").value.trim(),business_name:$("businessName").value.trim(),phone,email:$("customerEmail").value.trim(),gstin,billing_address:$("billingAddress").value.trim(),delivery_address:$("deliveryAddress").value.trim()};if(!x.name)return toast("Enter customer name",false);if(!isAdmin){const ok=await submitChange("customers",editingCustomerId?"customer_update":"customer_create","customers",editingCustomerId,x,"Employee customer change");if(ok)$("customerDialog").close();return} const q=editingCustomerId?db.from("customers").update(x).eq("id",editingCustomerId):db.from("customers").insert(x);const {error}=await q;if(error)return toast(error.message,false);$("customerDialog").close();toast("Customer saved");loadAll()});
$("addEnquiry").onclick=()=>$("enquiryDialog").showModal();
$("enquiryForm").addEventListener("submit",async e=>{e.preventDefault();const payload={name:$("ename").value.trim(),phone:$("ephone").value.trim(),business:$("ebusiness").value.trim(),message:$("emessage").value.trim(),status:$("estatus").value};if(!isAdmin){const ok=await submitChange("enquiries","enquiry_create","enquiries",null,payload,"Employee lead/enquiry change");if(ok)$("enquiryDialog").close();return} const {error}=await db.from("enquiries").insert(payload);if(error)return toast(error.message,false);$("enquiryDialog").close();toast("Enquiry saved");loadAll()});
$("export").onclick=()=>{const rows=[["Invoice","Customer","Phone","Subtotal","Discount","GST %","GST Amount","Total","Profit","Paid","Credit","Payment Status","Due Date","Date"],...invoices.map(x=>[x.invoice_no,x.customer_name,x.customer_phone,x.subtotal,x.discount,x.gst_percent||0,x.gst_amount||0,x.total,x.profit,x.paid_amount||0,x.due_amount||0,x.payment_status||"Credit",x.due_date||"",x.created_at])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="cleancore-sales.csv";a.click()};

window.viewInvoice=async id=>{
 const inv=invoices.find(x=>x.id===id); if(!inv)return;
 const r=await db.from("invoice_items").select("*").eq("invoice_id",id).order("created_at");
 if(r.error)return toast(r.error.message,false);
 const hasGst=Number(inv.gst_amount||0)>0 && String(inv.gstin||"").trim()!==""; const intra=Number(inv.cgst_amount||0)>0 || Number(inv.sgst_amount||0)>0;
 const cgst=Number(inv.cgst_amount||0),sgst=Number(inv.sgst_amount||0),igst=Number(inv.igst_amount||0);
 const taxRows=intra
  ? "<tr><td colspan='5' class='tax-label'>CGST ("+Number(inv.cgst_percent||0)+"%)</td><td>"+money(cgst)+"</td></tr><tr><td colspan='5' class='tax-label'>SGST ("+Number(inv.sgst_percent||0)+"%)</td><td>"+money(sgst)+"</td></tr>"
  : (igst>0 ? "<tr><td colspan='5' class='tax-label'>IGST ("+Number(inv.igst_percent||0)+"%)</td><td>"+money(igst)+"</td></tr>" : "");
 const rows=(r.data||[]).map((it,n)=>"<tr><td>"+(n+1)+"</td><td>"+esc(it.product_name)+"</td><td>—</td><td>"+it.qty+"</td><td>"+money(it.unit_price)+"</td><td>"+money(it.line_total)+"</td></tr>").join("");
 const taxable=Number(inv.subtotal||0)-Number(inv.discount||0);
 const date=new Date(inv.created_at);
 $("invoicePreview").innerHTML="<div class='invoice-preview'>"+
 "<div class='inv-header'><div><div class='inv-brand'>CleanCore Chemical & Cleaning</div><div class='inv-sub'>Manufacturing & Supply of Cleaning Chemicals</div><div>Hyderabad, Telangana, India</div><div>Phone: +91 91827 25773</div><div>Email: "+BUSINESS_EMAIL+"</div></div><div class='inv-title'><b>"+(hasGst?"TAX INVOICE":"INVOICE")+"</b><span>ORIGINAL FOR RECIPIENT</span></div></div>"+
 "<div class='inv-meta'><div><b>Invoice No:</b> "+esc(inv.invoice_no)+"<br><b>Invoice Date:</b> "+date.toLocaleDateString("en-IN")+"</div><div><b>Place of Supply:</b> Telangana<br><b>Payment Status:</b> "+esc(inv.payment_status||"Credit")+"<br><b>Paid:</b> "+money(inv.paid_amount)+"<br><b>Credit Due:</b> "+money(inv.due_amount)+(inv.due_date?"<br><b>Due Date:</b> "+isoDate(inv.due_date):"")+"</div></div>"+
 "<div class='inv-parties'><div><b>BILL FROM</b><p><strong>CleanCore Chemical & Cleaning</strong><br>Hyderabad, Telangana<br>Phone: +91 91827 25773<br>Email: "+BUSINESS_EMAIL+"<br>GSTIN: —</p></div><div><b>BILL TO</<p><strong>"+esc(inv.customer_business||inv.customer_name||"—")+"</strong><br>"+esc(inv.customer_name||"—")+"<br>Phone: "+esc(inv.customer_phone||"—")+"<br>GSTIN: "+esc(inv.gstin||"—")+"<br>Billing: "+esc(inv.billing_address||"—")+"</p></div></div>"+
 "<table class='invoice-items'><thead><tr><th>S.No.</th><th>Product / Service</th><th>HSN / SAC</th><th>Qty</th><th>Rate</th><th>Taxable Value</th></tr></thead><tbody>"+rows+
 "<tr class='subtotal-row'><td colspan='5'>Subtotal</td><td>"+money(inv.subtotal)+"</td></tr>"+(Number(inv.discount||0)>0?"<tr><td colspan='5' class='tax-label'>Discount</td><td>- "+money(inv.discount)+"</td></tr>":"")+"<tr><td colspan='5' class='tax-label'>Taxable Value</td><td>"+money(taxable)+"</td></tr>"+taxRows+
 "<tr class='grand-total'><td colspan='5'>TOTAL</td><td>"+money(inv.total)+"</td></tr></tbody></table>"+
 "<div class='amount-words'><b>Total in words:</b> "+esc(numberToWordsIndian(Number(inv.total||0)))+" ONLY</div>"+
 "<div class='inv-bottom'><div><b>Terms & Conditions</b><p>Goods once sold will not be taken back unless agreed in writing.<br>Payment as per agreed business terms.<br>Subject to Hyderabad, Telangana jurisdiction.</p></div><div class='signature'><span>For CleanCore Chemical & Cleaning</span><br><br><b>Authorised Signature</b></div></div>"+
 "</div>";
 $("invoiceDialog").showModal();
};
function numberToWordsIndian(n){
 n=Math.round(Number(n)||0); if(n===0)return "ZERO RUPEES";
 const ones=["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
 const tens=["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
 const two=x=>x<20?ones[x]:tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");
 const part=(x,unit)=>x?two(x)+" "+unit+" ":"";
 let s="";
 if(n>=10000000){s+=part(Math.floor(n/10000000),"CRORE");n%=10000000}
 if(n>=100000){s+=part(Math.floor(n/100000),"LAKH");n%=100000}
 if(n>=1000){s+=part(Math.floor(n/1000),"THOUSAND");n%=1000}
 if(n>=100){s+=part(Math.floor(n/100),"HUNDRED");n%=100}
 if(n)s+=two(n);
 return s.trim()+" RUPEES";
}
$("closeInvoice").onclick=()=>$("invoiceDialog").close();
$("printInvoice").onclick=()=>{
 const w=window.open("","_blank","width=900,height=1100");
 if(!w)return toast("Allow pop-ups to print the bill.",false);
 const body=$("invoicePreview").innerHTML;
 w.document.write("<html><head><title>CleanCore Tax Invoice</title><style>"+
 "@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:11px;margin:0}.invoice-preview{width:100%;padding:0}.inv-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px}.inv-brand{font-size:22px;font-weight:800}.inv-sub{font-weight:700;margin:3px 0 6px}.inv-title{text-align:right;font-size:20px}.inv-title span{display:block;font-size:9px;margin-top:4px}.inv-meta{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #111;padding:8px 0}.inv-parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #111}.inv-parties>div{padding:8px;border-right:1px solid #111}.inv-parties>div:last-child{border-right:0}.inv-parties p{line-height:1.45;margin:5px 0}.invoice-items{width:100%;border-collapse:collapse;margin-top:10px}.invoice-items th,.invoice-items td{border:1px solid #777;padding:6px;vertical-align:top}.invoice-items th{background:#f1f1f1;text-transform:uppercase;font-size:9px}.invoice-items td:nth-child(1){width:7%}.invoice-items td:nth-child(3){width:14%}.invoice-items td:nth-child(4){width:9%}.invoice-items td:nth-child(5){width:14%}.invoice-items td:nth-child(6){width:18%;text-align:right}.tax-label{text-align:right}.subtotal-row td,.grand-total td{font-weight:700}.grand-total{font-size:13px}.amount-words{border:1px solid #777;padding:8px;margin-top:8px}.inv-bottom{display:grid;grid-template-columns:1fr 1fr;border:1px solid #777;margin-top:8px;min-height:110px}.inv-bottom>div{padding:8px;border-right:1px solid #777}.inv-bottom>div:last-child{border-right:0}.inv-bottom p{line-height:1.45}.signature{text-align:center;padding-top:55px!important}.signature span{font-weight:700}.invoice-preview b{font-weight:700}"+
 "</style></head><body>"+body+"</body></html>");
 w.document.close(); w.focus(); setTimeout(()=>w.print(),250);
};
$("profileBtn").onclick=()=>{ $("profileEmail").textContent=user?.email||""; $("profileMenu").classList.toggle("hidden"); };
$("profileChangePassword").onclick=()=>{ $("profileMenu").classList.add("hidden"); $("passwordBox").classList.remove("hidden"); go("settings"); };
$("profileLogout").onclick=async()=>{await db.auth.signOut();location.reload()};
$("changePassword").onclick=()=>$("passwordBox").classList.toggle("hidden");
$("sendReauth").onclick=async()=>{const {error}=await db.auth.reauthenticate();if(error)return toast(error.message,false);toast("Reauthentication OTP sent to your email.")};
$("updatePw").onclick=async()=>{const current_password=$("currentPw").value,password=$("newPw").value,nonce=$("reauthCode")?.value.trim();if(password.length<12)return toast("Use at least 12 characters",false);if(!nonce)return toast("Enter the reauthentication OTP",false);const {error}=await db.auth.updateUser({password,current_password,nonce});if(error)return toast(error.message,false);toast("Password updated");$("passwordBox").classList.add("hidden")};

// Clean session policy: stay signed in across screen changes / tab switches.
// Automatic lock happens after 20 minutes with no user activity.
// A normal browser reload starts at the login screen because the local session is cleared on load.
const INACTIVITY_MS=20*60*1000;
let inactivityTimer;
function clearInactivity(){clearTimeout(inactivityTimer)}
async function forceLogout(){
  clearInactivity();
  try{await db.auth.signOut({scope:"local"})}finally{
    sessionStorage.removeItem("cleancore_session");
    user=null;
    location.reload();
  }
}
function armInactivity(){
  clearInactivity();
  if(!user)return;
  inactivityTimer=setTimeout(forceLogout,INACTIVITY_MS);
}
["click","keydown","pointerdown","mousemove","touchstart","scroll"].forEach(ev=>{
  document.addEventListener(ev,()=>{if(user)armInactivity()},{passive:true});
});
window.addEventListener("beforeunload",()=>{sessionStorage.removeItem("cleancore_session")});
user=null;
