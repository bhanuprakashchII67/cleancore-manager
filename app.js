const SUPABASE_URL="https://rwfamxkfqslorxcryjrp.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_tzfe2xVn6OAwF-Mh5_u_zQ_a_bAW7tO"; const BUSINESS_EMAIL="cleancorehyd@gmail.com";
const {createClient}=window.supabase||{};
if(typeof createClient!=="function")throw new Error("Supabase client library did not load. Please check your internet connection and reload.");
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:window.localStorage}
});

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n||0));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const phoneRE=/^[6-9]\d{9}$/;
const gstRE=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ADMIN_EMAIL="bhanuprakashchadalawada10@gmail.com";
const STAFF_AUTH_DOMAIN="@staff.cleancore.local";
const ALL_MODULES=["dashboard","products","billing","sales","customers","enquiries","website_orders","expenses"];
const MODULE_LABELS={dashboard:"Dashboard",products:"Products & Stock",billing:"Billing",sales:"Sales",customers:"Customers",enquiries:"Leads / Enquiries",website_orders:"Website Orders",expenses:"Expenses"};
const SECTION_MODULE={dashboard:"dashboard",products:"products",billing:"billing",sales:"sales",customers:"customers",enquiries:"enquiries",expenses:"expenses",settings:"settings",recovery:"recovery"};
const EMPLOYEE_PORTAL_BASE="https://bhanuprakashchII67.github.io/cleancore-website/employee.html";
let user=null,isAdmin=false,employee=null,employeePermissions=new Set(),employeePermissionRows=[],products=[],invoices=[],customers=[],enquiries=[],rawMaterials=[],expenses=[],payments=[],websiteOrders=[],employees=[],changeRequests=[],accessRequests=[],managerNotifications=[],deletedRecords=[],websiteNotifications=[];
let notificationChannel=null,notificationPollTimer=null,notificationAudioContext=null;
let editingProductId=null, editingCustomerId=null, editingRawId=null, editingExpenseId=null; let billTotal=0;

function toast(m,ok=true){const t=$("toast");t.textContent=m;t.className="toast show "+(ok?"ok":"bad");setTimeout(()=>t.className="toast",3200)}
function notificationStoreKey(type){return "cleancore_manager_notifications_"+type+"_"+(user?.id||"guest")}
function isWebsiteManagerNotification(n){return n&&["Website Order","Website Enquiry"].includes(n.notification_type)}
function notificationTime(v){return v?new Date(v).toLocaleString("en-IN"):"—"}
function unlockNotificationAudio(){
 try{
   if(!notificationAudioContext)notificationAudioContext=new (window.AudioContext||window.webkitAudioContext)();
   if(notificationAudioContext.state==="suspended")notificationAudioContext.resume().catch(()=>{});
 }catch(e){}
}
async function playNotificationSound(){
 try{
   unlockNotificationAudio();
   const ctx=notificationAudioContext;if(!ctx)return;
   if(ctx.state==="suspended")await ctx.resume().catch(()=>{});
   if(navigator.vibrate)navigator.vibrate([100,60,100]);
   const master=ctx.createGain();
   master.gain.value=0.46;
   master.connect(ctx.destination);
   const now=ctx.currentTime;
   [0,0.2,0.42].forEach((offset,i)=>{
     const o=ctx.createOscillator(),g=ctx.createGain();
     o.type=i===2?"triangle":"sine";
     o.frequency.setValueAtTime([880,1175,988][i],now+offset);
     g.gain.setValueAtTime(0.0001,now+offset);
     g.gain.exponentialRampToValueAtTime(0.34,now+offset+0.025);
     g.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.19);
     o.connect(g);g.connect(master);
     o.start(now+offset);o.stop(now+offset+0.21);
   });
 }catch(e){}
}
document.addEventListener("pointerdown",unlockNotificationAudio,{once:true,capture:true});
function notificationReadAt(){return Number(localStorage.getItem(notificationStoreKey("read"))||0)}
function notificationAlertedAt(){return Number(localStorage.getItem(notificationStoreKey("alerted"))||0)}
function setNotificationTimestamp(type,v){localStorage.setItem(notificationStoreKey(type),String(v))}
function renderWebsiteNotifications(){
 const list=$("notificationList"),badge=$("notificationBadge");
 if(!list||!badge)return;
 const readAt=notificationReadAt();
 const unread=websiteNotifications.filter(n=>new Date(n.created_at).getTime()>readAt).length;
 badge.textContent=String(unread);
 badge.classList.toggle("hidden",unread===0);
 if(!websiteNotifications.length){
   list.innerHTML='<div class="empty">No website orders or enquiries yet.</div>';
   return;
 }
 list.innerHTML=websiteNotifications.slice(0,15).map(n=>{
   const isOrder=n.notification_type==="Website Order";
   return '<button type="button" class="notification-item '+(new Date(n.created_at).getTime()>readAt?"unread":"")+'" data-notification-id="'+esc(n.related_id||"")+'" data-notification-type="'+esc(n.notification_type)+'">'+
     '<span class="notification-icon">'+(isOrder?"🛒":"✉️")+'</span>'+
     '<span class="notification-copy"><strong>'+esc(n.subject||n.notification_type)+'</strong><small>'+esc(n.body||"")+'</small><em>'+esc(notificationTime(n.created_at))+'</em></span>'+
   '</button>';
 }).join("");
}
function announceWebsiteNotification(n){
 if(!isWebsiteManagerNotification(n)||websiteNotifications.some(x=>x.id===n.id))return;
 websiteNotifications.unshift(n);
 const ts=new Date(n.created_at).getTime();
 setNotificationTimestamp("alerted",Math.max(notificationAlertedAt(),ts));
 renderWebsiteNotifications();
 playNotificationSound();
 const isOrder=n.notification_type==="Website Order";
 toast(isOrder?"🔔 New website order received":"🔔 New website enquiry received");
 // Pull the new order/enquiry into the currently open Manager section immediately.
 loadAll().catch(err=>console.warn("Manager data refresh after alert:",err.message));
}
async function loadWebsiteNotifications(firstLoad=false){
 if(!isAdmin)return;
 const {data,error}=await db.from("manager_notifications").select("*").in("notification_type",["Website Order","Website Enquiry"]).order("created_at",{ascending:false}).limit(50);
 if(error){console.warn("Website notification load:",error.message);return;}
 const latest=(data||[]).filter(isWebsiteManagerNotification);
 const currentIds=new Set(websiteNotifications.map(x=>x.id));
 const previousAlerted=notificationAlertedAt();
 if(firstLoad&&previousAlerted===0){
   const latestTs=latest.length?new Date(latest[0].created_at).getTime():Date.now();
   setNotificationTimestamp("alerted",latestTs);
   setNotificationTimestamp("read",latestTs);
 }
 for(const n of latest.slice().reverse()){
   if(currentIds.has(n.id))continue;
   if(new Date(n.created_at).getTime()>notificationAlertedAt()){
     announceWebsiteNotification(n);
   }else{
     websiteNotifications.push(n);
   }
 }
 websiteNotifications.sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));
 renderWebsiteNotifications();
}
function stopWebsiteNotifications(){
 if(notificationPollTimer){clearInterval(notificationPollTimer);notificationPollTimer=null;}
 if(notificationChannel){db.removeChannel(notificationChannel).catch?.(()=>{});notificationChannel=null;}
}
async function startWebsiteNotifications(){
 stopWebsiteNotifications();
 if(!isAdmin)return;
 await loadWebsiteNotifications(true);
 notificationChannel=db.channel("cleancore-manager-website-alerts")
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"manager_notifications"},payload=>{
     if(isWebsiteManagerNotification(payload.new))announceWebsiteNotification(payload.new);
   })
   .subscribe();
 notificationPollTimer=setInterval(()=>loadWebsiteNotifications(false),10000);
}
document.getElementById("testNotificationSound")?.addEventListener("click",async e=>{
  e.stopPropagation();
  await playNotificationSound();
  toast("Notification sound tested");
});
function markWebsiteNotificationsRead(){
 const latest=websiteNotifications.reduce((max,n)=>Math.max(max,new Date(n.created_at).getTime()),0);
 if(latest)setNotificationTimestamp("read",latest);
 renderWebsiteNotifications();
}
function bindWebsiteNotificationUi(){
 $("notificationBtn")?.addEventListener("click",e=>{
   e.stopPropagation();
   $("profileMenu")?.classList.add("hidden");
   $("notificationMenu")?.classList.toggle("hidden");
   unlockNotificationAudio();
 });
 $("markNotificationsRead")?.addEventListener("click",e=>{
   e.stopPropagation();
   markWebsiteNotificationsRead();
 });
 $("notificationList")?.addEventListener("click",async e=>{
   const item=e.target.closest?.(".notification-item");
   if(!item)return;
   const type=item.dataset.notificationType,id=item.dataset.notificationId;
   markWebsiteNotificationsRead();
   $("notificationMenu")?.classList.add("hidden");
   if(type==="Website Order"){
     await go("website_orders");
     setTimeout(()=>window.viewWebsiteOrder?.(id),80);
   }else{
     await go("enquiries");
   }
 });
 document.addEventListener("click",e=>{
   if(!e.target.closest?.(".notification-wrap"))$("notificationMenu")?.classList.add("hidden");
 });
 document.addEventListener("pointerdown",unlockNotificationAudio,{passive:true});
 document.addEventListener("keydown",unlockNotificationAudio,{passive:true});
}
function ensureDialogCloseButtons(){
 document.querySelectorAll("dialog").forEach(d=>{
   if(!d.querySelector("[data-dialog-x]")){
     const b=document.createElement("button");
     b.type="button";b.dataset.dialogX="1";b.className="dialog-x";b.setAttribute("aria-label","Close");
     b.textContent="×";b.onclick=()=>d.close();
     d.appendChild(b);
   }
   d.querySelectorAll("[data-dialog-cancel]").forEach(b=>{
     b.type="button";
     b.addEventListener("click",()=>{
       const form=b.closest("form");
       if(form)form.reset();
       d.close();
     });
   });
 });
}
document.addEventListener("DOMContentLoaded",ensureDialogCloseButtons);

async function refreshManagerData(){
 const b=$("refreshManager");
 if(b){b.disabled=true;b.textContent="↻ Refreshing…";}
 try{
   await loadAll();
   toast("Manager data refreshed");
 }catch(err){
   toast(err?.message||"Refresh failed",false);
 }finally{
   if(b){b.disabled=false;b.textContent="↻ Refresh";}
 }
}
function refreshPageData(btn){
 if(!btn)return;
 const old=btn.textContent;
 const section=btn.dataset.pageRefresh||"";
 btn.disabled=true;
 btn.textContent="↻ Refreshing…";
 loadAll()
   .then(async()=>{ if(section)await go(section); toast("Page data refreshed"); })
   .catch(err=>toast(err?.message||"Refresh failed",false))
   .finally(()=>{ btn.disabled=false; btn.textContent=old; });
}
function bindRefreshControls(){
 const bind=()=>{
   const b=$("refreshManager");
   if(b&&b.dataset.bound!=="1"){
     b.dataset.bound="1";
     b.addEventListener("click",refreshManagerData);
   }
   document.querySelectorAll("[data-page-refresh]").forEach(btn=>{
     if(btn.dataset.bound==="1")return;
     btn.dataset.bound="1";
     btn.addEventListener("click",()=>refreshPageData(btn));
   });
   return !!b;
 };
 bind();
 window.addEventListener("load",bind,{once:true});
}
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
  const currentEmail=String(user?.email||"").trim().toLowerCase();
  if(currentEmail===ADMIN_EMAIL.toLowerCase()){
    isAdmin=true;
    employeePermissions=new Set(ALL_MODULES);
    return;
  }
  const {data:profile,error}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(error)throw new Error("Unable to verify Manager access: "+error.message);
  if(profile?.role!=="admin")throw new Error("This Manager workspace is restricted to the main Manager account. Use your employee portal link.");
  isAdmin=true;employeePermissions=new Set(ALL_MODULES);
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
  try{
    const {data,error}=await db.rpc("log_employee_access_attempt",{p_module:module,p_action:action,p_reason:reason});
    if(!error&&data)await db.functions.invoke("manager-notify",{body:{related_id:data}}).catch(()=>null);
  }catch(e){}
}
async function submitChange(module,action,targetTable,targetId,payload,reason=""){
  if(isAdmin)return false;
  if(!canAccess(module)){await logUnauthorized(module,"CHANGE_REQUEST",reason||"Change attempted without permission");toast("Access denied. This action has been logged.",false);return false;}
  const {data,error}=await db.rpc("submit_change_request",{p_module:module,p_action:action,p_target_table:targetTable,p_target_id:targetId||null,p_payload:payload||{},p_reason:reason||""});
  if(error){toast(error.message,false);return false;}
  if(data)db.functions.invoke("manager-notify",{body:{related_id:data}}).catch(()=>null);
  toast("Change submitted to Manager for approval. Request "+String(data||"").slice(0,8));
  return true;
}
async function enter(){
 await loadAccess();
 $("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
 $("profileEmail").textContent=isAdmin?user.email:(employee.alert_email||("Username: "+employee.username));
 if($("profileName"))$("profileName").textContent=isAdmin?"CleanCore Admin":employee.full_name;
 if($("profileRole"))$("profileRole").textContent=isAdmin?"Administrator":("Employee • "+employee.team);
 if($("profileChangePassword"))$("profileChangePassword").classList.toggle("hidden",!isAdmin);
 applyAccess();
 await loadAll();
 if(isAdmin)startWebsiteNotifications();
 const first=isAdmin?"dashboard":ALL_MODULES.find(x=>employeePermissions.has(x))||"dashboard";
 await go(first);
}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const identifier=$("loginIdentifier").value.trim(),password=$("loginPassword").value;
 if(!identifier||!password)return toast("Enter username and password.",false);
 try{
   const email=identifier.includes("@")?identifier.toLowerCase():syntheticStaffEmail(identifier);
   let data,error;
   try{
     ({data,error}=await db.auth.signInWithPassword({email,password}));
   }catch(networkErr){
     const response=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{
       method:"POST",
       headers:{"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
       body:JSON.stringify({email,password})
     });
     const payload=await response.json().catch(()=>({}));
     if(!response.ok)throw new Error(payload.error_description||payload.msg||networkErr.message||"Authentication request failed.");
     const setResult=await db.auth.setSession(payload);
     if(setResult.error)throw setResult.error;
     data={session:payload,user:payload.user};error=null;
   }
   if(error)return toast("Login failed: "+error.message,false);
   if(!data?.session)return toast("Login failed: No session returned.",false);
   user=data.user;
   startManagerLoginWindow();
   try{
     await enter();
   }catch(err){
     console.error("CleanCore Manager startup error",err);
     return toast(err?.message||"Unable to open the Manager.",false);
   }
 }catch(err){
   console.error("CleanCore login error",err);
   return toast(err?.message||"Unable to connect to CleanCore.",false);
 }
});
$("logout").onclick=async()=>{stopWebsiteNotifications();clearManagerLoginWindow();await db.auth.signOut({scope:"local"});location.reload()};
$("refreshManager")?.addEventListener("click",refreshManagerData);
document.addEventListener("click",e=>{
 const nav=e.target.closest?.(".nav[data-section]");
 if(nav)go(nav.dataset.section);
});
document.querySelectorAll(".goto").forEach(b=>b.onclick=()=>go(b.dataset.goto));
async function go(id){
 const module=SECTION_MODULE[id];
 const allowed=id==="enquiries" ? (isAdmin||canAccess("enquiries")||canAccess("website_orders")) : (isAdmin||!!module&&canAccess(module));
 if(!allowed){await logUnauthorized(module||id,"NAVIGATION","Attempted to open restricted Manager section");toast("Access denied. The Manager has been notified.",false);return;}
 document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));
 document.querySelectorAll(".nav[data-section]").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
 const navLabel=(document.querySelector('.nav[data-section="'+id+'"]')?.textContent||id).trim();
 const titleEl=$("title");
 if(titleEl)titleEl.textContent=navLabel;
 document.title="CleanCore Manager • "+navLabel;
}
async function loadAll(){
 const qP=(isAdmin||canAccess("products")||canAccess("billing"))?db.from("products").select("*").order("name"):null;
 const qI=(isAdmin||canAccess("billing")||canAccess("sales"))?db.from("invoices").select("*").order("created_at",{ascending:false}):null;
 const qC=(isAdmin||canAccess("customers")||canAccess("billing"))?db.from("customers").select("*").is("archived_at",null).order("name"):null;
 const qE=(isAdmin||canAccess("enquiries"))?db.from("enquiries").select("*").order("created_at",{ascending:false}):null;
 const qR=(isAdmin||canAccess("products"))?db.from("raw_materials").select("*").order("name"):null;
 const qX=(isAdmin||canAccess("expenses"))?db.from("expenses").select("*").order("expense_date",{ascending:false}).order("created_at",{ascending:false}):null;
 const qPM=(isAdmin||canAccess("billing")||canAccess("sales")||canAccess("customers"))?db.from("payments").select("*").order("payment_date",{ascending:false}).order("created_at",{ascending:false}):null;
 const qWO=(isAdmin||canAccess("website_orders"))?db.from("website_orders").select("*").order("created_at",{ascending:false}):null;
 const qs=await Promise.all([qP,qI,qC,qE,qR,qX,qPM,qWO]);
 const [p,i,cu,e,r,x,pm,wo]=qs;
 for(const q of qs)if(q?.error)throw new Error(q.error.message);
 products=p?.data||[];invoices=i?.data||[];customers=cu?.data||[];enquiries=e?.data||[];rawMaterials=r?.data||[];expenses=x?.data||[];payments=pm?.data||[];websiteOrders=wo?.data||[];
 if(isAdmin){
   const [er,ep,cr,ar,nr,dr]=await Promise.all([
     db.from("employees").select("*").order("created_at",{ascending:false}),
     db.from("employee_permissions").select("*"),
     db.from("change_requests").select("*").order("requested_at",{ascending:false}),
     db.from("access_requests").select("*").order("created_at",{ascending:false}),
     db.from("manager_notifications").select("*").order("created_at",{ascending:false}),
     db.from("deleted_records").select("id,entity_type,original_id,display_name,deleted_at,purge_at,status").eq("status","Deleted").order("deleted_at",{ascending:false})
   ]);
   for(const q of [er,ep,cr,ar,nr,dr])if(q?.error)throw new Error(q.error.message);
   employees=er.data||[];employeePermissionRows=ep.data||[];changeRequests=cr.data||[];accessRequests=ar.data||[];managerNotifications=nr.data||[];deletedRecords=dr.data||[];
   renderEmployeeData();
   renderRecovery();
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
   $("employeesTable").innerHTML=table(["Employee","Username","Team","Access","Start","End","Permissions","Portal link","Action"],employees.map(e=>{
     const expired=e.ends_at&&new Date(e.ends_at)<new Date();
     const state=e.active&&!expired?"Active":"Disabled / expired";
     const perms=employeePermissionsFor(e.id).join(", ")||"None";
     const portal=(e.portal_key?EMPLOYEE_PORTAL_BASE+"?key="+e.portal_key:"—");
     return [esc(e.full_name),esc(e.username),esc(e.team),state,formatAccessDate(e.starts_at),formatAccessDate(e.ends_at),esc(perms),
       e.portal_key?"<button class='link' onclick=\"copyEmployeePortal('"+e.portal_key+"')\">Copy link</button>":"—",
       "<button class='link' onclick=\"toggleEmployeeActive('"+e.id+"',"+(!e.active)+")\">"+(e.active?"Disable":"Enable")+"</button> <button class='link' onclick=\"resetEmployeePassword('"+e.id+"')\">Reset password</button>"];
   }));
 }
 const pending=changeRequests.filter(x=>x.status==="Pending");
 if($("approvalCount"))$("approvalCount").textContent=String(pending.length);
 const ticketRows=accessRequests.filter(x=>x.action==="REQUEST_ACCESS");
 const alertRows=accessRequests.filter(x=>x.action!=="REQUEST_ACCESS");
 if($("accessAlertCount"))$("accessAlertCount").textContent=String(alertRows.length);
 if($("accessTicketCount"))$("accessTicketCount").textContent=String(ticketRows.filter(x=>x.status==="Pending").length);
 if($("approvalSummary"))$("approvalSummary").textContent=pending.length+" change request"+(pending.length===1?"":"s")+" waiting for Manager approval.";
 if($("accessTicketsTable")){
   $("accessTicketsTable").innerHTML=table(["Employee","Requested access","Reason","Requested","Status","Action"],ticketRows.map(r=>{
     const e=employeeById(r.employee_id);
     const buttons=r.status==="Pending"
       ? "<button class='link' onclick=\"reviewAccessRequest('"+r.id+"',true)\">Grant</button> <button class='link danger' onclick=\"reviewAccessRequest('"+r.id+"',false)\">Deny</button>"
       : esc(r.status||"Reviewed");
     return [esc(e?.username||"—"),esc(MODULE_LABELS[r.module]||r.module),esc(r.reason||"—"),formatAccessDate(r.created_at),esc(r.status||"Pending"),buttons];
   }));
 }
 if($("accessRequestsTable")){
   $("accessRequestsTable").innerHTML=table(["Employee","Module","Action","Reason","Date"],alertRows.slice(0,100).map(r=>{
     const e=employeeById(r.employee_id);
     return [esc(e?.username||"—"),esc(MODULE_LABELS[r.module]||r.module),esc(r.action),esc(r.reason||"—"),formatAccessDate(r.created_at)];
   }));
 }
 if($("changeRequestsTable")){
   $("changeRequestsTable").innerHTML=table(["Employee","Module","Action","Target","Requested","Status","Review"],changeRequests.map(r=>{
     const e=employeeById(r.employee_id);
     const action=esc(r.action);
     const status=esc(r.status);
     const buttons=r.status==="Pending"
       ? "<button class='link' onclick=\"reviewChange('"+r.id+"',true)\">Approve</button> <button class='link danger' onclick=\"reviewChange('"+r.id+"',false)\">Reject</button>"
       : "Reviewed";
     const details="<button class='link' onclick=\"viewChangeRequest('"+r.id+"')\">View</button> ";
     return [esc(e?.username||"—"),esc(MODULE_LABELS[r.module]||r.module),action,esc(r.target_table||"—"),formatAccessDate(r.requested_at),status,details+buttons];
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
window.copyEmployeePortal=async function(key){
 const url=EMPLOYEE_PORTAL_BASE+"?key="+key;
 try{await navigator.clipboard.writeText(url);toast("Employee portal link copied");}
 catch(e){prompt("Copy this employee portal link:",url);}
};
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
window.viewChangeRequest=function(id){
 if(!isAdmin)return;
 const r=changeRequests.find(x=>x.id===id);if(!r)return;
 const e=employeeById(r.employee_id);
 $("changeRequestTitle").textContent=(e?.username||"Employee")+" — "+(MODULE_LABELS[r.module]||r.module)+" / "+r.action;
 $("changeRequestDetails").textContent=JSON.stringify({action:r.action,target_table:r.target_table,target_id:r.target_id,payload:r.payload,requested_at:r.requested_at,status:r.status},null,2);
 $("changeRequestDialog").showModal();
};
$("closeChangeRequest").onclick=function(){$("changeRequestDialog").close()};
window.reviewAccessRequest=async function(id,approve){
 if(!isAdmin)return;
 const note=approve?"":(prompt("Reason for denial (optional):","")||"");
 const {data,error}=await db.rpc("review_access_request",{p_request_id:id,p_approve:approve,p_note:note});
 if(error)return toast(error.message,false);
 toast(approve?"Access granted.":"Access request denied.");
 await loadAll();
};
window.reviewChange=async function(id,approve){
 if(!isAdmin)return;
 const note=approve?"":(prompt("Reason for rejection (optional):","")||"");
 const req=changeRequests.find(x=>x.id===id);
 const rpcName=req?.action==="raw_material_delete"?"review_raw_material_delete_request":req?.action==="customer_delete"?"review_customer_delete_request":(req?.action==="customer_create"||req?.action==="customer_update")?"review_customer_change_request":"review_change_request";
 const {data,error}=await db.rpc(rpcName,{p_request_id:id,p_approve:approve,p_note:note});
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
 $("employeePortalLink").value="";
 $("employeePortalBox").classList.add("hidden");
 $("employeeCreateButton").classList.remove("hidden");
 $("employeeCloseButton").classList.add("hidden");
 renderEmployeeModuleChecks("account");$("employeeStatus").textContent="";
}
$("addEmployee").onclick=()=>{resetEmployeeForm();$("employeeDialog").showModal()};
$("employeeTeam").onchange=()=>renderEmployeeModuleChecks($("employeeTeam").value);
$("employeeForm").addEventListener("submit",createEmployee);
$("employeeCancelButton").onclick=()=>$("employeeDialog").close();
$("employeeCloseButton").onclick=()=>{$("employeeDialog").close();resetEmployeeForm()};
$("copyEmployeePortalButton").onclick=async()=>{
 const url=$("employeePortalLink").value;
 try{await navigator.clipboard.writeText(url);toast("Portal link copied");}
 catch(e){prompt("Copy portal link:",url);}
};

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
 let result;
 try{result=await db.functions.invoke("employee-admin",{body:{action:"create",username,full_name,team,alert_email,password,starts_at,ends_at,modules}})}
 catch(err){return status.textContent="Could not reach the employee service. Please refresh and try again."}
 const {data,error}=result;
 if(error){
   let detail="";
   try{
     const response=error.context;
     if(response?.clone){
       const body=await response.clone().json().catch(()=>null);
       detail=body?.error||body?.message||"";
     }
   }catch(_){}
   status.textContent=(detail||error.message||"Could not create employee.")+" Please try again.";
   return;
 }
 if(data?.error)return status.textContent=data.error;
 if(data?.portal_url){
   $("employeePortalLink").value=data.portal_url;
   $("employeePortalBox").classList.remove("hidden");
   $("employeeCreateButton").classList.add("hidden");
   $("employeeCloseButton").classList.remove("hidden");
   status.textContent="Employee created. Give this unique portal link to the employee.";
   await loadAll();
 } else {
   $("employeeDialog").close();toast("Employee "+username+" created.");await loadAll();
 }
}
function isSaleDocument(inv){return String(inv?.document_type||"SALE").toUpperCase()==="SALE";}
function isQuotationDocument(inv){return String(inv?.document_type||"SALE").toUpperCase()==="QUOTATION";}
function documentLabel(inv){return isQuotationDocument(inv)?"QUOTATION INVOICE":(Number(inv?.gst_amount||0)>0?"TAX INVOICE":"INVOICE");}
function renderQuotations(){
 const list=invoices.filter(isQuotationDocument).slice(0,20);
 const el=$("quotationsTable");
 if(!el)return;
 el.innerHTML=table(["Quotation","Customer","Total","Date","Action"],list.map(x=>[
   esc(x.invoice_no),esc(x.customer_name),money(x.total),new Date(x.created_at).toLocaleString("en-IN"),
   '<button type="button" class="link view-quotation" data-invoice-id="'+esc(x.id)+'">View / Print</button>'
 ]));
}
function renderAll(){
 const now=new Date(),day=new Date(now.getFullYear(),now.getMonth(),now.getDate()),mon=new Date(now.getFullYear(),now.getMonth(),1);
 const todayKey=dateKey(now),monthKey=todayKey.slice(0,7);
 const saleInvoices=invoices.filter(isSaleDocument);
 const td=saleInvoices.filter(x=>new Date(x.created_at)>=day),mo=saleInvoices.filter(x=>new Date(x.created_at)>=mon);
 const grossMonth=mo.reduce((a,x)=>a+Number(x.profit||0),0);
 const monthExpenses=expenses.filter(x=>String(x.expense_date||"").startsWith(monthKey)).reduce((a,x)=>a+Number(x.amount||0),0);
 $("today").textContent=money(td.reduce((a,x)=>a+Number(x.total),0));
 $("month").textContent=money(mo.reduce((a,x)=>a+Number(x.total),0));
 $("grossProfit").textContent=money(grossMonth);
 $("monthlyExpenses").textContent=money(monthExpenses);
 $("netProfit").textContent=money(grossMonth-monthExpenses);
 $("low").textContent=products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length+rawMaterials.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length;
 if($("websiteOrdersNew"))$("websiteOrdersNew").textContent=websiteOrders.filter(o=>o.status==="New").length;
 $("recent").innerHTML=table(["Invoice","Customer","Total","Date",""],saleInvoices.slice(0,8).map(x=>[esc(x.invoice_no),esc(x.customer_name),money(x.total),new Date(x.created_at).toLocaleString("en-IN"),'<button type="button" class="icon-delete-btn" title="Delete invoice" aria-label="Delete invoice" onclick="deleteInvoice(\''+x.id+'\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6"/></svg></button>']));
 $("productsTable").innerHTML=table(["Product","Unit","Selling","Cost","Stock","Status","Action"],products.map(p=>[
  esc(p.name),esc(p.unit),money(p.selling_price),money(p.cost_price),p.stock,
  Number(p.stock)<=Number(p.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>',
  '<button class="link" onclick="editProduct(\''+p.id+'\')">Edit</button> <button class="link danger" onclick="deleteProduct(\''+p.id+'\')">Delete</button>'
 ]));
 $("rawTable").innerHTML=table(["Raw material","Unit","Cost / unit","Stock","Status","Action"],rawMaterials.map(r=>[
  esc(r.name),esc(r.unit),money(r.cost_per_unit),r.stock,
  Number(r.stock)<=Number(r.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>',
  '<button class="link" onclick="editRawMaterial(\''+r.id+'\')">Edit</button> <button class="link danger" onclick="deleteRawMaterial(\''+r.id+'\')">Delete</button>'
 ]));
 renderSales();
 renderExpenses();
 renderCustomers();
 renderWebsiteOrders();
 renderQuotations();
 $("enquiriesTable").innerHTML=table(["Name","Phone","Business","Email","Product","Qty","Source","Message","Status","Date",""],enquiries.map(x=>[esc(x.name),esc(x.phone),esc(x.business),esc(x.email),esc(x.product_name||"—"),esc(x.quantity??"—"),esc(x.source||"manager"),esc(x.message),esc(x.status),isoDate(x.created_at),"<button type='button' class='icon-delete-btn' title='Delete enquiry' aria-label='Delete enquiry' onclick=\"deleteEnquiry('"+x.id+"')\"><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6'/></svg></button>"]));
 if($("websiteOrdersPanel"))$("websiteOrdersPanel").style.display=(isAdmin||canAccess("website_orders"))?"":"none";
 if($("enquiriesPanel"))$("enquiriesPanel").style.display=(isAdmin||canAccess("enquiries"))?"":"none";
 if($("addEnquiry"))$("addEnquiry").disabled=(!isAdmin&&!canAccess("enquiries"));
 rebuildLines();
}
window.deleteInvoice=async function(id){
 if(!isAdmin){toast("Only the Manager can delete invoices.",false);return;}
 const inv=invoices.find(x=>x.id===id);if(!inv)return;
 if(!confirm("Delete invoice "+(inv.invoice_no||"")+"? Its invoice items and payment records will also be deleted. This cannot be undone."))return;
 const {data,error}=await db.rpc("delete_invoice_with_recovery",{p_invoice_id:id});
 if(error)return toast(error.message||"Unable to delete invoice.",false);
 toast("Invoice moved to Recovery for 30 days");
 await loadAll();
};
window.deleteEnquiry=async id=>{
 if(!isAdmin){toast("Only the Manager can delete enquiries.",false);return;}
 if(!confirm("Delete this enquiry?"))return;
 const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"enquiry",p_original_id:id});
 if(error)return toast(error.message||"Unable to delete enquiry.",false);
 toast("Enquiry moved to Recovery for 30 days");
 await loadAll();
};
function expenseList(){
 const from=$("expenseFrom")?.value||"",to=$("expenseTo")?.value||"";
 return expenses.filter(x=>(!from||String(x.expense_date)>=from)&&(!to||String(x.expense_date)<=to));
}
function renderRecovery(){
 if(!isAdmin||!$("recoveryTable"))return;
 const rows=deletedRecords.map(r=>{
   const days=Math.max(0,Math.ceil((new Date(r.purge_at)-new Date())/86400000));
   return [
     esc(r.entity_type.replaceAll("_"," ")),
     esc(r.display_name),
     formatAccessDate(r.deleted_at),
     formatAccessDate(r.purge_at),
     days+" day"+(days===1?"":"s"),
     "<button type='button' class='link' onclick=\"restoreDeletedRecord('"+r.id+"')\">Restore</button>"
   ];
 });
 $("recoveryTable").innerHTML=table(["Type","Record","Deleted","Auto-delete","Time left","Action"],rows);
 if($("recoverySummary"))$("recoverySummary").textContent=deletedRecords.length+" deleted record"+(deletedRecords.length===1?"":"s")+" currently recoverable. Records are permanently removed after 30 days.";
}
window.restoreDeletedRecord=async id=>{
 if(!isAdmin)return;
 const rec=deletedRecords.find(x=>x.id===id);if(!rec)return;
 if(!confirm("Restore "+(rec.display_name||rec.entity_type)+"?"))return;
 const {data,error}=await db.rpc("restore_deleted_record",{p_deleted_id:id});
 if(error)return toast(error.message||"Restore failed.",false);
 toast("Record restored");
 await loadAll();
};
function renderExpenses(){
 const list=expenseList();
 const gross=invoices.filter(inv=>{
   if(!isSaleDocument(inv))return false;
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
 const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"expense",p_original_id:id});
 if(error)return toast(error.message||"Unable to delete expense.",false);
 toast("Expense moved to Recovery for 30 days");
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
 let list=invoices.filter(isSaleDocument);
 if(from){const d=new Date(from+"T00:00:00");list=list.filter(x=>new Date(x.created_at)>=d)}
 if(to){const d=new Date(to+"T23:59:59");list=list.filter(x=>new Date(x.created_at)<=d)}
 $("salesSummary").textContent=list.length+" bill"+(list.length===1?"":"s")+" • "+money(list.reduce((a,x)=>a+Number(x.total),0))+" sales";
 $("salesTable").innerHTML=table(["Invoice","Customer","Subtotal","Discount","GST","Total","Profit","Paid","Credit","Status","Date","Action"],list.map(x=>[
  esc(x.invoice_no),esc(x.customer_name),money(x.subtotal),money(x.discount),String(Number(x.gst_percent||0))+"%",money(x.total),money(x.profit),money(x.paid_amount),money(x.due_amount),esc(x.payment_status||"Credit"),new Date(x.created_at).toLocaleString("en-IN"),
  '<button type="button" class="link view-bill" data-invoice-id="'+esc(x.id)+'">View Bill</button> <button type="button" class="icon-delete-btn" title="Delete invoice" aria-label="Delete invoice" onclick="deleteInvoice(\''+x.id+'\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6"/></svg></button>'
 ]));
}
function customerStats(id){
 const bills=invoices.filter(x=>x.customer_id===id&&isSaleDocument(x));
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
   return [esc(o.order_no),esc(cust?.name||"—"),esc(cust?.business_name||"—"),esc(cust?.phone||"—"),money(o.total),
     "<select class=\"order-status\" aria-label=\"Order status\" onchange=\"updateWebsiteOrderStatus('"+o.id+"',this.value)\">"+opts+"</select>",
     formatAccessDate(o.created_at),"<button class=\"link\" onclick=\"viewWebsiteOrder('"+o.id+"')\">View</button>"];
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
 let cust=customers.find(c=>c.id===o.customer_id)||null;
 if(!cust){
   const cr=await db.from("customers").select("*").eq("id",o.customer_id).maybeSingle();
   if(!cr.error)cust=cr.data;
 }
 const {data:items,error}=await db.from("website_order_items").select("*").eq("order_id",id).order("created_at");
 if(error)return toast(error.message,false);
 const invoice=o.invoice_id?(invoices.find(x=>x.id===o.invoice_id)||null):null;
 const invoiceNo=o.invoice_no||invoice?.invoice_no||"—";
 $("websiteOrderTitle").textContent=o.order_no+" — "+(cust?.business_name||cust?.name||"Customer");
 $("websiteOrderSummary").innerHTML="<div class=\"history-cards\">"+
   "<div><span>Customer</span><b>"+esc(cust?.name||"—")+"</b></div>"+
   "<div><span>Phone</span><b>"+esc(cust?.phone||"—")+"</b></div>"+
   "<div><span>Status</span><b>"+esc(o.status)+"</b></div>"+
   "<div><span>Total</span><b>"+money(o.total)+"</b></div>"+
   "<div><span>Order date & time</span><b>"+formatAccessDate(o.created_at)+"</b></div>"+
   "<div><span>Invoice</span><b>"+esc(invoiceNo)+"</b></div>"+
   "</div>";
 const gstText=Number(o.gst_amount||0)>0
   ? "GST: "+money(o.gst_amount)+" • "+(Number(o.igst_amount||0)>0?"IGST "+money(o.igst_amount):"CGST "+money(o.cgst_amount)+" + SGST "+money(o.sgst_amount))
   : "GST: Not charged";
 $("websiteOrderCustomer").innerHTML="<p><b>Business:</b> "+esc(cust?.business_name||"—")+"<br><b>Email:</b> "+esc(cust?.email||"—")+"<br><b>GSTIN:</b> "+esc(o.customer_gstin||cust?.gstin||"—")+"<br><b>Place of supply:</b> "+esc(o.place_of_supply||cust?.delivery_state||"—")+"<br><b>Delivery address:</b> "+esc(cust?.delivery_address||"—")+"<br><b>Placed:</b> "+esc(formatAccessDate(o.created_at))+"<br><b>"+gstText+"</b></p>";
 $("websiteOrderItems").innerHTML=table(["Product","Unit","Qty","Rate","Line total"],(items||[]).map(it=>[esc(it.product_name),esc(it.unit),it.qty,money(it.unit_price),money(it.line_total)]));
 $("websiteOrderNotes").textContent=o.notes||"No order note.";
 const invBtn=$("viewWebsiteInvoice");
 if(invBtn){
   invBtn.classList.toggle("hidden",!o.invoice_id);
   invBtn.onclick=()=>{
     if(!o.invoice_id)return;
     $("websiteOrderDialog").close();
     setTimeout(()=>window.viewInvoice(o.invoice_id),50);
   };
 }
 $("websiteOrderDialog").showModal();
};

$("closeWebsiteOrder").onclick=function(){$("websiteOrderDialog").close()};
function renderCustomers(){
 $("customersTable").innerHTML=table(["Customer","Business","Phone","Website account","Total purchases","Paid","Credit due","Last purchase","Action"],customers.map(x=>{
  const account=x.auth_user_id?"<span class='badge ok'>Website</span>":"—";
  const s=customerStats(x.id);
  return [esc(x.name),esc(x.business_name),esc(x.phone),account,money(s.totalPurchases),money(s.totalPaid),money(s.creditDue),s.lastPurchase?isoDate(s.lastPurchase):"—",
   "<button class=\"link\" onclick=\"viewCustomerHistory(\'"+x.id+"\')\">Purchase history</button> <button class=\"link\" onclick=\"editCustomer(\'"+x.id+"\')\">Edit</button> <button class=\"link danger\" onclick=\"deleteCustomer(\'"+x.id+"\')\">Remove</button>"];
 }));
 $("billingCustomer").innerHTML="<option value=\"\">New / enter customer</option>"+customers.map(x=>"<option value=\""+x.id+"\">"+esc(x.name)+(x.business_name?" — "+esc(x.business_name):"")+" ("+esc(x.phone)+")</option>").join("");
}
window.deleteCustomer=async function(id){
 const customer=customers.find(x=>x.id===id);if(!customer)return;
 const s=customerStats(id);
 const warning=s.bills.length
   ?"This customer has "+s.bills.length+" bill"+(s.bills.length===1?"":"s")+" and "+money(s.creditDue)+" credit due. The customer will be removed from the active list, while financial history is preserved."
   :"Remove this customer from the active customer list?";
 if(!confirm(warning))return;
 if(!isAdmin){
   const ok=await submitChange("customers","customer_delete","customers",id,{archived_at:new Date().toISOString()},"Employee customer removal");
   if(ok)await loadAll();
   return;
 }
 const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"customer",p_original_id:id});
 if(error)return toast(error.message||"Unable to remove customer.",false);
 toast("Customer moved to Recovery for 30 days");
 await loadAll();
};
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
 ["pname","punit","phsn","pcost","pstock","pdesc","pdetails"].forEach(id=>$(id).value="");
 $("pprice").value=349;$("plow").value=5;$("pimages").value="";$("pvideos").value="";
 $("productMedia").innerHTML="";$("productDialogTitle").textContent="Add New Product";
}
$("addProduct").onclick=()=>{resetProductForm();$("productDialog").showModal()};
window.editProduct=id=>{
 const p=products.find(x=>x.id===id);if(!p)return;editingProductId=id;
 $("pname").value=p.name||"";$("punit").value=p.unit||"";$("phsn").value=p.hsn_code||"";$("pprice").value=p.selling_price??349;$("pcost").value=p.cost_price??0;$("pstock").value=p.stock??0;$("plow").value=p.low_stock_threshold??5;
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
window.deleteProduct=async id=>{
  if(!confirm("Delete this product? This will remove it from the active product catalogue."))return;
  if(!isAdmin){
    const ok=await submitChange("products","product_delete","products",id,{},"Employee product deletion");
    if(ok)await loadAll();
    return;
  }
  const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"product",p_original_id:id});
  if(error)return toast(error.message||"Unable to delete product.",false);
  toast("Product moved to Recovery for 30 days");
  await loadAll();
};
window.deleteRawMaterial=async id=>{
  if(!confirm("Delete this raw material?"))return;
  if(!isAdmin){
    const ok=await submitChange("products","raw_material_delete","raw_materials",id,{},"Employee raw-material deletion");
    if(ok)await loadAll();
    return;
  }
  const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"raw_material",p_original_id:id});
  if(error)return toast(error.message||"Unable to delete raw material.",false);
  toast("Raw material moved to Recovery for 30 days");
  await loadAll();
};
window.removeProductMedia=async(id,type,encoded)=>{
 const p=products.find(x=>x.id===id);if(!p)return;const u=decodeURIComponent(encoded),key=type==="image"?"image_urls":"video_urls";
 const next=mediaUrls(p,key).filter(x=>x!==u);
 if(!isAdmin){await submitChange("products","product_media_update","products",id,{[key]:next},"Employee product media change");return;}
 const {error}=await db.from("products").update({[key]:next}).eq("id",id);if(error)return toast(error.message,false);toast("Media removed");await loadAll();const fresh=products.find(x=>x.id===id);if(fresh)renderProductMedia(fresh);
}
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("pname").value.trim(),price=+$("pprice").value,cost=+$("pcost").value,stock=+$("pstock").value,low=+$("plow").value,hsn=$("phsn").value.trim();
 if(!name)return toast("Enter product name",false);
 const old=editingProductId?products.find(p=>p.id===editingProductId):null;
 let image_urls=mediaUrls(old,"image_urls"),video_urls=mediaUrls(old,"video_urls");
 if(!isAdmin){
   const x={name,unit:$("punit").value.trim(),hsn_code:hsn,selling_price:price,cost_price:cost,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
   const ok=await submitChange("products",editingProductId?"product_update":"product_create","products",editingProductId,x,"Employee product change");
   if(ok)$("productDialog").close();
   return;
 }
 try{
  if($("pimages").files.length)image_urls=image_urls.concat(await uploadFiles($("pimages").files,"images"));
  if($("pvideos").files.length)video_urls=video_urls.concat(await uploadFiles($("pvideos").files,"videos"));
 }catch(err){return toast("Media upload failed: "+err.message,false)}
 const x={name,unit:$("punit").value.trim(),hsn_code:hsn,selling_price:price,cost_price:cost,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
 const q=editingProductId?db.from("products").update(x).eq("id",editingProductId):db.from("products").insert(x);
 const {error}=await q;if(error)return toast(error.message,false);$("productDialog").close();toast("Product saved");loadAll();
});

function resetRawForm(){editingRawId=null;$("rawName").value="";$("rawUnit").value="Kg";$("rawCost").value=0;$("rawStock").value=0;$("rawLow").value=5;$("rawDialogTitle").textContent="Add Raw Material"}
$("addRaw").onclick=()=>{resetRawForm();$("rawDialog").showModal()};
window.editRawMaterial=id=>{const r=rawMaterials.find(x=>x.id===id);if(!r)return;editingRawId=id;$("rawName").value=r.name||"";$("rawUnit").value=r.unit||"Kg";$("rawCost").value=r.cost_per_unit??0;$("rawStock").value=r.stock??0;$("rawLow").value=r.low_stock_threshold??5;$("rawDialogTitle").textContent="Edit Raw Material";$("rawDialog").showModal()};
$("rawForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const x={name:$("rawName").value.trim(),unit:$("rawUnit").value.trim(),cost_per_unit:+$("rawCost").value,stock:+$("rawStock").value,low_stock_threshold:+$("rawLow").value};
 if(!x.name)return toast("Enter raw material name",false);
 if(!isAdmin){
   const ok=await submitChange("products",editingRawId?"raw_material_update":"raw_material_create","raw_materials",editingRawId,x,"Employee raw-material change");
   if(ok)$("rawDialog").close();
   return;
 }
 const {data,error}=await db.rpc("save_raw_material_admin",{
   p_id:editingRawId||null,
   p_name:x.name,
   p_unit:x.unit,
   p_cost_per_unit:x.cost_per_unit,
   p_stock:x.stock,
   p_low_stock_threshold:x.low_stock_threshold
 });
 if(error)return toast(error.message||"Unable to save raw material.",false);
 $("rawDialog").close();
 toast(editingRawId?"Raw material updated":"Raw material saved");
 await loadAll();
});

function addLine(){
 const r=document.createElement("div");
 r.className="line modern-line";
 r.innerHTML=`<select class="lp">${products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.selling_price)} (${p.stock} in stock)</option>`).join("")}</select>
   <input class="lq" type="number" min="1" step="1" value="1" aria-label="Quantity">
   <input class="lr" type="number" min="0" step="0.01" value="${products[0]?.selling_price||0}" aria-label="Bill price">
   <span class="lv">₹0</span>
   <button type="button" class="remove" aria-label="Remove item">×</button>`;
 $("lines").appendChild(r);
 const select=r.querySelector(".lp");
 const rate=r.querySelector(".lr");
 select.onchange=()=>{
   const p=products.find(x=>x.id===select.value);
   if(p)rate.value=Number(p.selling_price||0).toFixed(2);
   calc();
 };
 r.querySelectorAll("input,select").forEach(x=>x.oninput=calc);
 r.querySelector(".remove").onclick=()=>{r.remove();calc()};
 calc();
}
function rebuildLines(){if(!$("lines").children.length&&products.length)addLine()}

$("addLine").onclick=addLine;
$("discount").oninput=calc;
$("gstPercent").oninput=calc;
$("billType").onchange=calc;
$("paymentType").onchange=()=>{syncPaymentInput();calc()};
$("payingNowInput").oninput=calc;
$("dueDate").oninput=updatePaymentFields;

$("billingCustomer").onchange=()=>{
 const c=customers.find(x=>x.id===$("billingCustomer").value);
 if(!c){
   ["billCustomerName","billCustomerBusiness","billCustomerPhone","billCustomerEmail","billCustomerGstin"].forEach(id=>$(id).textContent="—");
   $("selectedCustomerCard").classList.add("hidden");
   calc();
   return;
 }
 $("billCustomerName").textContent=c.name||"—";
 $("billCustomerBusiness").textContent=c.business_name||"—";
 $("billCustomerPhone").textContent=c.phone||"—";
 $("billCustomerEmail").textContent=c.email||"—";
 $("billCustomerGstin").textContent=c.gstin||"No GSTIN";
 $("selectedCustomerCard").classList.remove("hidden");
 calc();
};

function currentBillCustomer(){
 return customers.find(x=>x.id===$("billingCustomer").value)||null;
}
function paymentState(total){
 const type=$("paymentType")?.value||"CASH";
 const bill=Number(total||0);
 if(type==="CASH"||type==="ONLINE")return {type,method:type==="CASH"?"Cash":"Online",status:"Paid",paid:bill,due:0,dueDate:null};
 if(type==="CREDIT")return {type,method:"Credit",status:"Credit",paid:0,due:bill,dueDate:$("dueDate").value||null};
 let paid=Math.min(bill,Math.max(0,Number($("payingNowInput").value||0)));
 return {type,method:"Half / Part Payment",status:paid>=bill?"Paid":paid>0?"Part Paid":"Credit",paid,due:Math.max(0,bill-paid),dueDate:$("dueDate").value||null};
}
function syncPaymentInput(){
 const type=$("paymentType")?.value||"CASH";
 const input=$("payingNowInput");
 if(!input)return;
 if(type==="HALF"){
   input.classList.remove("hidden");
   if(!Number.isFinite(Number(input.value))||Number(input.value)<=0)input.value=(billTotal/2).toFixed(2);
   input.removeAttribute("readonly");
 }else{
   input.classList.add("hidden");
   input.setAttribute("readonly","readonly");
   const state=paymentState(billTotal);
   input.value=state.paid.toFixed(2);
 }
}
function updatePaymentFields(){
 const state=paymentState(billTotal);
 const needsDue=state.due>0;
 $("billDueDateWrap").classList.toggle("hidden",!needsDue);
 if(!needsDue)$("dueDate").value="";
 $("payingNowShow").textContent=money(state.paid);
 $("creditAmountShow").textContent=money(state.due);
 if($("payingNowInput")&&!$("payingNowInput").classList.contains("hidden")){
   const max=billTotal;
   let v=Math.min(max,Math.max(0,Number($("payingNowInput").value||0)));
   $("payingNowInput").value=v.toFixed(2);
 }
 $("paymentPreview").textContent=billTotal
   ?state.status+" • Paying now "+money(state.paid)+" • Credit "+money(state.due)
   :"Add items to calculate payment";
}
function calc(){
 let subtotal=0;
 document.querySelectorAll(".line").forEach(r=>{
   const p=products.find(x=>x.id===r.querySelector(".lp").value);
   const q=Math.max(0,Number(r.querySelector(".lq").value)||0);
   const rate=Math.max(0,Number(r.querySelector(".lr").value)||0);
   const v=rate*q;
   subtotal+=v;
   r.querySelector(".lv").textContent=money(v);
 });
 const discount=Math.min(subtotal,Math.max(0,Number($("discount").value)||0));
 const taxable=Math.max(0,subtotal-discount);
 const customer=currentBillCustomer();
 const isGst=$("billType").value==="GST";
 const gstin=isGst?String(customer?.gstin||"").trim().toUpperCase():"";
 const gp=isGst?(Number($("gstPercent").value)||0):0;
 const gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin?gstin.slice(0,2)==="36":false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 billTotal=total;
 $("subtotal").textContent=money(subtotal);
 $("discountShow").textContent=money(discount);
 $("gstShow").textContent=`${gp}% • ${money(gst)}`;
 $("total").textContent=money(total);
 $("gstRateWrap").classList.toggle("hidden",!isGst);
 $("taxBreakdown").classList.toggle("hidden",!isGst);
 if(isGst&&gstin){
   $("taxBreakdown").innerHTML=intraState
    ?`<div>CGST ${cgstPercent}%: <strong>${money(cgstAmount)}</strong></div><div>SGST ${sgstPercent}%: <strong>${money(sgstAmount)}</strong></div>`
    :`<div>IGST ${igstPercent}%: <strong>${money(igstAmount)}</strong></div>`;
 }else if(isGst){
   $("taxBreakdown").innerHTML='<div class="tax-warning">GST Bill selected — customer GSTIN is required.</div>';
 }else $("taxBreakdown").innerHTML="";
 syncPaymentInput();
 updatePaymentFields();
}
$("clearBill").onclick=()=>{
 $("billForm").reset();
 $("billingCustomer").value="";
 $("documentType").value="SALE";
 $("billType").value="NON_GST";
 const paymentBox=document.querySelector(".payment-box"); if(paymentBox)paymentBox.classList.remove("hidden");
 $("paymentType").value="CASH";
 $("gstPercent").value="18";
 ["billCustomerName","billCustomerBusiness","billCustomerPhone","billCustomerEmail","billCustomerGstin"].forEach(id=>$(id).textContent="—");
 $("selectedCustomerCard").classList.add("hidden");
 $("lines").innerHTML="";
 billTotal=0;
 calc();
 rebuildLines();
};

$("documentType").onchange=()=>{
 const isQuotation=$("documentType").value==="QUOTATION";
 const payBox=document.querySelector(".payment-box");
 if(payBox)payBox.classList.toggle("hidden",isQuotation);
 if(isQuotation){
   $("paymentType").value="CASH";
   $("payingNowInput").value="0";
 }
 calc();
};
$("billForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const customer=currentBillCustomer();
 if(!customer)return toast("Select an existing customer first. Add the customer in Customers, then create the invoice.",false);
 const name=customer.name||"",business=customer.business_name||"",phone=normalizePhone(customer.phone||""),email=customer.email||"";
 const customerGstin=String(customer.gstin||"").trim().toUpperCase();
 const documentType=$("documentType").value||"SALE";
 const isQuotation=documentType==="QUOTATION";
 const billType=$("billType").value;
 if(!["SALE","QUOTATION"].includes(documentType))return toast("Invalid document type.",false);
 if(!validPhone(phone))return toast("The customer phone number must be exactly 10 digits.",false);
 if(billType==="GST"&&!validGstin(customerGstin))return toast("This customer does not have a valid GSTIN. Add the GSTIN in Customer data first.",false);
 const gstin=billType==="GST"?customerGstin:"";
 const gp=billType==="GST"?(+$("gstPercent").value||0):0;
 if(billType==="GST"&&!(gp>0&&gp<=100))return toast("Enter a valid GST rate for this GST bill.",false);

 const items=[...document.querySelectorAll(".line")].map(r=>{
   const p=products.find(x=>x.id===r.querySelector(".lp").value);
   return {p,q:+r.querySelector(".lq").value||0,rate:Math.max(0,+r.querySelector(".lr").value||0)};
 }).filter(x=>x.p&&x.q>0);
 if(!items.length)return toast("Add an item",false);
 if(!isQuotation)for(const x of items)if(x.q>x.p.stock)return toast(`${x.p.name}: only ${x.p.stock} cans in stock`,false);

 const subtotal=items.reduce((a,x)=>a+x.rate*x.q,0);
 const discount=Math.min(subtotal,Math.max(0,+$("discount").value||0));
 const taxable=subtotal-discount;
 const gst=taxable*gp/100,total=taxable+gst;
 const intraState=gstin?gstin.slice(0,2)==="36":false;
 const cgstPercent=intraState?gp/2:0,cgstAmount=taxable*cgstPercent/100;
 const sgstPercent=intraState?gp/2:0,sgstAmount=taxable*sgstPercent/100;
 const igstPercent=(!intraState&&gstin)?gp:0,igstAmount=taxable*igstPercent/100;
 const profit=items.reduce((a,x)=>a+(x.rate-x.p.cost_price)*x.q,0)-discount;
 const pay=isQuotation?{status:"Quotation",paid:0,due:0,dueDate:null,method:"Quotation"}:paymentState(total);
 const storedProfit=isQuotation?0:profit;
 const stamp=new Date().toISOString().slice(0,10).replaceAll("-","");
 const no=(isQuotation?"QT-":"CC-")+stamp+"-"+String(Date.now()).slice(-5);

 if(!isAdmin){
   const payload={
     invoice_no:no,document_type:documentType,customer_id:customer.id,customer_name:name,customer_phone:phone,gstin,customer_business:business,customer_email:email,
     billing_address:customer.billing_address||"",delivery_address:customer.delivery_address||"",
     subtotal,discount,gst_percent:gp,gst_amount:gst,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,total,profit:storedProfit,
     payment_status:pay.status,paid_amount:pay.paid,due_amount:pay.due,due_date:pay.dueDate,payment_method:pay.method,
     items:items.map(x=>({product_id:x.p.id,product_name:x.p.name,qty:x.q,unit_price:x.rate,cost_price:x.p.cost_price,line_total:x.rate*x.q,line_profit:isQuotation?0:(x.rate-x.p.cost_price)*x.q}))
   };
   const ok=await submitChange("billing","invoice_create","invoices",null,payload,isQuotation?"Employee quotation submitted for manager approval":"Employee bill submitted for manager approval");
   if(ok){$("billForm").reset();$("documentType").value="SALE";const paymentBox=document.querySelector(".payment-box");if(paymentBox)paymentBox.classList.remove("hidden");$("lines").innerHTML="";rebuildLines();}
   return;
 }

 const inv=await db.from("invoices").insert({
   invoice_no:no,document_type:documentType,customer_id:customer.id,customer_name:name,customer_phone:phone,customer_business:business,customer_email:email,gstin,
   billing_address:customer.billing_address||"",delivery_address:customer.delivery_address||"",
   subtotal,discount,gst_percent:gp,gst_amount:gst,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,
   total,profit:storedProfit,payment_status:pay.status,paid_amount:pay.paid,due_amount:pay.due,due_date:pay.dueDate,payment_method:pay.method
 }).select().single();
 if(inv.error)return toast(inv.error.message,false);
 if(!isQuotation&&pay.paid>0){
   const payRow=await db.from("payments").insert({invoice_id:inv.data.id,customer_id:customer.id,amount:pay.paid,payment_date:dateKey(),payment_method:pay.method,notes:"Initial payment"});
   if(payRow.error)return toast(payRow.error.message,false);
 }
 for(const x of items){
   const a=await db.from("invoice_items").insert({invoice_id:inv.data.id,product_id:x.p.id,product_name:x.p.name,hsn_code:x.p.hsn_code||"",qty:x.q,unit_price:x.rate,cost_price:x.p.cost_price,line_total:x.rate*x.q,line_profit:isQuotation?0:(x.rate-x.p.cost_price)*x.q});
   if(a.error)return toast(a.error.message,false);
   if(!isQuotation){
     const b=await db.from("products").update({stock:Number(x.p.stock)-x.q}).eq("id",x.p.id);
     if(b.error)return toast(b.error.message,false);
   }
 }
 const savedInv=inv.data;
 if(isQuotation){
   toast("Quotation "+no+" saved successfully");
   await loadAll();
   rebuildLines();
   await window.viewInvoice(savedInv.id);
 }else{
   toast("Invoice "+no+" saved successfully");
   sendBillToCustomer(savedInv,customer,items);
   await loadAll();
   rebuildLines();
 }
 $("billForm").reset();$("documentType").value="SALE";const paymentBox=document.querySelector(".payment-box");if(paymentBox)paymentBox.classList.remove("hidden");$("lines").innerHTML="";await loadAll();rebuildLines();
});
$("salesFrom").onchange=renderSales;$("salesTo").onchange=renderSales;$("clearSalesFilter").onclick=()=>{$("salesFrom").value="";$("salesTo").value="";renderSales()};
$("addCustomer").onclick=()=>{resetCustomerForm();$("customerDialog").showModal()};
function composeAddress(prefix){
 const parts=[
   $(prefix+"ShopNo").value.trim(),
   $(prefix+"Colony").value.trim(),
   $(prefix+"City").value.trim(),
   $(prefix+"State").value.trim(),
   $(prefix+"Pincode").value.trim()
 ].filter(Boolean);
 return parts.join(", ");
}
function fillAddressFields(prefix,c,legacy){
 const fields=["ShopNo","Colony","City","State","Pincode"];
 const vals=[
   c[prefix==="billing"?"billing_shop_no":"delivery_shop_no"],
   c[prefix==="billing"?"billing_colony":"delivery_colony"],
   c[prefix==="billing"?"billing_city":"delivery_city"],
   c[prefix==="billing"?"billing_state":"delivery_state"],
   c[prefix==="billing"?"billing_pincode":"delivery_pincode"]
 ];
 if(!vals.some(Boolean)&&legacy)vals[1]=legacy;
 fields.forEach((f,i)=>$(prefix+f).value=vals[i]||"");
}

$("addCustomer").onclick=()=>{resetCustomerForm();$("customerDialog").showModal()};
function resetCustomerForm(){
 editingCustomerId=null;
 ["customerName","businessName","customerPhone","customerEmail","customerGstin",
  "billingShopNo","billingColony","billingCity","billingState","billingPincode",
  "deliveryShopNo","deliveryColony","deliveryCity","deliveryState","deliveryPincode"
 ].forEach(id=>$(id).value="");
 $("customerDialogTitle").textContent="Add New Customer";
}
window.editCustomer=id=>{
 const c=customers.find(x=>x.id===id);if(!c)return;
 editingCustomerId=id;
 $("customerName").value=c.name||"";
 $("businessName").value=c.business_name||"";
 $("customerPhone").value=c.phone||"";
 $("customerEmail").value=c.email||"";
 $("customerGstin").value=c.gstin||"";
 fillAddressFields("billing",c,c.billing_address||"");
 fillAddressFields("delivery",c,c.delivery_address||"");
 $("customerDialogTitle").textContent="Edit Customer";
 $("customerDialog").showModal();
};
$("customerPhone").oninput=e=>e.target.value=e.target.value.replace(/\D/g,"").slice(0,10);
$("customerGstin").oninput=e=>e.target.value=e.target.value.toUpperCase().slice(0,15);

$("customerForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const phone=normalizePhone($("customerPhone").value),gstin=$("customerGstin").value.trim().toUpperCase();
 if(!validPhone(phone))return toast("Phone must be exactly 10 digits and start with 6-9",false);
 if(!validGstin(gstin))return toast("Enter a valid 15-character GSTIN",false);
 const x={
   name:$("customerName").value.trim(),
   business_name:$("businessName").value.trim(),
   phone,
   email:$("customerEmail").value.trim(),
   gstin,
   billing_shop_no:$("billingShopNo").value.trim(),
   billing_colony:$("billingColony").value.trim(),
   billing_city:$("billingCity").value.trim(),
   billing_state:$("billingState").value.trim(),
   billing_pincode:$("billingPincode").value.trim(),
   delivery_shop_no:$("deliveryShopNo").value.trim(),
   delivery_colony:$("deliveryColony").value.trim(),
   delivery_city:$("deliveryCity").value.trim(),
   delivery_state:$("deliveryState").value.trim(),
   delivery_pincode:$("deliveryPincode").value.trim()
 };
 if(!x.name)return toast("Enter customer name",false);
 x.billing_address=composeAddress("billing");
 x.delivery_address=composeAddress("delivery");

 if(!isAdmin){
   const ok=await submitChange("customers",editingCustomerId?"customer_update":"customer_create","customers",editingCustomerId,x,"Employee customer change");
   if(ok)$("customerDialog").close();
   return;
 }
 const q=editingCustomerId
   ?db.from("customers").update(x).eq("id",editingCustomerId)
   :db.from("customers").insert(x);
 const {error}=await q;
 if(error)return toast(error.message,false);
 $("customerDialog").close();
 toast("Customer saved");
 await loadAll();
});
$("addEnquiry").onclick=()=>$("enquiryDialog").showModal();
$("enquiryForm").addEventListener("submit",async e=>{e.preventDefault();const payload={name:$("ename").value.trim(),phone:$("ephone").value.trim(),business:$("ebusiness").value.trim(),message:$("emessage").value.trim(),status:$("estatus").value};if(!isAdmin){const ok=await submitChange("enquiries","enquiry_create","enquiries",null,payload,"Employee lead/enquiry change");if(ok)$("enquiryDialog").close();return} const {error}=await db.from("enquiries").insert(payload);if(error)return toast(error.message,false);$("enquiryDialog").close();toast("Enquiry saved");loadAll()});
$("export").onclick=()=>{const rows=[["Invoice","Customer","Phone","Subtotal","Discount","GST %","GST Amount","Total","Profit","Paid","Credit","Payment Status","Due Date","Date"],...invoices.filter(isSaleDocument).map(x=>[x.invoice_no,x.customer_name,x.customer_phone,x.subtotal,x.discount,x.gst_percent||0,x.gst_amount||0,x.total,x.profit,x.paid_amount||0,x.due_amount||0,x.payment_status||"Credit",x.due_date||"",x.created_at])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="cleancore-sales.csv";a.click()};

document.addEventListener("click",e=>{
 const btn=e.target.closest?.(".view-bill");
 if(btn){e.preventDefault();window.viewInvoice(btn.dataset.invoiceId);}
 const quoteBtn=e.target.closest?.(".view-quotation");
 if(quoteBtn){e.preventDefault();window.viewInvoice(quoteBtn.dataset.invoiceId);}
});
async function loadInvoiceItemsForView(invoice){
  let q=await db.from("invoice_items").select("*").eq("invoice_id",invoice.id).order("created_at");
  if(q.error)throw q.error;
  if(Array.isArray(q.data)&&q.data.length)return q.data;

  // Website-created invoices may have their line items stored with the originating order.
  const wo=websiteOrders.find(x=>x.invoice_id===invoice.id)||null;
  if(wo){
    const wq=await db.from("website_order_items").select("*").eq("order_id",wo.id).order("created_at");
    if(wq.error)throw wq.error;
    return (wq.data||[]).map(it=>({
      product_name:it.product_name,
      hsn_code:it.hsn_code||"",
      qty:it.qty,
      unit_price:it.unit_price,
      line_total:it.line_total
    }));
  }
  return [];
}
window.viewInvoice=async id=>{
 const inv=invoices.find(x=>x.id===id);
 if(!inv)return toast("Invoice not found. Refresh Manager data and try again.",false);
 try{
   const items=await loadInvoiceItemsForView(inv);
   const hasGst=Number(inv.gst_amount||0)>0;
   const isQuotation=isQuotationDocument(inv);
   const intra=Number(inv.cgst_amount||0)>0 || Number(inv.sgst_amount||0)>0;
   const cgst=Number(inv.cgst_amount||0),sgst=Number(inv.sgst_amount||0),igst=Number(inv.igst_amount||0);
   const taxRows=intra
    ? "<tr><td colspan='5' class='tax-label'>CGST ("+Number(inv.cgst_percent||0)+"%)</td><td>"+money(cgst)+"</td></tr><tr><td colspan='5' class='tax-label'>SGST ("+Number(inv.sgst_percent||0)+"%)</td><td>"+money(sgst)+"</td></tr>"
    : (igst>0 ? "<tr><td colspan='5' class='tax-label'>IGST ("+Number(inv.igst_percent||0)+"%)</td><td>"+money(igst)+"</td></tr>" : "");
   const rows=items.map((it,n)=>"<tr><td>"+(n+1)+"</td><td>"+esc(it.product_name)+"</td><td>"+esc(it.hsn_code||"—")+"</td><td>"+it.qty+"</td><td>"+money(it.unit_price)+"</td><td>"+money(it.line_total)+"</td></tr>").join("");
   const taxable=Number(inv.subtotal||0)-Number(inv.discount||0);
   const date=new Date(inv.created_at);
   const gstLabel=documentLabel(inv);
   const billingAddress=inv.billing_address||"—";
   const deliveryAddress=inv.delivery_address||"—";
   const metaStatus=isQuotation
     ? "<b>Document Type:</b> Quotation Invoice<br><b>Payment Status:</b> Not applicable<br><b>Paid:</b> —<br><b>Credit Due:</b> —"
     : "<b>Place of Supply:</b> "+esc(inv.place_of_supply||"Telangana")+"<br><b>Payment Status:</b> "+esc(inv.payment_status||"Credit")+"<br><b>Paid:</b> "+money(inv.paid_amount)+"<br><b>Credit Due:</b> "+money(inv.due_amount)+(inv.due_date?"<br><b>Due Date:</b> "+isoDate(inv.due_date):"");
   const quoteNote=isQuotation
     ? "<div class='quote-note'><b>QUOTATION ONLY — NOT A SALE / NOT A TAX INVOICE.</b><br>This document is a price quotation and does not record a sale, payment, or stock movement.</div>"
     : "";
   const terms=isQuotation
     ? "<b>Quotation Terms</b><p>Prices are quoted for the listed items and quantities.<br>This quotation is subject to final confirmation before sale.</p>"
     : "<b>Terms & Conditions</b><p>Goods once sold will not be taken back unless agreed in writing.<br>Payment as per agreed business terms.<br>Subject to Hyderabad, Telangana jurisdiction.</p>";
   const footerMark=isQuotation?"FOR QUOTATION":"ORIGINAL FOR RECIPIENT";
   $("invoicePreview").innerHTML="<div class='invoice-preview'>"+
    "<div class='inv-header'><div><img class='invoice-logo' src='logo.svg' alt='CleanCore logo'><div class='inv-brand'>CleanCore Chemical & Cleaning</div><div class='inv-sub'>Manufacturing & Supply of Cleaning Chemicals</div><div>Hyderabad, Telangana, India</div><div>Phone: +91 91827 25773</div><div>Email: "+BUSINESS_EMAIL+"</div></div><div class='inv-title'><b>"+gstLabel+"</b><span>"+footerMark+"</span></div></div>"+
    "<div class='inv-meta'><div><b>Document No:</b> "+esc(inv.invoice_no)+"<br><b>Date:</b> "+date.toLocaleDateString("en-IN")+"</div><div>"+metaStatus+"</div></div>"+
    "<div class='inv-parties'><div><b>BILL FROM</b><p><strong>CleanCore Chemical & Cleaning</strong><br>Hyderabad, Telangana<br>Phone: +91 91827 25773<br>Email: "+BUSINESS_EMAIL+"<br>GSTIN: —</p></div><div><b>BILL TO</b><p><strong>"+esc(inv.customer_business||inv.customer_name||"—")+"</strong><br>"+esc(inv.customer_name||"—")+"<br>Phone: "+esc(inv.customer_phone||"—")+"<br>Email: "+esc(inv.customer_email||"—")+"<br>GSTIN: "+esc(inv.gstin||"—")+"<br>Billing: "+esc(billingAddress)+"<br>Delivery: "+esc(deliveryAddress)+"</p></div></div>"+
    "<table class='invoice-items'><thead><tr><th>S.No.</th><th>Product / Service</th><th>HSN / SAC</th><th>Qty</th><th>Rate</th><th>Taxable Value</th></tr></thead><tbody>"+rows+
    "<tr class='subtotal-row'><td colspan='5'>Subtotal</td><td>"+money(inv.subtotal)+"</td></tr>"+(Number(inv.discount||0)>0?"<tr><td colspan='5' class='tax-label'>Discount</td><td>- "+money(inv.discount)+"</td></tr>":"")+"<tr><td colspan='5' class='tax-label'>Taxable Value</td><td>"+money(taxable)+"</td></tr>"+taxRows+
    "<tr class='grand-total'><td colspan='5'>TOTAL</td><td>"+money(inv.total)+"</td></tr></tbody></table>"+
    quoteNote+
    "<div class='amount-words'><b>Total in words:</b> "+esc(numberToWordsIndian(Number(inv.total||0)))+" ONLY</div>"+
    "<div class='inv-bottom'><div>"+terms+"</div><div class='signature'><span>For CleanCore Chemical & Cleaning</span><br><br><b>Authorised Signature</b></div></div>"+
    "</div>";
   $("invoiceDialog").showModal();
 }catch(err){console.error("Invoice viewer error",err);toast(err?.message||"Unable to open invoice.",false);}
};
function buildCustomerBillMessage(inv,customer,items=[]){
 const itemLines=items.map(x=>"• "+(x.p?.name||x.product_name||"Item")+" × "+(x.q||x.qty||1)+" @ "+money(x.p?.selling_price||x.unit_price||0)+" = "+money(x.p?(x.p.selling_price*x.q):x.line_total));
 return [
  "CleanCore Chemical & Cleaning",
  "INVOICE: "+inv.invoice_no,
  "Date: "+new Date(inv.created_at).toLocaleDateString("en-IN"),
  "Customer: "+(inv.customer_name||customer?.name||""),
  "",
  ...(itemLines.length?itemLines:["Items: —"]),
  "",
  "Subtotal: "+money(inv.subtotal),
  "Discount: "+money(inv.discount||0),
  "GST: "+money(inv.gst_amount||0),
  "Total: "+money(inv.total),
  "Paid: "+money(inv.paid_amount||0),
  "Credit Due: "+money(inv.due_amount||0),
  "Status: "+(inv.payment_status||"Credit"),
  "",
  "CleanCore Chemical & Cleaning",
  "+91 91827 25773",
  "cleancorehyd@gmail.com"
 ].join("\n");
}
function sendBillToCustomer(inv,customer,items){
 const phone=normalizePhone(customer?.phone||inv?.customer_phone||"");
 const email=String(customer?.email||inv?.customer_email||"").trim();
 const msg=buildCustomerBillMessage(inv,customer,items);
 const hasPhone=phoneRE.test(phone),hasEmail=!!email;
 let opened=0;

 if(hasPhone){
   const wa="https://wa.me/91"+phone+"?text="+encodeURIComponent(msg);
   const w=window.open(wa,"_blank","noopener,noreferrer");
   if(w)opened++;
 }
 if(hasEmail){
   const subject="CleanCore Invoice "+inv.invoice_no;
   const mail="mailto:"+email+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(msg);
   const m=window.open(mail,"_blank");
   if(m)opened++;
 }

 const destinations=[];
 if(hasPhone)destinations.push("WhatsApp");
 if(hasEmail)destinations.push("Email");
 const n=$("billSendNotice");
 if(n){
   n.classList.remove("hidden");
   n.innerHTML=destinations.length
     ? "<strong>Invoice "+esc(inv.invoice_no)+" saved.</strong> "+destinations.join(" + ")+" opened with the bill details. Review and press Send in the opened app."
     : "<strong>Invoice "+esc(inv.invoice_no)+" saved.</strong> No customer WhatsApp number or email was provided.";
 }
 if(opened===0&&destinations.length)toast("Bill saved, but your browser blocked the WhatsApp/email window.",false);
}
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
function getPrintableInvoiceHtml(){
 const body=$("invoicePreview")?.innerHTML?.trim();
 if(!body)throw new Error("Open a bill before printing.");
 return body;
}
function printInvoiceNow(){
 const body=getPrintableInvoiceHtml();
 const w=window.open("about:blank","_blank","width=900,height=1100");
 if(!w)throw new Error("Allow pop-ups for CleanCore Manager to print the invoice.");
 const cssHref=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>x.href&&x.href.includes("style.css"))?.href||"style.css";
 w.document.open();
 w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>CleanCore Invoice</title><link rel='stylesheet' href='"+String(cssHref).replace(/'/g,"%27")+"'><style>@page{size:A4;margin:10mm}body{margin:0;background:#fff}.invoice-preview{display:block!important;max-width:none!important;width:100%!important}.actions{display:none!important}@media print{html,body{background:#fff!important}.invoice-preview{box-shadow:none!important;border:0!important}}</style></head><body><div id='invoicePrintHost'>"+body+"</div></body></html>");
 w.document.close();
 let printed=false;
 const doPrint=()=>{
   if(printed||w.closed)return;
   printed=true;
   w.focus();
   setTimeout(()=>w.print(),80);
 };
 w.addEventListener("load",doPrint,{once:true});
 setTimeout(doPrint,400);
}
$("printInvoice").onclick=e=>{
 e.preventDefault();
 try{printInvoiceNow();}
 catch(err){console.error("Invoice print error",err);toast(err?.message||"Unable to print invoice.",false);}
};
$("profileBtn").onclick=()=>{
 $("notificationMenu")?.classList.add("hidden");
 $("profileEmail").textContent=user?.email||"";
 $("profileMenu").classList.toggle("hidden");
};
$("profileChangePassword").onclick=()=>{ $("profileMenu").classList.add("hidden"); $("passwordBox").classList.remove("hidden"); go("settings"); };
$("profileLogout").onclick=async()=>{stopWebsiteNotifications();clearManagerLoginWindow();await db.auth.signOut({scope:"local"});location.reload()};
$("changePassword").onclick=()=>$("passwordBox").classList.toggle("hidden");
$("sendReauth").onclick=async()=>{const {error}=await db.auth.reauthenticate();if(error)return toast(error.message,false);toast("Reauthentication OTP sent to your email.")};
$("updatePw").onclick=async()=>{const current_password=$("currentPw").value,password=$("newPw").value,nonce=$("reauthCode")?.value.trim();if(password.length<12)return toast("Use at least 12 characters",false);if(!nonce)return toast("Enter the reauthentication OTP",false);const {error}=await db.auth.updateUser({password,current_password,nonce});if(error)return toast(error.message,false);toast("Password updated");$("passwordBox").classList.add("hidden")};

// Manager login policy:
// - Installed Manager app: stay signed in for 7 days.
// - Normal browser/web link: require login again after every page reload.
// The installed app is launched with ?app=1 via the manifest.
var MANAGER_LOGIN_TTL_MS=7*24*60*60*1000;
var MANAGER_LOGIN_EXPIRY_KEY="cleancore_manager_login_expiry";
var managerExpiryTimer=null;

function isStandaloneManagerApp(){
 const params=new URLSearchParams(location.search);
 return params.get("app")==="1" ||
   !!(window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches ||
      window.navigator.standalone===true);
}
function clearManagerLoginWindow(){
 clearTimeout(managerExpiryTimer);
 managerExpiryTimer=null;
 localStorage.removeItem(MANAGER_LOGIN_EXPIRY_KEY);
}
function startManagerLoginWindow(){
 if(!isStandaloneManagerApp()){
   clearManagerLoginWindow();
   return;
 }
 const expiresAt=Date.now()+MANAGER_LOGIN_TTL_MS;
 localStorage.setItem(MANAGER_LOGIN_EXPIRY_KEY,String(expiresAt));
 armManagerExpiryTimer();
}
function armManagerExpiryTimer(){
 clearTimeout(managerExpiryTimer);
 managerExpiryTimer=null;
 if(!isStandaloneManagerApp())return;
 const expiresAt=Number(localStorage.getItem(MANAGER_LOGIN_EXPIRY_KEY)||0);
 if(!expiresAt)return;
 const remaining=expiresAt-Date.now();
 if(remaining<=0){forceManagerExpiry();return;}
 managerExpiryTimer=setTimeout(forceManagerExpiry,remaining);
}
async function forceManagerExpiry(){
 clearManagerLoginWindow();
 try{await db.auth.signOut({scope:"local"})}catch(err){console.warn("Manager sign out:",err)}
 user=null;
 $("loginView").classList.remove("hidden");
 $("appView").classList.add("hidden");
}
async function restoreManagerSession(){
 if(!isStandaloneManagerApp()){
   clearManagerLoginWindow();
   try{await db.auth.signOut({scope:"local"})}catch(err){console.warn("Web session cleanup:",err)}
   $("loginView").classList.remove("hidden");
   $("appView").classList.add("hidden");
   return;
 }
 const {data,error}=await db.auth.getSession();
 if(error){console.warn("Manager session check:",error.message);return;}
 if(!data?.session)return;
 let expiresAt=Number(localStorage.getItem(MANAGER_LOGIN_EXPIRY_KEY)||0);
 if(!expiresAt){
   startManagerLoginWindow();
   expiresAt=Number(localStorage.getItem(MANAGER_LOGIN_EXPIRY_KEY)||0);
 }
 if(!expiresAt||Date.now()>=expiresAt){await forceManagerExpiry();return;}
 user=data.session.user;
 try{
   await enter();
   armManagerExpiryTimer();
 }catch(err){
   console.error("Manager session restore failed",err);
   toast(err?.message||"Unable to restore the Manager session.",false);
 }
}
bindRefreshControls();
bindWebsiteNotificationUi();
restoreManagerSession().catch(err=>console.error('Manager session restore error',err));
