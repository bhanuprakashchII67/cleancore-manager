const SUPABASE_URL="https://rwfamxkfqslorxcryjrp.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_tzfe2xVn6OAwF-Mh5_u_zQ_a_bAW7tO"; const BUSINESS_EMAIL="cleancorehyd@gmail.com", BUSINESS_ADDRESS="Srinivasa Colony, Manikonda, Hyderabad, Telangana, India";
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
let errorLogs=[];
let editingProductId=null, editingCustomerId=null, editingRawId=null, editingExpenseId=null, investments=[]; let billTotal=0;

const MANAGER_VERSION="3.8.63";
let lastUserAction=null;
function captureUserAction(type,target){const el=target?.closest?.("button,input,select,textarea,a,[role='button']")||target;lastUserAction={type,tag:el?.tagName||"",id:el?.id||"",name:el?.getAttribute?.("name")||"",text:String(el?.innerText||el?.value||el?.getAttribute?.("aria-label")||"").trim().slice(0,300),at:new Date().toISOString()};}
document.addEventListener("click",e=>captureUserAction("click",e.target),true);
document.addEventListener("change",e=>captureUserAction("change",e.target),true);
document.addEventListener("submit",e=>captureUserAction("submit",e.target),true);
function errorQueueRead(){try{const q=JSON.parse(localStorage.getItem("cleancore_error_queue")||"[]");return Array.isArray(q)?q:[];}catch{return [];}}
function errorQueueWrite(q){try{localStorage.setItem("cleancore_error_queue",JSON.stringify(q.slice(-20)));}catch{}}
async function sendClientError(payload){try{const {error}=await db.rpc("log_client_error",payload);if(error)throw error;return true;}catch(err){const q=errorQueueRead();q.push({...payload,queued_at:new Date().toISOString(),logger_error:String(err?.message||err)});errorQueueWrite(q);console.warn("Error Finder could not save error; queued locally:",err?.message||err);return false;}}
async function flushErrorQueue(){const q=errorQueueRead();if(!q.length)return;const remaining=[];for(const payload of q){try{const {error}=await db.rpc("log_client_error",payload);if(error)throw error;}catch{remaining.push(payload);}}errorQueueWrite(remaining);}
function reportClientError(err,meta={}){const e=err instanceof Error?err:new Error(String(err||"Unknown error"));const payload={p_app_name:meta.app_name||"CleanCore Manager",p_app_version:MANAGER_VERSION,p_page:location.pathname.split("/").pop()||"index.html",p_url:location.href,p_action:meta.action||"unhandled_error",p_error_name:e.name||"Error",p_message:String(e.message||e).slice(0,4000),p_stack:String(e.stack||"").slice(0,12000),p_context:{...(meta.context||{}),last_user_action:lastUserAction},p_user_agent:navigator.userAgent};void sendClientError(payload);}
function toast(m,ok=true,meta={}){const t=$("toast");t.textContent=m;t.className="toast show "+(ok?"ok":"bad");setTimeout(()=>t.className="toast",3200);if(!ok)reportClientError(new Error(String(m)),{action:meta.action||"toast_error",context:meta.context||{}});}
const nativeConsoleError=console.error.bind(console);
console.error=(...args)=>{nativeConsoleError(...args);let message="";try{message=args.map(x=>x instanceof Error?x.message:(typeof x==="string"?x:JSON.stringify(x))).join(" ").slice(0,4000);}catch{message="Console error";}const first=args.find(x=>x instanceof Error);reportClientError(first||new Error(message),{action:"console_error",context:{console_arguments:message}});};
window.addEventListener("error",e=>reportClientError(e.error||new Error(e.message||"Unhandled browser error"),{action:"window_error",context:{source:e.filename||"",line:e.lineno||0,column:e.colno||0}}));
window.addEventListener("unhandledrejection",e=>reportClientError(e.reason||new Error("Unhandled promise rejection"),{action:"unhandled_rejection"}));
setTimeout(flushErrorQueue,1500);

const NOTIFICATION_DEFAULTS={notifications_enabled:true,sound_enabled:true,desktop_enabled:false,website_orders:true,website_enquiries:true,employee_access_requests:true,employee_change_requests:true,restricted_access_attempts:true,low_stock_alerts:true,payments_received:true,credit_due_alerts:true};
let notificationPreferences={...NOTIFICATION_DEFAULTS};

function notificationAllowed(type){
 return notificationPreferences.notifications_enabled!==false && notificationPreferences[type]!==false;
}
function renderNotificationSettings(){
 const map={notifEnabled:"notifications_enabled",notifSound:"sound_enabled",notifDesktop:"desktop_enabled",notifWebsiteOrders:"website_orders",notifWebsiteEnquiries:"website_enquiries",notifEmployeeAccess:"employee_access_requests",notifEmployeeChanges:"employee_change_requests",notifRestrictedAccess:"restricted_access_attempts",notifLowStock:"low_stock_alerts",notifPayments:"payments_received",notifCreditDue:"credit_due_alerts"};
 Object.entries(map).forEach(([id,key])=>{const el=$(id);if(el)el.checked=notificationPreferences[key]!==false;});
 const st=$("notificationSettingsStatus");if(st)st.textContent=notificationPreferences.desktop_enabled?"Desktop notifications enabled.":"Desktop notifications off.";
}
const PUSH_VAPID_PUBLIC="BPVwjcyzMJqv8f0xKT0RmAGcIWDcLeARDnBv1_zzqnEOGW2M43pq8WovsPX5dxo8SOKauK0LW4w_WuXdZPbc-zk";
function pushBase64ToBytes(base64){
 const pad="=".repeat((4-base64.length%4)%4);
 const raw=atob((base64+pad).replace(/-/g,"+").replace(/_/g,"/"));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function registerManagerPush(){
 if(!isAdmin||!user?.id)return false;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){toast("Push notifications are not supported on this device/browser.",false);return false;}
 try{
   const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
   if(permission!=="granted"){toast("Push notification permission was not granted.",false);return false;}
   const reg=await navigator.serviceWorker.register("sw.js?v=4.4.2",{updateViaCache:"none"});
   await reg.update().catch(()=>{});
   let sub=await reg.pushManager.getSubscription();
   if(!sub){
     const subscribeOptions={userVisibleOnly:true,applicationServerKey:pushBase64ToBytes(PUSH_VAPID_PUBLIC)};
     try{
       sub=await reg.pushManager.subscribe(subscribeOptions);
     }catch(firstErr){
       const retryable=firstErr?.name==="AbortError" || /push service error/i.test(String(firstErr?.message||""));
       if(!retryable)throw firstErr;
       await new Promise(resolve=>setTimeout(resolve,800));
       await reg.update().catch(()=>{});
       sub=await reg.pushManager.subscribe(subscribeOptions);
     }
   }
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw new Error("Manager session is not available.");
   const {error}=await db.functions.invoke("manager-push",{body:{action:"subscribe",subscription:sub.toJSON(),user_agent:navigator.userAgent}});
   if(error)throw error;
   const st=$("notificationSettingsStatus");if(st)st.textContent="Push notifications enabled on this device.";
   toast("Push notifications enabled.");
   return true;
 }catch(err){
   console.error("Push subscription error",err);
   reportClientError(err,{action:"enable_push_notifications",context:{browser: navigator.userAgent,permission:("Notification" in window)?Notification.permission:"unsupported"}});
   const message=err?.name==="AbortError"
     ?"Browser push service is unavailable on this device right now. Your Manager in-app notifications will still work."
     :(err?.message||"Unable to enable push notifications.");
   const st=$("notificationSettingsStatus");if(st)st.textContent=message;
   toast(message,false);
   return false;
 }
}
async function testManagerPush(){
 try{
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw new Error("Manager session is not available.");
   const {data,error}=await db.functions.invoke("manager-push",{
     body:{action:"test"},
     headers:{Authorization:"Bearer "+session.access_token}
   });
   if(error)throw error;
   if(!data?.sent)throw new Error("No push subscription is registered on this device.");
   toast("Test push sent.");
 }catch(err){
   console.error("Push test error",err);
   reportClientError(err,{action:"test_push_notification"});
   toast(err?.message||"Push test failed.",false);
 }
}

async function loadNotificationPreferences(){
 if(!isAdmin||!user?.id)return;
 const {data,error}=await db.from("manager_notification_preferences").select("*").eq("manager_user_id",user.id).maybeSingle();
 if(error){console.warn("Notification preferences:",error.message);return;}
 if(data)notificationPreferences={...NOTIFICATION_DEFAULTS,...data};
 else{
   const {data:created,error:ce}=await db.from("manager_notification_preferences").insert({manager_user_id:user.id}).select().single();
   if(!ce&&created)notificationPreferences={...NOTIFICATION_DEFAULTS,...created};
 }
 renderNotificationSettings();
}
async function saveNotificationPreferences(){
 if(!isAdmin||!user?.id)return;
 const map={notifEnabled:"notifications_enabled",notifSound:"sound_enabled",notifDesktop:"desktop_enabled",notifWebsiteOrders:"website_orders",notifWebsiteEnquiries:"website_enquiries",notifEmployeeAccess:"employee_access_requests",notifEmployeeChanges:"employee_change_requests",notifRestrictedAccess:"restricted_access_attempts",notifLowStock:"low_stock_alerts",notifPayments:"payments_received",notifCreditDue:"credit_due_alerts"};
 const patch={manager_user_id:user.id};
 Object.entries(map).forEach(([id,key])=>{const el=$(id);if(el)patch[key]=!!el.checked;});
 const {data,error}=await db.from("manager_notification_preferences").upsert(patch,{onConflict:"manager_user_id"}).select().single();
 if(error){toast(error.message,false);return;}
 notificationPreferences={...NOTIFICATION_DEFAULTS,...data};
 const st=$("notificationSettingsStatus");if(st)st.textContent="Notification settings saved.";
}
function bindNotificationSettings(){
 renderNotificationVolume();
 $("notifVolume")?.addEventListener("input",e=>{
   const v=Math.min(100,Math.max(20,Number(e.target.value)||100));
   localStorage.setItem("cleancore_manager_alert_volume",String(v));
   renderNotificationVolume();
 });
 ["notifEnabled","notifSound","notifDesktop","notifWebsiteOrders","notifWebsiteEnquiries","notifEmployeeAccess","notifEmployeeChanges","notifRestrictedAccess","notifLowStock","notifPayments","notifCreditDue"].forEach(id=>$(id)?.addEventListener("change",saveNotificationPreferences));
 $("enablePushNotifications")?.addEventListener("click",registerManagerPush);
 $("testPushNotification")?.addEventListener("click",testManagerPush);
 $("enableDesktopNotifications")?.addEventListener("click",async()=>{
   if(!("Notification" in window)){toast("Desktop notifications are not supported by this browser.",false);return;}
   const p=await Notification.requestPermission();
   notificationPreferences.desktop_enabled=p==="granted";
   const el=$("notifDesktop");if(el)el.checked=p==="granted";
   await saveNotificationPreferences();
 });
 $("testNotificationSoundSettings")?.addEventListener("click",async()=>{unlockNotificationAudio();await playNotificationSound();toast("Notification sound tested");});
}
async function maybeBrowserNotify(n,pref){
 if(!notificationAllowed(pref))return;
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 try{
  new Notification(n?.subject||"CleanCore Manager alert",{
   body:n?.body||"",
   icon:"icon-192.svg",
   badge:"icon-192.svg",
   tag:n?.id||pref,
   renotify:true,
   vibrate:[120,70,120]
  });
 }catch(e){console.warn("Browser notification failed",e);}
}

async function ensureManagerNotificationPermission(){
 if(!("Notification" in window))return false;
 if(Notification.permission==="granted")return true;
 if(Notification.permission==="denied")return false;
 try{return (await Notification.requestPermission())==="granted";}catch(e){return false;}
}
async function registerManagerPushForCurrentUser(){
 if(!isAdmin||!user?.id)return false;
 return registerManagerPush();
}
function notificationStoreKey(type){return "cleancore_manager_notifications_"+type+"_"+(user?.id||"guest")}
function isWebsiteManagerNotification(n){return n&&["Website Order","Website Enquiry"].includes(n.notification_type)}
function notificationTime(v){return v?new Date(v).toLocaleString("en-IN"):"—"}
function unlockNotificationAudio(){
 try{
   if(!notificationAudioContext)notificationAudioContext=new (window.AudioContext||window.webkitAudioContext)();
   if(notificationAudioContext.state==="suspended")notificationAudioContext.resume().catch(()=>{});
 }catch(e){}
}
function managerAlertVolume(){
 const v=Number(localStorage.getItem("cleancore_manager_alert_volume")||100);
 return Math.min(1,Math.max(0.2,v/100));
}
function renderNotificationVolume(){
 const el=$("notifVolume"),out=$("notifVolumeValue");
 if(el)el.value=Math.round(managerAlertVolume()*100);
 if(out)out.textContent=Math.round(managerAlertVolume()*100)+"%";
}
async function playNotificationSound(){
 try{
   unlockNotificationAudio();
   const ctx=notificationAudioContext;if(!ctx)return;
   if(ctx.state==="suspended")await ctx.resume().catch(()=>{});
   if(navigator.vibrate)navigator.vibrate([140,70,140]);
   const master=ctx.createGain();
   master.gain.value=Math.min(1.35,1.18*managerAlertVolume());
   master.connect(ctx.destination);
   const now=ctx.currentTime;
   [0,0.18,0.38,0.58].forEach((offset,i)=>{
     const o=ctx.createOscillator(),g=ctx.createGain();
     o.type=i%2?"triangle":"sine";
     o.frequency.setValueAtTime([784,1046,1319,988][i],now+offset);
     g.gain.setValueAtTime(0.0001,now+offset);
     g.gain.exponentialRampToValueAtTime(0.68,now+offset+0.025);
     g.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.18);
     o.connect(g);g.connect(master);
     o.start(now+offset);o.stop(now+offset+0.2);
   });
 }catch(e){}
}
document.addEventListener("pointerdown",unlockNotificationAudio,{once:true,capture:true});
function notificationReadAt(){return Number(localStorage.getItem(notificationStoreKey("read"))||0)}
function notificationAlertedAt(){return Number(localStorage.getItem(notificationStoreKey("alerted"))||0)}
function setNotificationTimestamp(type,v){localStorage.setItem(notificationStoreKey(type),String(v))}
function formatPushNotification(n){
 const type=n?.notification_type||"Notification";
 const isOrder=type==="Website Order";
 const title=isOrder?"New Website Order":"New Website Enquiry";
 const body=n?.body||n?.subject||"New CleanCore activity";
 return {title,body,icon:"icon-192.svg",badge:"icon-192.svg"};
}
function showInPageNotification(n){
 const d=formatPushNotification(n);
 toast((d.title==="New Website Order"?"🛒 ":"✉️ ")+d.title);
}
function renderWebsiteNotifications(){
 const list=$("notificationList"),badge=$("notificationBadge");
 if(!list||!badge)return;
 const all=[...new Map([...websiteNotifications].map(n=>[n.id,n])).values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const readAt=notificationReadAt();
 const unread=all.filter(n=>new Date(n.created_at).getTime()>readAt).length;
 badge.textContent=String(unread);
 badge.classList.toggle("hidden",unread===0);
 if(!all.length){
   list.innerHTML='<div class="empty">No new notifications.</div>';
   return;
 }
 list.innerHTML=all.slice(0,20).map(n=>{
   const cfg=OPERATIONAL_EVENTS[n.notification_type];
   const icon=n.notification_type==="Website Order"?"🛒":n.notification_type==="Website Enquiry"?"✉️":(cfg?.icon||"🔔");
   return '<button type="button" class="notification-item '+(new Date(n.created_at).getTime()>readAt?"unread":"")+'" data-notification-id="'+esc(n.related_id||"")+'" data-notification-type="'+esc(n.notification_type)+'">'+
     '<span class="notification-icon">'+icon+'</span>'+
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
 const isOrder=n.notification_type==="Website Order";
 const pref=isOrder?"website_orders":"website_enquiries";
 if(!notificationAllowed(pref))return;
 if(notificationPreferences.sound_enabled)playNotificationSound();
 maybeBrowserNotify(n,pref);
 showInPageNotification(n);
 toast(isOrder?"🔔 New website order received":"🔔 New website enquiry received");
 // Pull only the affected data instead of rebuilding every Manager table.
 const refresh=async()=>{
   if(isOrder){
     const [wo,cu]=await Promise.all([
       db.from("website_orders").select("id,order_no,customer_id,status,subtotal,total,notes,created_at,updated_at,invoice_id,invoice_no,gst_enabled,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,place_of_supply,customer_gstin").order("created_at",{ascending:false}),
       db.from("customers").select("id,name,phone,gstin,business_name,email,billing_address,delivery_address,billing_shop_no,billing_colony,billing_city,billing_state,billing_pincode,delivery_shop_no,delivery_colony,delivery_city,delivery_state,delivery_pincode,auth_user_id").is("archived_at",null).order("name")
     ]);
     if(wo.error)throw wo.error;if(cu.error)throw cu.error;
     websiteOrders=wo.data||[];customers=cu.data||[];
     renderWebsiteOrders();renderCustomers();
     if($("websiteOrdersNew"))$("websiteOrdersNew").textContent=websiteOrders.filter(x=>x.status==="New").length;
   }else{
     const en=await db.from("enquiries").select("id,name,phone,business,message,status,created_at,source,product_name,quantity,email,website_order_id,invoice_id,source_detail").neq("source","website_order").order("created_at",{ascending:false}).limit(250);
     if(en.error)throw en.error;
     enquiries=en.data||[];
     $("enquiriesTable").innerHTML=table(["Name","Phone","Business","Email","Product","Qty","Source","Message","Status","Date","Documents",""],enquiries.map(x=>[esc(x.name),esc(x.phone),esc(x.business),esc(x.email),esc(x.product_name||"—"),esc(x.quantity??"—"),"<span class='badge "+(formatEnquirySource(x)==="Offline"?"":"ok")+"'>"+esc(formatEnquirySource(x))+"</span>",esc(x.message),esc(x.status),isoDate(x.created_at),enquiryDocumentLinks(x),"<button type='button' class='icon-delete-btn' title='Delete enquiry' aria-label='Delete enquiry' onclick=\"deleteEnquiry('"+x.id+"')\"><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6'/></svg></button>"]));
   }
 };
 refresh().catch(err=>console.warn("Manager alert refresh:",err.message));
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
 // Push subscription must be started from an explicit user action (Settings → Enable Push Notifications).
 // Keep the in-app/realtime notification path independent so it still works without OS push.
 await loadWebsiteNotifications(true);
 notificationChannel=db.channel("cleancore-manager-website-alerts")
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"manager_notifications"},payload=>{
     if(isWebsiteManagerNotification(payload.new))announceWebsiteNotification(payload.new);
   })
   .subscribe((status,err)=>{
     if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
       console.warn("Manager realtime notification channel:",status,err?.message||"");
       reportClientError(new Error("Manager realtime notification channel "+status),{action:"manager_notification_realtime",context:{status,error:String(err?.message||"")}});
     }
   });
 notificationPollTimer=setInterval(()=>loadWebsiteNotifications(false),60000);
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
   }else if(type==="Website Enquiry"){
     await go("enquiries");
   }else{
     await go(OPERATIONAL_EVENTS[type]?.section||"settings");
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
document.addEventListener("DOMContentLoaded",()=>{ensureDialogCloseButtons();document.addEventListener("keydown",e=>{if(e.key==="Escape"){document.querySelectorAll("dialog[open]").forEach(d=>{try{d.close();}catch(_){}});document.body.classList.remove("modal-open");}});document.addEventListener("click",e=>{document.querySelectorAll("dialog[open]").forEach(d=>{if(e.target===d){try{d.close();}catch(_){}}});});});

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
 if(isAdmin)await loadNotificationPreferences();
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
 renderAll(id);
}

let operationalNotificationReady=false;
let operationalNotificationSeen={};

function operationalSeenKey(type){return "cleancore_manager_seen_"+type+"_"+(user?.id||"guest")}
function operationalLastSeen(type){return Number(localStorage.getItem(operationalSeenKey(type))||0)}
function setOperationalLastSeen(type,ts){localStorage.setItem(operationalSeenKey(type),String(ts||Date.now()))}

const OPERATIONAL_EVENTS={
  WebsiteEnquiry:{pref:"website_enquiries",icon:"✉️",section:"enquiries"},
  EmployeeAccessRequest:{pref:"employee_access_requests",icon:"🔐",section:"settings"},
  EmployeeChangeRequest:{pref:"employee_change_requests",icon:"✏️",section:"settings"},
  LowStockAlert:{pref:"low_stock_alerts",icon:"📦",section:"products"},
  PaymentReceived:{pref:"payments_received",icon:"💰",section:"customers"},
  CreditDueAlert:{pref:"credit_due_alerts",icon:"🧾",section:"customers"}
};

function operationalNotificationAllowed(type){
 const cfg=OPERATIONAL_EVENTS[type];return !!cfg&&notificationAllowed(cfg.pref);
}
function pushOperationalNotification(type,subject,body,relatedId,createdAt=new Date().toISOString()){
 const cfg=OPERATIONAL_EVENTS[type];if(!cfg||!operationalNotificationAllowed(type))return;
 const n={id:type+"-"+(relatedId||createdAt),notification_type:type,subject,body,related_id:relatedId||"",created_at:createdAt};
 if(websiteNotifications.some(x=>x.id===n.id))return;
 websiteNotifications.unshift(n);
 renderWebsiteNotifications();
 if(notificationPreferences.sound_enabled)playNotificationSound();
 maybeBrowserNotify(n,cfg.pref);
 toast(cfg.icon+" "+subject);
}
function scanOperationalNotifications(){
 if(!isAdmin)return;
 const now=Date.now();
 if(!operationalNotificationReady){
   [
     ["WebsiteEnquiry",enquiries,"created_at"],
     ["EmployeeAccessRequest",accessRequests,"created_at"],
     ["EmployeeChangeRequest",changeRequests,"requested_at"],
     ["PaymentReceived",payments,"created_at"],
     ["CreditDueAlert",invoices.filter(x=>Number(x.due_amount||0)>0),"created_at"]
   ].forEach(([type,rows,timeKey])=>{
     const latest=(rows||[]).reduce((m,x)=>Math.max(m,new Date(x?.[timeKey]).getTime()||0),0);
     setOperationalLastSeen(type,latest||now);
   });
   const lowState={};
   [...(products||[]),...(rawMaterials||[])].forEach(x=>{if(Number(x.stock||0)<=Number(x.low_stock_threshold||5))lowState[x.id]=Number(x.stock||0)});
   localStorage.setItem(operationalSeenKey("LowStockState"),JSON.stringify(lowState));
   operationalNotificationReady=true;
   return;
 }
 const scanRows=(type,rows,timeKey)=>{
   const last=operationalLastSeen(type);
   let max=last;
   (rows||[]).forEach(x=>{
     const ts=new Date(x?.[timeKey]).getTime()||0;
     if(ts>max)max=ts;
     if(ts>last){
       let subject="",body="";
       if(type==="WebsiteEnquiry"){subject="New website enquiry";body=(x.name||"Customer")+" submitted a new enquiry.";}
       if(type==="EmployeeAccessRequest"){const emp=employeeById?.(x.employee_id);subject="Employee access request";body=(emp?.username||"Employee")+" requested "+(MODULE_LABELS[x.module]||x.module)+" access.";}
       if(type==="EmployeeChangeRequest"){const emp=employeeById?.(x.employee_id);subject="Employee change needs approval";body=(emp?.username||"Employee")+" submitted "+(x.action||"a change")+" for approval.";}
       if(type==="PaymentReceived"){subject="Payment received";body=(x.amount?money(x.amount):"A payment")+" was recorded against an invoice.";}
       if(type==="CreditDueAlert"){subject="Customer credit recorded";body=(x.customer_name||"Customer")+" has "+money(x.due_amount||0)+" credit outstanding.";}
       if(subject)pushOperationalNotification(type,subject,body,x.id,x[timeKey]);
     }
   });
   setOperationalLastSeen(type,max);
 };
 scanRows("WebsiteEnquiry",enquiries,"created_at");
 scanRows("EmployeeAccessRequest",accessRequests,"created_at");
 scanRows("EmployeeChangeRequest",changeRequests,"requested_at");
 scanRows("PaymentReceived",payments,"created_at");
 scanRows("CreditDueAlert",invoices.filter(x=>Number(x.due_amount||0)>0&&x.payment_method==="Credit"),"created_at");

 const previous=(()=>{try{return JSON.parse(localStorage.getItem(operationalSeenKey("LowStockState"))||"{}")}catch{return {}}})();
 const current={};
 [...(products||[]),...(rawMaterials||[])].forEach(x=>{
   const threshold=Number(x.low_stock_threshold??5),stock=Number(x.stock||0);
   if(stock<=threshold){
     current[x.id]=stock;
     if(!(String(x.id) in previous)){
       pushOperationalNotification("LowStockAlert","Low stock alert",(x.name||"Item")+" has only "+stock+" remaining.",x.id,new Date().toISOString());
     }
   }
 });
 localStorage.setItem(operationalSeenKey("LowStockState"),JSON.stringify(current));
}
async function loadAll(){
 const qP=(isAdmin||canAccess("products")||canAccess("billing"))?db.from("products").select("id,name,unit,mrp,selling_price,final_selling_price,cost_price,stock,low_stock_threshold,description,additional_details,image_urls,video_urls,hsn_code").order("name"):null;
 const qI=(isAdmin||canAccess("billing")||canAccess("sales"))?db.from("invoices").select("id,invoice_no,customer_id,customer_name,customer_phone,gstin,customer_business,customer_email,billing_address,delivery_address,subtotal,discount,total,profit,created_at,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,payment_status,paid_amount,due_amount,due_date,payment_method,place_of_supply,document_type,bill_status,delivery_status,source").order("created_at",{ascending:false}):null;
 const qC=(isAdmin||canAccess("customers")||canAccess("billing"))?db.from("customers").select("id,name,phone,gstin,created_at,business_name,email,customer_source,billing_address,delivery_address,updated_at,auth_user_id,alternate_phone,archived_at,billing_shop_no,billing_colony,billing_city,billing_state,billing_pincode,delivery_shop_no,delivery_colony,delivery_city,delivery_state,delivery_pincode").is("archived_at",null).order("name"):null;
 const qE=(isAdmin||canAccess("enquiries"))?db.from("enquiries").select("id,name,phone,business,message,status,created_at,source,product_name,quantity,email,website_order_id,invoice_id,source_detail").neq("source","website_order").order("created_at",{ascending:false}).limit(250):null;
 const qR=(isAdmin||canAccess("products"))?db.from("raw_materials").select("id,name,unit,cost_per_unit,stock,low_stock_threshold,created_at,updated_at").order("name"):null;
 const qX=(isAdmin||canAccess("expenses"))?db.from("expenses").select("id,expense_date,category,amount,vendor,payment_method,notes,raw_material_id,quantity,unit_cost,created_at,updated_at").order("expense_date",{ascending:false}).order("created_at",{ascending:false}).limit(1000):null;
 const qPM=(isAdmin||canAccess("billing")||canAccess("sales")||canAccess("customers"))?db.from("payments").select("id,invoice_id,customer_id,amount,payment_date,payment_method,reference,notes,created_at").order("payment_date",{ascending:false}).order("created_at",{ascending:false}).limit(250):null;
 const qINV=(isAdmin||canAccess("products"))?db.from("manager_investments").select("id,investment_date,amount,notes,created_at,updated_at").order("investment_date",{ascending:false}).order("created_at",{ascending:false}):null;
 const qWO=(isAdmin||canAccess("website_orders"))?db.from("website_orders").select("id,order_no,customer_id,status,subtotal,total,notes,created_at,updated_at,invoice_id,invoice_no,gst_enabled,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,place_of_supply,customer_gstin").order("created_at",{ascending:false}).limit(250):null;
 const qs=await Promise.all([qP,qI,qC,qE,qR,qX,qPM,qINV,qWO]);
 const [p,i,cu,e,r,x,pm,inv,wo]=qs;
 for(const q of qs)if(q?.error)throw new Error(q.error.message);
 products=p?.data||[];invoices=i?.data||[];customers=cu?.data||[];enquiries=e?.data||[];rawMaterials=r?.data||[];expenses=x?.data||[];payments=pm?.data||[];investments=inv?.data||[];websiteOrders=wo?.data||[];
 if(isAdmin){
   const [er,ep,cr,ar,nr,dr]=await Promise.all([
     db.from("employees").select("id,auth_user_id,username,full_name,team,alert_email,active,starts_at,ends_at,created_at,updated_at,portal_key").order("created_at",{ascending:false}).limit(100),
     db.from("employee_permissions").select("employee_id,module,enabled"),
     db.from("change_requests").select("id,employee_id,module,action,target_table,target_id,payload,status,requested_at,reviewed_at,reviewed_by,review_note").order("requested_at",{ascending:false}).limit(250),
     db.from("access_requests").select("id,employee_id,module,action,reason,created_at,status,reviewed_at,reviewed_by").order("created_at",{ascending:false}).limit(250),
     db.from("manager_notifications").select("id,notification_type,subject,body,related_id,email_to,email_status,created_at,sent_at").order("created_at",{ascending:false}).limit(250),
     db.from("deleted_records").select("id,entity_type,original_id,display_name,deleted_at,purge_at,status,snapshot").eq("status","Deleted").order("deleted_at",{ascending:false}).limit(250)
   ]);
   for(const q of [er,ep,cr,ar,nr,dr])if(q?.error)throw new Error(q.error.message);
   employees=er.data||[];employeePermissionRows=ep.data||[];changeRequests=cr.data||[];accessRequests=ar.data||[];managerNotifications=nr.data||[];deletedRecords=dr.data||[];
   renderEmployeeData();
   scanOperationalNotifications();
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
 const rpcName=req?.action==="invoice_status_update"?"approve_invoice_status_change_request":req?.action==="invoice_payment_selection_update"?"review_invoice_payment_selection_change_request":req?.action==="payment_create"?"review_payment_change_request":req?.action==="raw_material_delete"?"review_raw_material_delete_request":req?.action==="customer_delete"?"review_customer_delete_request":(req?.action==="customer_create"||req?.action==="customer_update")?"review_customer_change_request":"review_change_request";
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

function bindDashboardMetricLinks(){
 const ids=["today","month","grossProfit","monthlyExpenses","netProfit","low","websiteOrdersNew","investmentBox"];
 ids.forEach(id=>{const el=$(id);if(!el)return;el.classList.add("dashboard-link-card");el.setAttribute("role","link");el.tabIndex=0;
   const goTarget=()=>{const target=id==="low"?"products":id==="websiteOrdersNew"?"enquiries":id==="investmentBox"?"products":id==="monthlyExpenses"?"expenses":id==="grossProfit"||id==="netProfit"||id==="today"||id==="month"?"sales":"dashboard";go(target);};
   el.onclick=goTarget;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goTarget();}};
 });
}

function isSaleDocument(inv){return String(inv?.document_type||"SALE").toUpperCase()==="SALE";}
function isQuotationDocument(inv){return String(inv?.document_type||"SALE").toUpperCase()==="QUOTATION";}
function enquiryDocumentLinks(x){
  const normalize=v=>String(v||"").replace(/\D/g,"");
  const phone=normalize(x.phone);
  const name=String(x.name||"").trim().toLowerCase();
  const business=String(x.business||"").trim().toLowerCase();
  const matches=invoices.filter(inv=>{
    const invPhone=normalize(inv.customer_phone);
    const invName=String(inv.customer_name||"").trim().toLowerCase();
    const invBusiness=String(inv.customer_business||"").trim().toLowerCase();
    return (phone&&invPhone===phone) || (name&&invName===name&&(!business||!invBusiness||invBusiness===business));
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const sale=matches.find(isSaleDocument);
  const quote=matches.find(isQuotationDocument);
  const links=[];
  if(sale)links.push("<button type='button' class='link' onclick=\"viewInvoice('"+esc(sale.id)+"')\">Invoice</button>");
  if(quote)links.push("<button type='button' class='link' onclick=\"viewInvoice('"+esc(quote.id)+"')\">Quotation</button>");
  return links.length?links.join(" "):"<span class='muted'>—</span>";
}
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
function renderDashboardPeriods(startValue="",endValue=""){
 const el=$("dashboardPeriods");if(!el)return;
 const now=new Date();const pad=n=>String(n).padStart(2,"0");
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const day=today.getDay(),mondayOffset=day===0?-6:1-day;
 const weekStart=new Date(today);weekStart.setDate(today.getDate()+mondayOffset);
 const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
 const key=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const defaultStart=key(weekStart),defaultEnd=key(weekEnd);
 const startValueSafe=startValue||defaultStart,endValueSafe=endValue||defaultEnd;
 const start=new Date(startValueSafe+"T00:00:00"),end=new Date(endValueSafe+"T00:00:00");end.setDate(end.getDate()+1);
 const fmt=d=>d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
 const calc=(st,en)=>{
   const sales=invoices.filter(x=>isSaleDocument(x)&&new Date(x.created_at)>=st&&new Date(x.created_at)<en);
   const ex=expenses.filter(x=>{const d=new Date(x.expense_date||x.created_at);return d>=st&&d<en});
   const salesTotal=sales.reduce((z,x)=>z+Number(x.total||0),0);
   const gross=sales.reduce((z,x)=>z+Number(x.profit||0),0);
   const expenseTotal=ex.reduce((z,x)=>z+Number(x.amount||0),0);
   return {sales:salesTotal,expenses:expenseTotal,gross,net:gross-expenseTotal};
 };
 const v=calc(start,end);
 const weekly=[{label:fmt(start)+" – "+fmt(new Date(end-1)),...v}];
 const rows=weekly.map(w=>[w.label,money(w.sales),money(w.expenses),money(w.gross),money(w.net)]);
 const cards='<div class="profit-cards">'+[['Sales',v.sales],['Expenses',v.expenses],['Gross Profit',v.gross],['Net Profit',v.net]].map(([name,val])=>'<div class="profit-card"><span>'+name+'</span><strong>'+money(val)+'</strong></div>').join('')+'</div>';
 el.innerHTML='<div class="dashboard-period-toolbar"><div><h3>Sales, Expenses & Profit of Month</h3><p class="muted">Select the period you want to analyse.</p></div></div><div class="dashboard-date-filter"><label>From<input id="dashboardFromDate" type="date" value="'+startValueSafe+'"></label><span>to</span><label>To<input id="dashboardToDate" type="date" value="'+endValueSafe+'"></label><button type="button" class="btn primary" id="applyDashboardDates">Apply</button><button type="button" class="btn primary" id="exportDashboardCsv">Export CSV</button></div>'+cards+'<div class="period-selected-label">'+fmt(start)+' – '+fmt(new Date(end-1))+'</div><div class="profit-weekly"><h4>Breakout</h4>'+table(["Week","Sales","Expenses","Gross Profit","Net Profit"],rows)+'</div>';
 const apply=$("applyDashboardDates");
 if(apply)apply.onclick=()=>{
   const from=$("dashboardFromDate")?.value,to=$("dashboardToDate")?.value;
   if(!from||!to)return toast("Select both dates.",false);
   if(from>to)return toast("From date cannot be after To date.",false);
   renderDashboardPeriods(from,to);
 };
 const exportBtn=$("exportDashboardCsv");
 if(exportBtn)exportBtn.onclick=async()=>{
   const from=$("dashboardFromDate")?.value,to=$("dashboardToDate")?.value;
   if(!from||!to)return toast("Select both dates.",false);
   if(from>to)return toast("From date cannot be after To date.",false);
   const startDate=new Date(from+"T00:00:00"),endDate=new Date(to+"T23:59:59.999");
   const salesInRange=invoices.filter(x=>isSaleDocument(x)&&new Date(x.created_at)>=startDate&&new Date(x.created_at)<=endDate);
   const expensesInRange=expenses.filter(x=>{const d=new Date((x.expense_date||x.created_at)+"T00:00:00");return d>=startDate&&d<=endDate});
   const customerMap=new Map((customers||[]).map(x=>[String(x.id),x]));
   const invoiceIds=salesInRange.map(x=>x.id).filter(Boolean);
   let itemRows=[];
   if(invoiceIds.length){const {data,error}=await db.from("invoice_items").select("invoice_id,product_id,product_name,qty,unit_price,cost_price,line_total,line_profit,hsn_code").in("invoice_id",invoiceIds);if(error){console.error("CSV invoice items error",error);return toast("Could not load purchased product details.",false);}itemRows=data||[];}
   const itemsByInvoice=new Map();
   itemRows.forEach(item=>{const key=String(item.invoice_id);if(!itemsByInvoice.has(key))itemsByInvoice.set(key,[]);itemsByInvoice.get(key).push(item);});
   const csvRows=[],addSection=(title,headers,rows)=>{if(csvRows.length)csvRows.push([]);csvRows.push([title]);csvRows.push(headers);rows.forEach(r=>csvRows.push(r));};
   csvRows.push(["CleanCore Detailed Business Report"],["From",from,"To",to],["Generated",new Date().toLocaleString("en-IN")]);
   addSection("SUMMARY",["Metric","Amount"],[["Sales",v.sales],["Expenses",v.expenses],["Gross Profit",v.gross],["Net Profit",v.net],["Bills",salesInRange.length],["Customers with purchases",new Set(salesInRange.map(x=>x.customer_id||x.customer_phone||x.customer_name)).size]]);
   addSection("SALES / CUSTOMER PURCHASES",["Date","Invoice","Customer","Business","Phone","Email","Customer Source","Order Source","Product","Qty","Unit Price","Product Total","Product Profit","Invoice Subtotal","Discount","GST","Invoice Total","Paid","Due","Payment Status","Payment Method","Due Date","Delivery Status","Billing Address","Delivery Address"],salesInRange.flatMap(inv=>{const customer=customerMap.get(String(inv.customer_id))||{};let items=itemsByInvoice.get(String(inv.id))||[];if(!items.length)items=[{}];return items.map(item=>[new Date(inv.created_at).toLocaleString("en-IN"),inv.invoice_no||"",inv.customer_name||"",inv.customer_business||customer.business_name||"",inv.customer_phone||customer.phone||"",inv.customer_email||customer.email||"",customer.customer_source||"Not recorded",inv.source||"Manager",item.product_name||"",item.qty??"",item.unit_price??"",item.line_total??"",item.line_profit??"",inv.subtotal??"",inv.discount??"",inv.gst_amount??"",inv.total??"",inv.paid_amount??0,inv.due_amount??0,inv.payment_status||"Unpaid",inv.payment_method||"",inv.due_date||"",inv.delivery_status||"",inv.billing_address||customer.billing_address||"",inv.delivery_address||customer.delivery_address||""]);}));
   const grouped=new Map();salesInRange.forEach(inv=>{const key=String(inv.customer_id||inv.customer_phone||inv.customer_name||"");if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(inv);});
   addSection("CUSTOMER PURCHASE SUMMARY",["Customer","Business","Phone","Email","Customer Source","Bills","Products Purchased","Total Purchase","Last Purchase Date"],Array.from(grouped.values()).map(customerSales=>{const inv=customerSales[0],customer=customerMap.get(String(inv.customer_id))||{},products=customerSales.flatMap(x=>itemsByInvoice.get(String(x.id))||[]);return [inv.customer_name||customer.name||"",inv.customer_business||customer.business_name||"",inv.customer_phone||customer.phone||"",inv.customer_email||customer.email||"",customer.customer_source||"Not recorded",customerSales.length,products.map(p=>(p.product_name||"Product")+" × "+(p.qty??"")).join(" | "),customerSales.reduce((sum,x)=>sum+Number(x.total||0),0),new Date(Math.max(...customerSales.map(x=>new Date(x.created_at).getTime()))).toLocaleDateString("en-IN")];}));
   addSection("EXPENSES",["Date","Category","Amount","Vendor","Payment Method","Quantity","Unit Cost","Notes"],expensesInRange.map(x=>[x.expense_date||"",x.category||"",x.amount??0,x.vendor||"",x.payment_method||"",x.quantity??"",x.unit_cost??"",x.notes||""]));
   addSection("WEEKLY BREAKDOWN",["Week","Sales","Expenses","Gross Profit","Net Profit"],weekly.map(w=>[w.label,w.sales,w.expenses,w.gross,w.net]));
   const csv=csvRows.map(r=>r.map(value=>String.fromCharCode(34)+String(value??"").replaceAll(String.fromCharCode(34),String.fromCharCode(34)+String.fromCharCode(34))+String.fromCharCode(34)).join(",")).join("\n");
   const suffix="-"+from+"-to-"+to,url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),link=document.createElement("a");
   link.href=url;link.download="cleancore-detailed-business-report"+suffix+".csv";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   toast("Detailed CSV exported with sales, customers, products and expenses.");
 };
}
function renderAll(section){
 const active=section||document.querySelector(".section.active")?.id||"dashboard";
 const now=new Date(),day=new Date(now.getFullYear(),now.getMonth(),now.getDate()),mon=new Date(now.getFullYear(),now.getMonth(),1);
 const todayKey=dateKey(now),monthKey=todayKey.slice(0,7);
 const saleInvoices=invoices.filter(isSaleDocument);
 const paidSales=saleInvoices.filter(x=>String(x.payment_status||"Unpaid")==="Paid");
 const td=paidSales.filter(x=>new Date(x.created_at)>=day),mo=paidSales.filter(x=>new Date(x.created_at)>=mon);
 const grossMonth=mo.reduce((a,x)=>a+Number(x.profit||0),0);
 const monthExpenses=expenses.filter(x=>String(x.expense_date||"").startsWith(monthKey)).reduce((a,x)=>a+Number(x.amount||0),0);
 if($("today"))$("today").textContent=money(td.reduce((a,x)=>a+Number(x.paid_amount||0),0));
 if($("month"))$("month").textContent=money(mo.reduce((a,x)=>a+Number(x.paid_amount||0),0));
 if($("grossProfit"))$("grossProfit").textContent=money(grossMonth);
 if($("monthlyExpenses"))$("monthlyExpenses").textContent=money(monthExpenses);
 if($("netProfit"))$("netProfit").textContent=money(grossMonth-monthExpenses);
 if($("low"))$("low").textContent=products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length+rawMaterials.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold)).length;
 if($("websiteOrdersNew"))$("websiteOrdersNew").textContent=websiteOrders.filter(o=>o.status==="New").length;
 const stockValueTotal=products.reduce((sum,p)=>sum+(Number(p.stock||0)*Number(p.final_selling_price||0)),0);
 if($("stockValueTotal"))$("stockValueTotal").textContent=money(stockValueTotal);

 if(active==="dashboard"){ bindDashboardMetricLinks(); renderDashboardPeriods();
   if($("recent"))$("recent").innerHTML=table(["Invoice","Customer","Total","Date",""],paidSales.slice(0,8).map(x=>[esc(x.invoice_no),esc(x.customer_name),money(x.paid_amount||0),new Date(x.created_at).toLocaleString("en-IN"),'<button type="button" class="icon-delete-btn" title="Delete invoice" aria-label="Delete invoice" onclick="deleteInvoice(\''+x.id+'\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6"/></svg></button>']));
 }
 if($("investmentFrontTotal"))$("investmentFrontTotal").textContent=money(investments.reduce((sum,x)=>sum+Number(x.amount||0),0));
 if(active==="products"){
   $("productsTable").innerHTML=table(["Product","Unit","MRP","Selling","Final Selling Price","Stock","Status","Action"],products.map(p=>[
     esc(p.name),esc(p.unit),money(p.mrp),money(p.selling_price),money(p.final_selling_price),p.stock,
     Number(p.stock)===0?'<span class="badge danger">Low</span>':(Number(p.stock)<=Number(p.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>'),
     '<button class="link" onclick="editProduct(\''+p.id+'\')">Edit</button> <button class="link danger" onclick="deleteProduct(\''+p.id+'\')">Delete</button>'
   ]));
   $("rawTable").innerHTML=table(["Raw material","Unit","Cost / unit","Stock","Status","Action"],rawMaterials.map(r=>[
     esc(r.name),esc(r.unit),money(r.cost_per_unit),r.stock,
     Number(r.stock)<=Number(r.low_stock_threshold)?'<span class="badge warn">Low</span>':'<span class="badge ok">OK</span>',
     '<button class="link" onclick="editRawMaterial(\''+r.id+'\')">Edit</button> <button class="link danger" onclick="deleteRawMaterial(\''+r.id+'\')">Delete</button>'
   ]));
 }
 if(active==="sales")renderSales();
 if(active==="billing"){renderQuotations();rebuildLines();}
 if(active==="expenses")renderExpenses();
 if(active==="settings"){loadErrorLogs();if(!errorFinderRefreshTimer)errorFinderRefreshTimer=setInterval(()=>{if(active==="settings")loadErrorLogs();},10000);}else if(errorFinderRefreshTimer){clearInterval(errorFinderRefreshTimer);errorFinderRefreshTimer=null;}
 if(active==="customers")renderCustomers();
 if(active==="website_orders"||active==="enquiries")renderWebsiteOrders();
const formatEnquirySource=x=>{const source=String(x.source||"manager").trim();if(source==="manager"||source==="offline"||source==="Offline")return "Offline";if(source==="Website"||source==="website"||source==="website_order")return source==="website_order"?"Website Order":"Website";return source||"Offline"};
 if(active==="enquiries"){
   $("enquiriesTable").innerHTML=table(["Name","Phone","Business","Email","Product","Qty","Source","Message","Status","Date","Documents",""],enquiries.map(x=>[esc(x.name),esc(x.phone),esc(x.business),esc(x.email),esc(x.product_name||"—"),esc(x.quantity??"—"),"<span class='badge "+(formatEnquirySource(x)==="Offline"?"":"ok")+"'>"+esc(formatEnquirySource(x))+"</span>",esc(x.message),esc(x.status),isoDate(x.created_at),enquiryDocumentLinks(x),"<button type='button' class='icon-delete-btn' title='Delete enquiry' aria-label='Delete enquiry' onclick=\"deleteEnquiry('"+x.id+"')\"><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6'/></svg></button>"]));
 }
 if($("websiteOrdersPanel"))$("websiteOrdersPanel").style.display=(isAdmin||canAccess("website_orders"))?"":"none";
 if($("enquiriesPanel"))$("enquiriesPanel").style.display=(isAdmin||canAccess("enquiries"))?"":"none";
 if($("addEnquiry"))$("addEnquiry").disabled=(!isAdmin&&!canAccess("enquiries"));
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
$("closeDeletedRecord").onclick=function(){$("deletedRecordDialog").close()};function recoveryRecordLabel(r){
 const snap=r?.snapshot||{};
 const row=snap?.row||{};
 return String(r?.display_name||row?.name||row?.business_name||row?.invoice_no||row?.order_no||row?.phone||row?.email||r?.original_id||"Deleted record").trim();
}
function recoverySnapshotSummary(r){
 const snap=r?.snapshot||{},row=snap?.row||{};
 const parts=[];
 const type=String(r?.entity_type||"").toLowerCase();
 if(type==="customer"){
   if(row.name)parts.push(row.name);
   if(row.business_name)parts.push(row.business_name);
   if(row.phone)parts.push("Mobile: "+row.phone);
   if(row.email)parts.push("Email: "+row.email);
   if(Array.isArray(snap.invoices)&&snap.invoices.length)parts.push(snap.invoices.length+" invoice"+(snap.invoices.length===1?"":"s"));
   if(Array.isArray(snap.website_orders)&&snap.website_orders.length)parts.push(snap.website_orders.length+" website order"+(snap.website_orders.length===1?"":"s"));
   if(Array.isArray(snap.enquiries)&&snap.enquiries.length)parts.push(snap.enquiries.length+" enquiry"+(snap.enquiries.length===1?"":"ies"));
 }
 return parts.join(" • ")||recoveryRecordLabel(r);
}
function renderRecovery(){
 if(!isAdmin||!$("recoveryTable"))return;
 const rows=deletedRecords.map(r=>{
   const days=Math.max(0,Math.ceil((new Date(r.purge_at)-new Date())/86400000));
   const label=recoveryRecordLabel(r);
   return [
     esc(r.entity_type.replaceAll("_"," ")),
     "<strong>"+esc(label)+"</strong>"+(label!==String(r.display_name||"").trim()?"<div class='muted tiny'>"+esc(recoverySnapshotSummary(r))+"</div>":""),
     formatAccessDate(r.deleted_at),
     formatAccessDate(r.purge_at),
     days+" day"+(days===1?"":"s"),
     "<button type='button' class='link' onclick=\"viewDeletedRecord('"+r.id+"')\">View Details</button> <button type='button' class='link' onclick=\"restoreDeletedRecord('"+r.id+"')\">Restore</button> <button type='button' class='link danger' onclick=\"permanentlyDeleteRecovery('"+r.id+"')\">Permanently Delete</button>"
   ];
 });
 $("recoveryTable").innerHTML=table(["Type","Record","Deleted","Auto-delete","Time left","Action"],rows);
 if($("recoverySummary"))$("recoverySummary").textContent=deletedRecords.length+" deleted record"+(deletedRecords.length===1?"":"s")+" currently recoverable. Records are permanently removed after 30 days.";
}
window.viewDeletedRecord=function(id){
 if(!isAdmin)return;
 const r=deletedRecords.find(x=>x.id===id);if(!r)return;
 const snap=r.snapshot||{},row=snap.row||{};
 const type=String(r.entity_type||"").replaceAll("_"," ");
 const rows=(value,columns)=>{
   if(!Array.isArray(value)||!value.length)return "<p class='muted'>None recorded.</p>";
   return table(columns,value.slice(0,100).map(item=>columns.map(col=>esc(item?.[col]??"—"))));
 };
 let html="<div class='history-cards'>"+
   "<div><span>Type</span><b>"+esc(type)+"</b></div>"+
   "<div><span>Record</span><b>"+esc(recoveryRecordLabel(r))+"</b></div>"+
   "<div><span>Deleted</span><b>"+esc(formatAccessDate(r.deleted_at))+"</b></div>"+
   "<div><span>Auto-delete</span><b>"+esc(formatAccessDate(r.purge_at))+"</b></div>"+
   "</div>";
 if(type==="customer"){
   html+="<h4>Customer</h4><div class='history-cards'>"+
     "<div><span>Name</span><b>"+esc(row.name||"—")+"</b></div>"+
     "<div><span>Business</span><b>"+esc(row.business_name||"—")+"</b></div>"+
     "<div><span>Mobile</span><b>"+esc(row.phone||"—")+"</b></div>"+
     "<div><span>Email</span><b>"+esc(row.email||"—")+"</b></div>"+
     "<div><span>GSTIN</span><b>"+esc(row.gstin||"—")+"</b></div>"+
     "<div><span>Customer source</span><b>"+esc(row.customer_source||"—")+"</b></div>"+
     "</div>";
   html+="<h4>Recovery contents</h4><p class='muted'>"+
     esc((snap.invoices||[]).length)+" invoice"+((snap.invoices||[]).length===1?"":"s")+", "+
     esc((snap.invoice_items||[]).length)+" invoice item"+((snap.invoice_items||[]).length===1?"":"s")+", "+
     esc((snap.payments||[]).length)+" payment"+((snap.payments||[]).length===1?"":"s")+", "+
     esc((snap.website_orders||[]).length)+" website order"+((snap.website_orders||[]).length===1?"":"s")+", "+
     esc((snap.website_order_items||[]).length)+" website order item"+((snap.website_order_items||[]).length===1?"":"s")+", "+
     esc((snap.enquiries||[]).length)+" enquiry"+((snap.enquiries||[]).length===1?"":"ies")+".</p>";
   if((snap.invoices||[]).length)html+="<h4>Invoices</h4>"+rows(snap.invoices,["invoice_no","customer_name","total","payment_status","paid_amount","due_amount","created_at"]);
   if((snap.website_orders||[]).length)html+="<h4>Website orders</h4>"+rows(snap.website_orders,["order_no","status","total","invoice_no","created_at"]);
   if((snap.enquiries||[]).length)html+="<h4>Enquiries</h4>"+rows(snap.enquiries,["name","phone","business","message","status","created_at"]);
 }else{
   html+="<h4>Record data</h4><pre class='recovery-json'>"+esc(JSON.stringify(row,null,2))+"</pre>";
   if(Array.isArray(snap.items)&&snap.items.length)html+="<h4>Related items</h4><pre class='recovery-json'>"+esc(JSON.stringify(snap.items,null,2))+"</pre>";
 }
 if(snap.auth_user){
   html+="<h4>Customer login account</h4><pre class='recovery-json'>"+esc(JSON.stringify({
     id:snap.auth_user.id,email:snap.auth_user.email,phone:snap.auth_user.phone,
     email_confirmed_at:snap.auth_user.email_confirmed_at,phone_confirmed_at:snap.auth_user.phone_confirmed_at,
     created_at:snap.auth_user.created_at,updated_at:snap.auth_user.updated_at
   },null,2))+"</pre>";
 }
 $("deletedRecordTitle").textContent=recoveryRecordLabel(r)+" — Recovery Details";
 $("deletedRecordDetails").innerHTML=html;
 $("deletedRecordDialog").showModal();
};
window.permanentlyDeleteRecovery=async id=>{
 if(!isAdmin)return;
 const rec=deletedRecords.find(x=>x.id===id);if(!rec)return;
 if(rec.status && rec.status!=="Deleted")return toast("This record is already removed from Recovery.",false);
 const label=recoveryRecordLabel(rec);
 if(!confirm("Permanently delete "+label+"? This cannot be undone and the record will be removed from Recovery permanently."))return;
 const {data,error}=await db.rpc("permanently_delete_recovery_record",{p_deleted_id:id});
 if(error)return toast(error.message||"Permanent delete failed.",false);
 toast("Permanently deleted from Recovery");
 await loadAll();
};
window.restoreDeletedRecord=async id=>{
 if(!isAdmin)return;
 const rec=deletedRecords.find(x=>x.id===id);if(!rec)return;
 if(!confirm("Restore "+recoveryRecordLabel(rec)+"?"))return;
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
let errorFinderRefreshTimer=null;
let errorFinderLoading=false;
async function loadErrorLogs(options={}){
 if(!isAdmin)return false;
 if(errorFinderLoading&&!options.force)return false;
 errorFinderLoading=true;
 const btn=$("refreshErrorLogs");
 const originalText=btn?.textContent||"↻ Refresh";
 if(options.force&&btn){btn.disabled=true;btn.textContent="↻ Refreshing…";}
 try{
   const {data,error}=await db.from("error_logs").select("id,created_at,app_name,app_version,page,url,action,error_name,message,stack,context,user_agent,status,resolved_at,resolved_by,fingerprint,occurrence_count,first_seen,last_seen").order("last_seen",{ascending:false}).limit(250);
   if(error)throw error;
   errorLogs=Array.isArray(data)?data:[];
   const apps=[...new Set(errorLogs.map(x=>x.app_name).filter(Boolean))].sort();
   const appSelect=$("errorLogAppFilter");
   if(appSelect){
     const current=appSelect.value;
     appSelect.innerHTML='<option value="">All apps</option>'+apps.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
     if(apps.includes(current))appSelect.value=current;
     else appSelect.value="";
   }
   renderErrorLogs();
   if(options.force)toast("Error Finder refreshed.");
   return true;
 }catch(error){
   console.warn("Error Finder:",error?.message||error);
   if(options.force)toast("Unable to refresh Error Finder: "+(error?.message||"Unknown error"),false,{action:"load_error_logs"});
   return false;
 }finally{
   errorFinderLoading=false;
   if(options.force&&btn){btn.disabled=false;btn.textContent=originalText;}
 }
}
function renderErrorLogs(){
 const box=$("errorLogsTable");if(!box)return;
 const sf=$("errorLogStatusFilter")?.value||"",af=$("errorLogAppFilter")?.value||"";
 const list=errorLogs.filter(x=>(!sf||x.status===sf)&&(!af||x.app_name===af));
 $("errorLogSummary").textContent=list.length+" error"+(list.length===1?"":"s")+" shown • "+errorLogs.filter(x=>x.status==="New").length+" new";
 $("errorLogsTable").innerHTML=table(["Time","App","Page","Error","Message","Status","Action"],list.map(x=>{
   const msg=String(x.message||"");
   const status='<select class="error-log-status" data-error-id="'+esc(x.id)+'"><option '+(x.status==="New"?"selected":"")+' >New</option><option '+(x.status==="Investigating"?"selected":"")+'>Investigating</option><option '+(x.status==="Fixed"?"selected":"")+'>Fixed</option><option '+(x.status==="Ignored"?"selected":"")+'>Ignored</option></select>';
   const copy='<button type="button" class="btn small copy-error" data-error-id="'+esc(x.id)+'">Copy Error</button>';
   return [isoDate(x.last_seen||x.created_at),esc(x.app_name),esc(x.page||"—"),esc(x.error_name||"Error"),'<span class="error-log-message">'+esc(msg)+'</span>',status+(Number(x.occurrence_count||1)>1?' <span class="badge warn">×'+Number(x.occurrence_count||1)+'</span>':""),copy];
 }));
}
async function updateErrorStatus(id,status){
 const row=errorLogs.find(x=>x.id===id);if(!row)return;
 if(status==="Ignored"){
   const {error:upsertError}=await db.from("error_fingerprints").upsert({fingerprint:row.fingerprint,reason:"Ignored from Error Finder",disabled_by:user?.id||null,disabled_at:new Date().toISOString()});
   if(upsertError)return toast("Unable to disable this error: "+upsertError.message,false,{action:"disable_error",context:{id}});
 }
 const {error}=await db.from("error_logs").update({status,resolved_at:status==="Fixed"?new Date().toISOString():null,resolved_by:status==="Fixed"?(user?.id||null):null}).eq("id",id);
 if(error)return toast("Unable to update error: "+error.message,false,{action:"update_error_status",context:{id,status}});
 row.status=status;row.resolved_at=status==="Fixed"?new Date().toISOString():null;row.resolved_by=status==="Fixed"?(user?.id||null):null;
 renderErrorLogs();
 toast(status==="Ignored"?"Error disabled. Future occurrences of this exact error will be suppressed.":status==="Fixed"?"Error marked resolved. It remains in history and will not be deleted.":"Error status updated.");
}
function formatErrorForCopy(x){
 return ["CleanCore Error Report","Time: "+new Date(x.created_at).toLocaleString("en-IN"),"App: "+(x.app_name||"—"),"Version: "+(x.app_version||"—"),"Page: "+(x.page||"—"),"Action: "+(x.action||"—"),"Error: "+(x.error_name||"Error"),"Message: "+(x.message||"—"),"URL: "+(x.url||"—"),"Stack: "+(x.stack||"—"),"Context: "+JSON.stringify(x.context||{})].join("\n");
}
document.addEventListener("change",e=>{const s=e.target.closest?.(".error-log-status");if(s)updateErrorStatus(s.dataset.errorId,s.value);});
$("testErrorFinder")?.addEventListener("click",async()=>{const ok=await reportClientErrorAndWait(new Error("Error Finder test: intentional diagnostic event."),{action:"error_finder_test",context:{trigger:"Settings > Error Finder > Test Error Finder"}});await loadErrorLogs();toast(ok?"Test error saved to Error Finder.":"Test error queued locally — Supabase logging failed. Check your connection/session.",ok);});
$("refreshErrorLogs")?.addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();await loadErrorLogs({force:true});});
async function reportClientErrorAndWait(err,meta={}){const e=err instanceof Error?err:new Error(String(err||"Unknown error"));const payload={p_app_name:meta.app_name||"CleanCore Manager",p_app_version:MANAGER_VERSION,p_page:location.pathname.split("/").pop()||"index.html",p_url:location.href,p_action:meta.action||"unhandled_error",p_error_name:e.name||"Error",p_message:String(e.message||e).slice(0,4000),p_stack:String(e.stack||"").slice(0,12000),p_context:{...(meta.context||{}),last_user_action:lastUserAction},p_user_agent:navigator.userAgent};return sendClientError(payload);}
$("analyzeErrorsWithAI")?.addEventListener("click",async()=>{
 if(!isAdmin)return;
 const box=$("errorAiResult");if(box){box.classList.remove("hidden");box.textContent="Analyzing current Manager + customer website errors…";}
 try{
   const {data:{session}}=await db.auth.getSession();
   const token=session?.access_token;
   if(!token)throw new Error("Your Manager session has expired. Sign in again.");
   const btn=$("analyzeErrorsWithAI");if(btn)btn.disabled=true;
    const resp=await fetch(SUPABASE_URL+"/functions/v1/error-finder-ai",{method:"POST",headers:{"Authorization":"Bearer "+token,"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:JSON.stringify({limit:30})});
   const raw=await resp.text();
   let data={};try{data=JSON.parse(raw);}catch{}
   if(!resp.ok)throw new Error(data?.error||data?.message||("Edge Function HTTP "+resp.status+": "+raw.slice(0,500)));
   if(box){const files=Array.isArray(data?.source_files)&&data.source_files.length?"\n\nSource files inspected:\n"+data.source_files.map(x=>"• "+x).join("\n"):"";box.innerHTML="<strong>AI Error Analysis</strong><pre>"+esc((data?.analysis||"No analysis returned.")+files)+"</pre>";}
   await loadErrorLogs();
 }catch(err){
   console.error("Error Finder AI analysis:",err);
   const detail=err?.message||"Unknown error";
   if(box)box.textContent="AI analysis failed: "+detail;
   toast("AI analysis failed: "+detail,false,{action:"error_finder_ai",context:{detail}});
 }
});
$("clearErrorLogs")?.addEventListener("click",async()=>{
 if(!isAdmin)return;
 if(!confirm("Clear all Error Finder history? This removes the current error records, but does not disable recurring errors."))return;
 const {error}=await db.from("error_logs").delete().neq("id","00000000-0000-0000-0000-000000000000");
 if(error){reportClientError(error,{action:"clear_error_logs"});return toast("Unable to clear Error Finder history: "+error.message,false);}
 errorLogs=[];
 renderErrorLogs();
 toast("Error Finder history cleared.");
});
document.addEventListener("click",async e=>{const b=e.target.closest?.(".copy-error");if(!b)return;const x=errorLogs.find(r=>r.id===b.dataset.errorId);if(!x)return;try{await navigator.clipboard.writeText(formatErrorForCopy(x));toast("Error copied");}catch(err){toast("Copy failed. Select the error manually.",false,{action:"copy_error"});}});
function billStatusBadge(v){const raw=v||"Draft";const x=raw==="Draft"?"Pending":raw;return "<span class='badge "+(x==="Cancelled"?"danger":x==="Completed"?"ok":x==="Pending"?"":"warn")+"'>"+esc(x)+"</span>"}
function paymentStatusBadge(v){const raw=v||"Unpaid";const x=raw==="Unpaid"?"Pending":raw;return "<span class='badge "+(x==="Paid"?"ok":(x==="Partially Paid"||x==="Credit")?"warn":"")+"'>"+esc(x)+"</span>"}
function deliveryStatusBadge(v){const x=v||"Pending";return "<span class='badge "+(x==="Delivered"?"ok":x==="Out for Delivery"?"warn":x==="Failed"?"danger":"")+"'>"+esc(x)+"</span>"}
function invoicePaymentChoice(inv){
 if((inv?.payment_status||"")==="Paid")return "PAID";
 if(inv?.payment_method==="Pending")return "UNPAID";
 if(inv?.payment_method==="COD")return "COD";
 if(inv?.payment_method==="Credit")return "CREDIT";
 if((inv?.payment_status||"")==="Partially Paid")return "PARTIAL";
 return "UNPAID";
}
function syncInvoiceStatusPaymentFields(){
 const choice=$("statusPaymentChoice")?.value||"UNPAID";
 const methodWrap=$("statusPaymentMethodWrap"),partialWrap=$("statusPartialAmountWrap");
 const needsMethod=choice==="PAID"||choice==="PARTIAL";
 methodWrap?.classList.toggle("hidden",!needsMethod);
 partialWrap?.classList.toggle("hidden",choice!=="PARTIAL");
 const hint=$("statusPaymentHint");
 if(hint)hint.textContent=choice==="COD"?"COD means collect on delivery. The invoice remains Unpaid until a payment is recorded.":choice==="CREDIT"?"Credit means pay later. The invoice remains Unpaid until a payment is recorded.":choice==="PAID"?"Marking Paid records the outstanding balance as received.":choice==="PARTIAL"?"Enter the amount received now. The invoice becomes Partially Paid unless the balance reaches zero.":"No payment has been received. The invoice remains Unpaid.";
}
window.updateInvoiceStatus=async function(id,billStatus,deliveryStatus,paymentChoice,paymentMethod,partialAmount){
 const inv=invoices.find(x=>x.id===id);if(!inv)return;
 const currentChoice=invoicePaymentChoice(inv);
 const paymentChanged=paymentChoice&&paymentChoice!==currentChoice;
 const fulfillmentChanged=billStatus!==(inv.bill_status||"Confirmed")||deliveryStatus!==(inv.delivery_status||"Pending");
 if(!paymentChanged&&!fulfillmentChanged){$("invoiceStatusDialog").close();return;}
 if(!isAdmin){
   if(paymentChanged){
     const ok=await submitChange("billing","invoice_payment_selection_update","invoices",id,{payment_choice:paymentChoice,payment_method:paymentMethod||null,partial_amount:partialAmount||null},"Employee payment selection change");
     if(!ok)return;
   }
   if(fulfillmentChanged){
     const ok=await submitChange("billing","invoice_status_update","invoices",id,{bill_status:billStatus,delivery_status:deliveryStatus},"Employee bill/delivery status change");
     if(!ok)return;
   }
   $("invoiceStatusDialog").close();
   toast(paymentChanged&&fulfillmentChanged?"Payment and bill status sent for Manager approval.":paymentChanged?"Payment change sent for Manager approval.":"Bill status sent for Manager approval.");
   return;
 }
 if(paymentChanged){
   const {error}=await db.rpc("set_invoice_payment_selection",{p_invoice_id:id,p_payment_choice:paymentChoice,p_payment_method:paymentMethod||null,p_partial_amount:partialAmount||null});
   if(error)return toast(error.message||"Unable to update payment.",false);
 }
 if(fulfillmentChanged){
   const {error}=await db.rpc("update_invoice_fulfillment",{p_invoice_id:id,p_bill_status:billStatus,p_delivery_status:deliveryStatus});
   if(error)return toast(error.message||"Unable to update bill status.",false);
 }
 await loadAll();
 $("invoiceStatusDialog").close();
 toast(paymentChanged&&fulfillmentChanged?"Payment and bill status updated":paymentChanged?"Payment updated":"Bill status updated");
};
window.openInvoiceStatus=async function(id){
 const inv=invoices.find(x=>x.id===id);if(!inv)return;
 $("statusInvoiceId").value=id;
 $("statusInvoiceNo").textContent=inv.invoice_no||"—";
 $("statusBill").value=inv.bill_status||"Confirmed";
 $("statusDelivery").value=inv.delivery_status||"Pending";
 $("statusPaymentStatus").textContent=inv.payment_status||"Unpaid";
 $("statusPaidAmount").textContent=money(inv.paid_amount);
 $("statusDueAmount").textContent=money(inv.due_amount);
 $("statusPaymentMethod").textContent=inv.payment_method||"—";
 $("statusPaymentChoice").value=invoicePaymentChoice(inv);
 $("statusPaymentMethodSelect").value=["Cash","UPI","Bank Transfer","Card","Cheque","Other"].includes(inv.payment_method)?inv.payment_method:"Cash";
 $("statusPartialAmount").value="";
 syncInvoiceStatusPaymentFields();
 $("recordStatusPayment")?.classList.add("hidden");
 $("invoiceStatusDialog").showModal();
};
function renderSales(){
 const from=$("salesFrom")?.value,to=$("salesTo")?.value;
 let list=invoices.filter(isSaleDocument);
 if(from){const d=new Date(from+"T00:00:00");list=list.filter(x=>new Date(x.created_at)>=d)}
 if(to){const d=new Date(to+"T23:59:59");list=list.filter(x=>new Date(x.created_at)<=d)}
 const websiteInvoiceIds=new Set(websiteOrders.map(o=>o.invoice_id).filter(Boolean));
 const formatSaleSource=x=>websiteInvoiceIds.has(x.id)||x.source==="Website"?"Website":(x.source||"Offline");
 $("salesSummary").textContent=list.length+" bill"+(list.length===1?"":"s")+" • "+money(list.reduce((a,x)=>a+Number(x.total),0))+" sales";
 $("salesTable").innerHTML=table(["Invoice","Customer","Total","Payment","Due","Payment Method","Sale From","Bill Status","Delivery","Date","Action"],list.map(x=>[
  esc(x.invoice_no),esc(x.customer_name),money(x.total),
  paymentStatusBadge(x.payment_status),money(x.due_amount),x.payment_method?esc(x.payment_method):"<span class=\"muted\">Pending</span>",
  "<span class=\"badge ok\">"+esc(formatSaleSource(x))+"</span>",
  "<span class=\"badge "+(x.bill_status==="Confirmed"?"ok":x.bill_status==="Completed"?"ok":x.bill_status==="Cancelled"?"danger":"")+"\">"+esc(x.bill_status==="Draft"?"Pending":(x.bill_status||"Pending"))+"</span>",
  deliveryStatusBadge(x.delivery_status),new Date(x.created_at).toLocaleString("en-IN"),
  '<button type="button" class="link view-bill" data-invoice-id="'+esc(x.id)+'">View</button> <button type="button" class="link" onclick="openInvoiceStatus(\''+x.id+'\')">Update status</button> <button type="button" class="icon-delete-btn" title="Delete invoice" aria-label="Delete invoice" onclick="deleteInvoice(\''+x.id+'\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6"/></svg></button>'
 ]));
}

$("statusPaymentChoice")?.addEventListener("change",syncInvoiceStatusPaymentFields);
$("invoiceStatusForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const id=$("statusInvoiceId").value;
 const choice=$("statusPaymentChoice").value;
 const method=$("statusPaymentMethodSelect").value;
 const partial=Number($("statusPartialAmount").value||0);
 if(choice==="PARTIAL"&&!((partial>0)&&Number.isFinite(partial)))return toast("Enter the amount received now.",false);
 await window.updateInvoiceStatus(id,$("statusBill").value,$("statusDelivery").value,choice,method,partial);
});
$("closeInvoiceStatus")?.addEventListener("click",()=>$("invoiceStatusDialog")?.close());
function customerStats(id){
 const bills=invoices.filter(x=>x.customer_id===id&&isSaleDocument(x));
 const totalPurchases=bills.reduce((a,x)=>a+Number(x.total||0),0);
 const totalPaid=bills.reduce((a,x)=>a+Number(x.paid_amount||0),0);
 const creditDue=bills.reduce((a,x)=>a+Number(x.due_amount||0),0);
 const lastPurchase=bills.length?bills.reduce((a,x)=>new Date(x.created_at)>new Date(a)?x.created_at:a,bills[0].created_at):null;
 return {bills,totalPurchases,totalPaid,creditDue,lastPurchase};
}
function customerPurchaseDate(id){
 const stats=customerStats(id);
 if(stats.lastPurchase)return stats.lastPurchase;
 const webDates=(websiteOrders||[]).filter(x=>x.customer_id===id&&x.created_at).map(x=>x.created_at);
 if(webDates.length)return webDates.sort((a,b)=>new Date(b)-new Date(a))[0];
 const recoveryDates=(deletedRecords||[]).flatMap(r=>{
   if(r.entity_type==="customer" && r.original_id===id){
     const snap=r.snapshot||{};
     const row=snap.row||{};
     const dates=[];
     if(row.created_at)dates.push(row.created_at);
     (snap.invoices||[]).forEach(x=>{if(x.created_at)dates.push(x.created_at);});
     (snap.website_orders||[]).forEach(x=>{if(x.created_at)dates.push(x.created_at);});
     return dates;
   }
   if(r.entity_type==="invoice"){
     const snap=r.snapshot||{};
     const row=snap.invoice||snap.row||{};
     return row.customer_id===id&&row.created_at?[row.created_at]:[];
   }
   return [];
 });
 return recoveryDates.length?recoveryDates.sort((a,b)=>new Date(b)-new Date(a))[0]:null;
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
 $("customersTable").innerHTML=table(["Customer","Business","Phone","Email","Customer source","Total purchases","Paid","Amount due","Last purchase","Action"],customers.map(x=>{
  const source=String(x.customer_source||"").trim() || (x.auth_user_id?"Website":"Manager");
  const sourceBadge=source==="Website"?"<span class='badge ok'>Website</span>":"<span class='badge'>"+esc(source)+"</span>";
  const s=customerStats(x.id);
  const purchaseDate=customerPurchaseDate(x.id);
  const recovered=!!((deletedRecords||[]).some(r=>r.entity_type==="customer"&&r.original_id===x.id)||(deletedRecords||[]).some(r=>r.entity_type==="invoice"&&((r.snapshot?.invoice||r.snapshot?.row||{}).customer_id===x.id)));
  const purchaseLabel=purchaseDate?isoDate(purchaseDate)+(s.lastPurchase?"":" *"):"—";
  return [esc(x.name),esc(x.business_name),esc(x.phone),esc(x.email),sourceBadge,money(s.totalPurchases),money(s.totalPaid),money(s.creditDue),purchaseLabel,
   "<button class=\"link\" onclick=\"viewCustomerHistory('"+x.id+"')\">Purchase history</button> <button class=\"link\" onclick=\"editCustomer('"+x.id+"')\">Edit</button> <button class=\"link danger\" onclick=\"deleteCustomer('"+x.id+"')\">Remove</button>"];
 }));
 $("billingCustomer").innerHTML="<option value=\"\">New / enter customer</option>"+customers.map(x=>"<option value=\""+x.id+"\">"+esc(x.name)+(x.business_name?" — "+esc(x.business_name):"")+" ("+esc(x.phone||x.email||"")+")</option>").join("");
}

window.deleteCustomer=async function(id){
 const customer=customers.find(x=>x.id===id);if(!customer)return;
 const s=customerStats(id);
 const warning=s.bills.length
   ?"Move this customer and ALL related website orders, order items, invoices, payments, and enquiries to Recovery? They will disappear from the active app and customer website. The customer login will also be signed out. You can restore everything from Recovery."
   :"Move this customer and ALL related website account data to Recovery? It will disappear from the active app and customer website and can be restored from Recovery.";
 if(!confirm(warning))return;
 if(!isAdmin){
   const ok=await submitChange("customers","customer_delete","customers",id,{archived_at:new Date().toISOString()},"Employee customer removal");
   if(ok)await loadAll();
   return;
 }
 const {data,error}=await db.rpc("delete_record_with_recovery",{p_entity_type:"customer",p_original_id:id});
 if(error)return toast(error.message||"Unable to move customer to Recovery.",false);
 toast("Customer and all related data moved to Recovery");
 await loadAll();
};
window.viewCustomerHistory=function(id){
 const c=customers.find(x=>x.id===id);if(!c)return;
 const s=customerStats(id);
 $("customerHistoryTitle").textContent=(c.business_name||c.name)+" — Purchase History";
 $("customerHistorySummary").innerHTML="<div class=\"history-cards\"><div><span>Total purchases</span><b>"+money(s.totalPurchases)+"</b></div><div><span>Total paid</span><b>"+money(s.totalPaid)+"</b></div><div><span>Amount due</span><b>"+money(s.creditDue)+"</b></div><div><span>Last purchase</span><b>"+(s.lastPurchase?isoDate(s.lastPurchase):"—")+"</b></div></div>";
 $("customerHistoryTable").innerHTML=table(["Invoice","Purchase date","Total","Paid","Amount due","Payment status","Due date","Action"],s.bills.map(inv=>[
   esc(inv.invoice_no),new Date(inv.created_at).toLocaleString("en-IN"),money(inv.total),money(inv.paid_amount),money(inv.due_amount),esc(inv.payment_status||"Unpaid"),inv.due_date?isoDate(inv.due_date):"—",
   Number(inv.due_amount||0)>0?"<button class=\"link\" onclick=\"recordPayment(\'"+inv.id+"\')\">Record payment</button>":"Paid"
 ]));
 $("customerHistoryDialog").showModal();
};
$("closeCustomerHistory").onclick=function(){$("customerHistoryDialog").close()};
window.recordPayment=function(invoiceId){
 const inv=invoices.find(x=>x.id===invoiceId);if(!inv||Number(inv.due_amount||0)<=0)return;
 $("paymentInvoiceId").value=invoiceId;
 $("paymentInvoiceNo").textContent=inv.invoice_no;
 $("paymentCustomerName").textContent=inv.customer_name;
 $("paymentOutstanding").textContent=money(inv.due_amount);
 $("paymentDate").value=dateKey();
 $("paymentAmount").value=Number(inv.due_amount).toFixed(2);
 $("paymentMethod").value="Cash";
 $("paymentReference").value="";
 $("paymentNotes").value="";
 $("paymentDialog").showModal();
};
$("closePayment").onclick=function(){$("paymentDialog").close()};
$("paymentForm").addEventListener("submit",async function(e){
 e.preventDefault();
 const invoiceId=$("paymentInvoiceId").value,inv=invoices.find(x=>x.id===invoiceId);
 if(!inv)return toast("Invoice not found",false);
 const amount=+$("paymentAmount").value;
 if(!(amount>0&&amount<=Number(inv.due_amount||0)))return toast("Payment must be greater than 0 and not exceed the outstanding amount.",false);
 const payment_date=$("paymentDate").value||dateKey();
 const payment_method=$("paymentMethod").value;
 const reference=$("paymentReference").value.trim();
 const notes=$("paymentNotes").value.trim();
 if(!isAdmin){
   const ok=await submitChange("billing","payment_create","invoices",inv.id,{customer_id:inv.customer_id,amount,payment_date,payment_method,reference,notes},"Employee payment record");
   if(ok)$("paymentDialog").close();
   return;
 }
 const ins=await db.from("payments").insert({invoice_id:inv.id,customer_id:inv.customer_id,amount,payment_date,payment_method,reference,notes});
 if(ins.error)return toast(ins.error.message,false);
 const {data:paymentRows,error:rowsError}=await db.from("payments").select("amount,payment_method").eq("invoice_id",inv.id);
 if(rowsError)return toast(rowsError.message,false);
 const paid=(paymentRows||[]).reduce((sum,row)=>sum+Number(row.amount||0),0);
 const due=Math.max(Number(inv.total||0)-paid,0);
 const status=due===0?"Paid":"Partially Paid";
 const methods=[...new Set((paymentRows||[]).map(row=>row.payment_method).filter(Boolean))];
 const summaryMethod=methods.length===1?methods[0]:"Multiple";
 const upd=await db.from("invoices").update({
   paid_amount:paid,
   due_amount:due,
   payment_status:status,
   due_date:due>0?inv.due_date:null,
   payment_method:summaryMethod
 }).eq("id",inv.id);
 if(upd.error)return toast(upd.error.message,false);
 $("paymentDialog").close();toast("Payment recorded");await loadAll();
});
function renderInvestmentHistory(){
 const el=$("investmentHistory");if(!el)return;
 el.innerHTML=investments.length?table(["Date","Amount","Name / Purpose",""],investments.map(x=>[isoDate(x.investment_date),money(x.amount),esc(x.notes||"—"),"<button type='button' class='link danger' onclick=\"deleteInvestment('"+x.id+"')\">Delete</button>"])):"<div class='empty'>No investments yet.</div>";
}
async function addInvestment(){
 const amount=Number($("investmentAmount")?.value);const date=$("investmentDate")?.value;const notes=$("investmentNotes")?.value?.trim()||"";
 if(!Number.isFinite(amount)||amount<=0)return toast("Enter a valid investment amount",false);
 if(!date)return toast("Select an investment date",false);
 const {data,error}=await db.from("manager_investments").insert({investment_date:date,amount,notes}).select("id,investment_date,amount,notes,created_at,updated_at").single();
 if(error)return toast(error.message,false);
 investments=[data,...investments];$("investmentAmount").value="";$("investmentNotes").value="";$("investmentDate").value=dateKey(new Date());renderAll("dashboard");renderInvestmentHistory();toast("Investment added");
}
window.deleteInvestment=async id=>{if(!confirm("Delete this investment?"))return;const {error}=await db.from("manager_investments").delete().eq("id",id);if(error)return toast(error.message,false);investments=investments.filter(x=>x.id!==id);renderAll("dashboard");renderInvestmentHistory();toast("Investment deleted")};
function openInvestment(){const d=$("investmentDialog");if(!d)return;const dt=$("investmentDate");if(dt)dt.value=dateKey(new Date());renderInvestmentHistory();d.classList.add("open");d.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");}
window.openInvestment=openInvestment;
if($("investmentBox"))$("investmentBox").addEventListener("click",openInvestment);
function closeInvestment(){const d=$("investmentDialog");if(!d)return;d.classList.remove("open");d.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");}
if($("closeInvestment"))$("closeInvestment").onclick=closeInvestment;
if($("investmentDialog"))$("investmentDialog").addEventListener("click",e=>{if(e.target.id==="investmentDialog")closeInvestment()});
if($("investmentForm"))$("investmentForm").addEventListener("submit",e=>{e.preventDefault();addInvestment()});
function syncProductUnit(){
 const select=$("punitSelect"),custom=$("punitCustom"),hidden=$("punit");
 if(!select||!custom||!hidden)return;
 if(select.value==="__custom__"){
   custom.hidden=false;
   custom.required=true;
   hidden.value=custom.value.trim();
 }else{
   custom.hidden=true;
   custom.required=false;
   hidden.value=select.value;
 }
}
function setProductUnit(value){
 const select=$("punitSelect"),custom=$("punitCustom"),hidden=$("punit");
 const v=String(value||"5 Litre Can");
 if(!select||!custom||!hidden)return;
 const option=[...select.options].find(o=>o.value===v);
 if(option){select.value=v;custom.value="";custom.hidden=true;custom.required=false;hidden.value=v;}
 else{select.value="__custom__";custom.value=v;custom.hidden=false;custom.required=true;hidden.value=v;}
}
function resetProductForm(){
 editingProductId=null;
 ["pname","phsn","pstock","pdesc","pdetails"].forEach(id=>$(id).value="");
 setProductUnit("5 Litre Can");
 $("productMrpInput").value="";
 $("sellingPriceInput").value="";
 $("finalSellingCost").value="";
 $("plow").value=5;$("pimages").value="";$("pvideos").value="";
 $("productMedia").innerHTML="";$("productDialogTitle").textContent="Add New Product";
}
$("punitSelect").addEventListener("change",syncProductUnit);
$("punitCustom").addEventListener("input",syncProductUnit);
configureProductNumberFields();
$("addProduct").onclick=()=>{resetProductForm();$("productDialog").showModal();unlockProductNumberFields()};
function configureProductNumberFields(){
 ["productMrpInput","sellingPriceInput","finalSellingCost","pstock","plow"].forEach(id=>{
   const el=$(id);if(!el)return;
   el.type="number";
   el.inputMode="decimal";
   el.min="0";
   el.step="0.01";
   el.removeAttribute("readonly");
   el.removeAttribute("disabled");
   el.style.pointerEvents="auto";
   el.style.userSelect="text";
   el.tabIndex=0;
 });
}
function unlockProductNumberFields(){configureProductNumberFields();}
window.editProduct=id=>{
 const p=products.find(x=>x.id===id);if(!p)return;editingProductId=id;
 $("pname").value=p.name||"";setProductUnit(p.unit);$("phsn").value=p.hsn_code||"";$("productMrpInput").value=p.mrp??"";$("sellingPriceInput").value=p.selling_price??"";$("finalSellingCost").value=p.final_selling_price??"";$("pstock").value=p.stock??0;$("plow").value=p.low_stock_threshold??5;
 $("pdesc").value=p.description||"";$("pdetails").value=p.additional_details||"";$("pimages").value="";$("pvideos").value="";
 $("productDialogTitle").textContent="Edit Product";renderProductMedia(p);configureProductNumberFields();$("productDialog").showModal();unlockProductNumberFields();
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
configureProductNumberFields();
["productMrpInput","sellingPriceInput","finalSellingCost","pstock","plow"].forEach(id=>{
 const el=$(id);
 if(el)el.addEventListener("input",()=>{if(el.value!==""&&!Number.isFinite(el.valueAsNumber))el.value="";});
});
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("pname").value.trim(),unit=$("punit").value.trim(),mrp=$("productMrpInput").valueAsNumber,price=$("sellingPriceInput").valueAsNumber,finalPrice=$("finalSellingCost").valueAsNumber,stock=$("pstock").valueAsNumber,low=$("plow").valueAsNumber,hsn=$("phsn").value.trim();
 if(!name)return toast("Enter product name",false);
 if(![mrp,price,finalPrice,stock,low].every(Number.isFinite))return toast("Enter valid numbers in MRP, Selling Price, Final Selling Price, Stock and Low-stock alert.",false);
 if([mrp,price,finalPrice,stock,low].some(v=>v<0))return toast("Numeric product values cannot be negative.",false);
 const old=editingProductId?products.find(p=>p.id===editingProductId):null;
 let image_urls=mediaUrls(old,"image_urls"),video_urls=mediaUrls(old,"video_urls");
 if(!isAdmin){
   const x={name,unit,hsn_code:hsn,mrp,selling_price:price,final_selling_price:finalPrice,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
   const ok=await submitChange("products",editingProductId?"product_update":"product_create","products",editingProductId,x,"Employee product change");
   if(ok)$("productDialog").close();
   return;
 }
 try{
  if($("pimages").files.length)image_urls=image_urls.concat(await uploadFiles($("pimages").files,"images"));
  if($("pvideos").files.length)video_urls=video_urls.concat(await uploadFiles($("pvideos").files,"videos"));
 }catch(err){return toast("Media upload failed: "+err.message,false)}
 const x={name,unit:$("punit").value.trim(),hsn_code:hsn,mrp,selling_price:price,final_selling_price:finalPrice,stock,low_stock_threshold:low,description:$("pdesc").value.trim(),additional_details:$("pdetails").value.trim(),image_urls,video_urls};
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
   <input class="lq" type="text" inputmode="decimal" min="1" step="1" value="1" aria-label="Quantity">
   <input class="lr" type="text" inputmode="decimal" min="0" step="0.01" value="${products[0]?.selling_price||0}" aria-label="Bill price">
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
$("billPaymentMethod").onchange=calc;
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
 const type=$("paymentType")?.value||"PENDING";
 const bill=Number(total||0);
 const method=$("billPaymentMethod")?.value||"Cash";
 if(type==="PENDING")return {type,method:"Pending",status:"Unpaid",paid:0,due:bill,dueDate:null};
 if(type==="PAID")return {type,method,status:"Paid",paid:bill,due:0,dueDate:null};
 if(type==="COD")return {type,method:"COD",status:"Unpaid",paid:0,due:bill,dueDate:null};
 if(type==="CREDIT")return {type,method:"Credit",status:"Unpaid",paid:0,due:bill,dueDate:$("dueDate").value||null};
 let paid=Math.min(bill,Math.max(0,Number($("payingNowInput").value||0)));
 return {type,method, status:paid>=bill?"Paid":paid>0?"Partially Paid":"Unpaid",paid,due:Math.max(0,bill-paid),dueDate:paid>=bill?null:($("dueDate").value||null)};
}
function syncPaymentInput(){
 const type=$("paymentType")?.value||"PENDING";
 const input=$("payingNowInput"),methodWrap=$("billPaymentMethodWrap"),dueWrap=$("billDueDateWrap");
 if(!input)return;
 const showPart=type==="PART";
 input.classList.toggle("hidden",!showPart);
 if(showPart){
   if(!Number.isFinite(Number(input.value))||Number(input.value)<=0)input.value=(billTotal/2).toFixed(2);
   input.removeAttribute("readonly");
 }else{
   input.setAttribute("readonly","readonly");
   const state=paymentState(billTotal);
   input.value=state.paid.toFixed(2);
 }
 if(methodWrap)methodWrap.classList.toggle("hidden",type==="COD"||type==="CREDIT");
 if(dueWrap)dueWrap.classList.toggle("hidden",!(type==="CREDIT"||(type==="PART"&&Number(input.value||0)<billTotal)));
}
function updatePaymentFields(){
 const state=paymentState(billTotal);
 const showDueDate=state.type==="CREDIT"||(state.type==="PART"&&state.due>0);
 $("billDueDateWrap").classList.toggle("hidden",!showDueDate);
 if(!showDueDate)$("dueDate").value="";
 $("payingNowShow").textContent=money(state.paid);
 $("creditAmountShow").textContent=money(state.due);
 if($("payingNowInput")&&!$("payingNowInput").classList.contains("hidden")){
   const max=billTotal;
   let v=Math.min(max,Math.max(0,Number($("payingNowInput").value||0)));
   $("payingNowInput").value=v.toFixed(2);
 }
 $("paymentPreview").textContent=billTotal
   ?state.status+" • Paid now "+money(state.paid)+" • Amount due "+money(state.due)+(state.type==="COD"?" • Collect on delivery":"")
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
 $("billSource").value="Offline";
 const paymentBox=document.querySelector(".payment-box"); if(paymentBox)paymentBox.classList.remove("hidden");
 $("paymentType").value="PENDING";
 $("billPaymentMethod").value="Cash";
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
   $("paymentType").value="PENDING";
   $("billPaymentMethod").value="Cash";
   $("payingNowInput").value="0";
 }
 calc();
};
$("billForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const saveButton=e.submitter||$("saveBillButton");
 if(saveButton){saveButton.disabled=true;saveButton.dataset.originalText=saveButton.textContent;saveButton.textContent="Generating…";}
 try{
   const customer=currentBillCustomer();
   if(!customer)throw new Error("Select an existing customer first. Add the customer in Customers, then create the bill.");
   const name=customer.name||"",business=customer.business_name||"",phone=normalizePhone(customer.phone||""),email=customer.email||"";
   const customerGstin=String(customer.gstin||"").trim().toUpperCase();
   const documentType=$("documentType").value||"SALE";
   const isQuotation=documentType==="QUOTATION";
   const billType=$("billType").value;
   if(!["SALE","QUOTATION"].includes(documentType))throw new Error("Invalid document type.");
   if(!validPhone(phone))throw new Error("The customer phone number must be exactly 10 digits.");
   if(billType==="GST"&&!validGstin(customerGstin))throw new Error("This customer does not have a valid GSTIN. Add the GSTIN in Customer data first.");
   const gstin=billType==="GST"?customerGstin:"";
   const gp=billType==="GST"?(+$("gstPercent").value||0):0;
   if(billType==="GST"&&!(gp>0&&gp<=100))throw new Error("Enter a valid GST rate for this GST bill.");

   const items=[...document.querySelectorAll(".line")].map(r=>{
     const p=products.find(x=>x.id===r.querySelector(".lp").value);
     return {p,q:+r.querySelector(".lq").value||0,rate:Math.max(0,+r.querySelector(".lr").value||0)};
   }).filter(x=>x.p&&x.q>0);
   if(!items.length)throw new Error("Add at least one item.");
   if(!isQuotation)for(const x of items)if(x.q>x.p.stock)throw new Error(`${x.p.name}: only ${x.p.stock} cans in stock.`);

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
   const itemPayload=items.map(x=>({product_id:x.p.id,product_name:x.p.name,hsn_code:x.p.hsn_code||"",qty:x.q,unit_price:x.rate,cost_price:x.p.cost_price,line_total:x.rate*x.q,line_profit:isQuotation?0:(x.rate-x.p.cost_price)*x.q}));

   if(!isAdmin){
     const payload={
       invoice_no:no,document_type:documentType,source:$("billSource").value||"Offline",customer_id:customer.id,customer_name:name,customer_phone:phone,gstin,customer_business:business,customer_email:email,
       billing_address:customer.billing_address||"",delivery_address:customer.delivery_address||"",subtotal,discount,gst_percent:gp,gst_amount:gst,
       cgst_percent:cgstPercent,cgst_amount:cgstAmount,sgst_percent:sgstPercent,sgst_amount:sgstAmount,igst_percent:igstPercent,igst_amount:igstAmount,total,profit:storedProfit,
       payment_status:pay.status,paid_amount:pay.paid,due_amount:pay.due,due_date:pay.dueDate,payment_method:pay.method,items:itemPayload
     };
     const ok=await submitChange("billing","invoice_create","invoices",null,payload,isQuotation?"Employee quotation submitted for manager approval":"Employee bill submitted for manager approval");
     if(ok){
       $("billForm").reset();$("documentType").value="SALE";const paymentBox=document.querySelector(".payment-box");if(paymentBox)paymentBox.classList.remove("hidden");$("lines").innerHTML="";rebuildLines();
       toast(isQuotation?"Quotation sent for Manager approval.":"Bill sent for Manager approval.");
     }
     return;
   }

   const invoicePayload={
     invoice_no:no,document_type:documentType,source:$("billSource").value||"Offline",customer_id:customer.id,customer_name:name,customer_phone:phone,gstin,customer_business:business,customer_email:email,
     billing_address:customer.billing_address||"",delivery_address:customer.delivery_address||"",subtotal,discount,gst_percent:gp,gst_amount:gst,
     cgst_percent:cgstPercent,cgst_amount:cgstAmount,sgst_percent:sgstPercent,sgst_amount:sgstAmount,igst_percent:igstPercent,igst_amount:igstAmount,total,profit:storedProfit,
     paid_amount:pay.paid,due_amount:pay.due,due_date:pay.dueDate,payment_method:pay.method
   };
   const {data,error}=await db.rpc("create_manager_bill",{p_invoice:invoicePayload,p_items:itemPayload});
   if(error){const rpcError=new Error(error.message||"Bill could not be generated.");rpcError.name="SupabaseRpcError";rpcError.code=error.code||"";rpcError.details=error.details||"";rpcError.hint=error.hint||"";throw rpcError;}
   const billId=data?.id;
   if(!billId)throw new Error("Bill was not returned by the server. Nothing was marked as generated.");
   // Refresh only the bill and stock records instead of rebuilding every
   // Manager query after a successful bill.
   const [savedResult,productResult]=await Promise.all([
     db.from("invoices").select("id,invoice_no,customer_id,customer_name,customer_phone,gstin,customer_business,customer_email,billing_address,delivery_address,subtotal,discount,total,profit,created_at,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,payment_status,paid_amount,due_amount,due_date,payment_method,place_of_supply,document_type,bill_status,delivery_status,source").eq("id",billId).single(),
     db.from("products").select("id,name,unit,selling_price,cost_price,stock,low_stock_threshold,description,additional_details,image_urls,video_urls,hsn_code").order("name")
   ]);
   if(savedResult.error)throw savedResult.error;
   if(productResult.error)throw productResult.error;
   const savedInv=savedResult.data||null;
   if(savedInv)invoices=[savedInv,...invoices.filter(x=>x.id!==savedInv.id)];
   products=productResult.data||products;
   renderAll("billing");
   $("billForm").reset();$("documentType").value="SALE";const paymentBox=document.querySelector(".payment-box");if(paymentBox)paymentBox.classList.remove("hidden");$("lines").innerHTML="";rebuildLines();
   toast((isQuotation?"Quotation ":"Bill ")+(data.invoice_no||no)+" generated successfully.");
   if(savedInv){
     // Bill generation is intentionally kept inside Manager. Do not open
     // WhatsApp, create/download a PDF, or call external delivery services
     // automatically after saving. The user can open/print the invoice from
     // the Manager Sales table when needed.
     await window.viewInvoice(savedInv.id);
   }
 }catch(err){
   if(preopenedWhatsAppWindow){
     try{if(!preopenedWhatsAppWindow.closed)preopenedWhatsAppWindow.close();}catch(_){}
     if(window.__cleancoreBillWhatsAppWindow===preopenedWhatsAppWindow)window.__cleancoreBillWhatsAppWindow=null;
   }
   const detail=err?.message||"Bill could not be generated.";
   const billError=err instanceof Error?err:new Error(String(detail));
   if(err?.code)billError.code=err.code;
   if(err?.details)billError.details=err.details;
   if(err?.hint)billError.hint=err.hint;
   console.error("CleanCore bill generation error",billError);
   reportClientError(billError,{action:"generate_bill",context:{
     document_type:$("documentType")?.value||"",
     customer_id:$("billingCustomer")?.value||"",
     bill_type:$("billType")?.value||"",
     payment_type:$("paymentType")?.value||"",
     payment_method:$("billPaymentMethod")?.value||"",
     line_count:document.querySelectorAll(".line").length,
     supabase_code:err?.code||"",
     supabase_details:err?.details||"",
     supabase_hint:err?.hint||""
   }});
   toast(detail,false);
 }finally{
   if(saveButton){saveButton.disabled=false;saveButton.textContent=saveButton.dataset.originalText||"Generate Bill";}
 }
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
 ["customerName","businessName","customerPhone","customerEmail","customerGstin","customerSource",
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
 $("customerSource").value=c.customer_source||"Existing Customer";
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
   customer_source:$("customerSource").value,
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
$("addEnquiry").onclick=()=>{$("enquiryForm").reset();$("estatus").value="New";$("enquiryDialog").showModal()};
$("enquiryForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={name:$("ename").value.trim(),phone:$("ephone").value.trim(),business:$("ebusiness").value.trim(),message:$("emessage").value.trim(),status:$("estatus").value,source:"manager"};
  if(!isAdmin){const ok=await submitChange("enquiries","enquiry_create","enquiries",null,payload,"Employee lead/enquiry change");if(ok)$("enquiryDialog").close();return;}
  const {error}=await db.from("enquiries").insert(payload);
  if(error)return toast(error.message,false);
  $("enquiryDialog").close();toast("Enquiry saved as Offline lead");await loadAll();
});
 const from=$("salesFrom")?.value,to=$("salesTo")?.value;
 let list=invoices.filter(isSaleDocument);
 if(from){const d=new Date(from+"T00:00:00");list=list.filter(x=>new Date(x.created_at)>=d)}
 if(to){const d=new Date(to+"T23:59:59");list=list.filter(x=>new Date(x.created_at)<=d)}
 if(from&&to&&from>to)return toast("From date cannot be after To date.",false);
 if(!list.length)return toast("No sales found in the selected date range.",false);
 const rows=[["Invoice","Customer","Phone","Sale From","Subtotal","Discount","GST %","GST Amount","Total","Profit","Paid","Credit","Payment Status","Due Date","Date"],
 ...list.map(x=>[x.invoice_no,x.customer_name,x.customer_phone,x.source||"Offline",x.subtotal,x.discount,x.gst_percent||0,x.gst_amount||0,x.total,x.profit,x.paid_amount||0,x.due_amount||0,x.payment_status||"Unpaid",x.due_date||"",new Date(x.created_at).toLocaleString("en-IN")])];
 const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
 const suffix=from&&to?`-${from}-to-${to}`:from?`-from-${from}`:to?`-to-${to}`:"-all-dates";
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`cleancore-sales${suffix}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$("applySalesFilter").onclick=renderSales;

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
  let inv=invoices.find(x=>x.id===id);
  if(!inv){
    const q=await db.from("invoices").select("*").eq("id",id).maybeSingle();
    if(q.error)return toast(q.error.message||"Unable to load invoice.",false);
    inv=q.data;
    if(inv)invoices.push(inv);
  }
  if(!inv)return toast("Invoice/quotation not found. Refresh Manager data and try again.",false);
  try{if(dialog.open)dialog.close();}catch(_){}
     dialog.showModal();
     dialog.setAttribute("data-invoice-open","1");
   }
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
  "Amount Due: "+money(inv.due_amount||0),
  "Status: "+(inv.payment_status||"Unpaid"),
  "",
  "CleanCore Chemical & Cleaning",
  "+91 91827 25773",
  "cleancorehyd@gmail.com"
 ].join("\n");
}
async function createInvoicePdfFile(inv,customer,items){
 const host=$("invoicePreview");
 const previous=host?.innerHTML||"";
 if(!host)throw new Error("Invoice preview is unavailable.");
 await window.viewInvoice(inv.id);
 const preview=host.innerHTML;
 const pdfLib=window.jspdf?.jsPDF;
 if(typeof pdfLib!=="function")throw new Error("PDF generator did not load. Please refresh the Manager app and try again.");
 const staging=document.createElement("div");
 staging.style.position="fixed";staging.style.left="-100000px";staging.style.top="0";staging.style.width="794px";staging.style.background="#fff";
 staging.innerHTML=preview;document.body.appendChild(staging);
 try{
   const pdf=new pdfLib({orientation:"portrait",unit:"pt",format:"a4",compress:true});
   await pdf.html(staging,{margin:[24,24,24,24],autoPaging:"text",html2canvas:{scale:1,useCORS:true,backgroundColor:"#ffffff"}});
   const blob=pdf.output("blob");
   return new File([blob],"CleanCore-"+String(inv.invoice_no||"invoice")+".pdf",{type:"application/pdf"});
 }finally{staging.remove();host.innerHTML=previous;}
}
async function sendBillToCustomer(inv,customer,items){
 const phone=normalizePhone(inv?.customer_phone||customer?.phone||"");
 const msg=buildCustomerBillMessage(inv,customer,items);
 if(!phone){
   toast("Bill saved, but this customer has no valid WhatsApp phone number.",false);
   const n=$("billSendNotice");
   if(n){n.classList.remove("hidden");n.innerHTML="<strong>Invoice "+esc(inv.invoice_no)+" saved.</strong> Add a valid customer phone number to open WhatsApp for this bill.";}
   const pending=window.__cleancoreBillWhatsAppWindow;window.__cleancoreBillWhatsAppWindow=null;
   try{if(pending&&!pending.closed)pending.close();}catch(_){}
   return;
 }
 let pdfFile=null;
 try{toast("Bill generated. Preparing PDF…");pdfFile=await createInvoicePdfFile(inv,customer,items);}
 catch(err){console.error("Invoice PDF creation error",err);toast("Bill saved, but the PDF could not be prepared. You can open the bill and use Print / Save PDF.",false);}
 const encoded=encodeURIComponent(msg),isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
 let w=window.__cleancoreBillWhatsAppWindow;window.__cleancoreBillWhatsAppWindow=null;

 // Desktop: try the local WhatsApp Web bridge first. It uses the Manager's
 // already-logged-in WhatsApp Web session and can attach the actual PDF file.
 if(pdfFile&&!isMobile){
   try{
     const bridgeForm=new FormData();
     bridgeForm.append("phone",phone);
     bridgeForm.append("message",msg);
     bridgeForm.append("pdf",pdfFile,pdfFile.name);
     const bridgeResponse=await fetch("http://127.0.0.1:8787/send",{method:"POST",body:bridgeForm});
     const bridgeData=await bridgeResponse.json().catch(()=>({}));
     if(bridgeResponse.ok&&bridgeData?.sent){
       if(w&&!w.closed)try{w.close();}catch(_){}
       const n=$("billSendNotice");
       if(n){n.classList.remove("hidden");n.innerHTML="<strong>Invoice "+esc(inv.invoice_no)+" sent.</strong> The generated PDF was attached and sent through your WhatsApp Web session.";}
       toast("Invoice PDF sent to WhatsApp.");
       return;
     }
     if(bridgeData?.error)console.warn("WhatsApp bridge:",bridgeData.error);
   }catch(err){console.info("WhatsApp bridge unavailable; using normal WhatsApp Web flow.",err?.message||err);}
 }
 if(pdfFile&&isMobile&&navigator.share&&navigator.canShare){
   try{
     if(navigator.canShare({files:[pdfFile]})){
       if(w&&!w.closed)w.close();
       await navigator.share({files:[pdfFile],text:msg,title:"CleanCore Invoice "+inv.invoice_no});
       const n=$("billSendNotice");
       if(n){n.classList.remove("hidden");n.innerHTML="<strong>Invoice "+esc(inv.invoice_no)+" PDF is ready to send.</strong> Choose WhatsApp in the share sheet; the PDF is attached.";}
       return;
     }
   }catch(err){if(err?.name==="AbortError")return;console.warn("PDF share failed:",err);}
 }
 const targetUrl=isMobile?"https://wa.me/91"+phone+"?text="+encoded:"https://web.whatsapp.com/send?phone=91"+phone+"&text="+encoded;
 if(!w||w.closed)w=window.open(targetUrl,"_blank","noopener,noreferrer");
 else{try{w.location.href=targetUrl;w.focus?.();}catch(_){}}
 if(pdfFile){
   const url=URL.createObjectURL(pdfFile),a=document.createElement("a");a.href=url;a.download=pdfFile.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 const n=$("billSendNotice");
 if(n){n.classList.remove("hidden");const destination=isMobile?"WhatsApp":"WhatsApp Web";n.innerHTML="<strong>Invoice "+esc(inv.invoice_no)+" saved.</strong> "+destination+" opened for customer <b>+91 "+esc(phone)+"</b>. The PDF was downloaded; attach that PDF in the WhatsApp chat and send it.";}
 if(!w)toast("Bill saved, but your browser blocked WhatsApp. Please allow pop-ups for CleanCore Manager.",false);
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
$("closeInvoice").onclick=()=>{
 const d=$("invoiceDialog");
 try{if(d?.open)d.close();}catch(_){}
 document.body.classList.remove("invoice-open");
 document.documentElement.classList.remove("invoice-open");
};
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
bindNotificationSettings();
bindWebsiteNotificationUi();
restoreManagerSession().catch(err=>console.error('Manager session restore error',err));
