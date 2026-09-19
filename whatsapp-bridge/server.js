const express=require("express");
const cors=require("cors");
const multer=require("multer");
const qrcode=require("qrcode-terminal");
const {Client,LocalAuth,MessageMedia}=require("whatsapp-web.js");

const PORT=8787;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}});
const app=express();
app.use(cors({origin:true}));
app.use(express.json({limit:"1mb"}));

let ready=false;
let connecting=false;
let client;

function status(message){console.log("[CleanCore WhatsApp] "+message);}

async function init(){
  connecting=true;
  client=new Client({
    authStrategy:new LocalAuth({clientId:"cleancore-manager"}),
    puppeteer:{headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]}
  });
  client.on("qr",qr=>{
    ready=false;
    status("Scan this QR with WhatsApp > Linked devices:");
    qrcode.generate(qr,{small:true});
  });
  client.on("authenticated",()=>status("WhatsApp Web authenticated."));
  client.on("ready",()=>{ready=true;connecting=false;status("READY — CleanCore can send PDF bills.");});
  client.on("auth_failure",msg=>{ready=false;connecting=false;status("Authentication failed: "+msg);});
  client.on("disconnected",reason=>{ready=false;connecting=false;status("Disconnected: "+reason);});
  await client.initialize();
}

app.get("/status",(req,res)=>res.json({ok:true,ready,connecting}));

app.post("/send",upload.single("pdf"),async(req,res)=>{
  try{
    if(!ready)return res.status(503).json({sent:false,error:"WhatsApp Web is not connected. Run the bridge and scan the QR code first."});
    const phone=String(req.body.phone||"").replace(/\D/g,"");
    const message=String(req.body.message||"").trim();
    if(!/^[6-9]\d{9}$/.test(phone))return res.status(400).json({sent:false,error:"Invalid Indian mobile number."});
    if(!req.file)return res.status(400).json({sent:false,error:"PDF file is required."});
    const chatId="91"+phone+"@c.us";
    const exists=await client.isRegisteredUser(chatId);
    if(!exists)return res.status(404).json({sent:false,error:"This number is not registered on WhatsApp."});
    const media=new MessageMedia(req.file.mimetype||"application/pdf",req.file.buffer.toString("base64"),req.file.originalname||"CleanCore-Invoice.pdf");
    await client.sendMessage(chatId,media,{caption:message,sendMediaAsDocument:true});
    res.json({sent:true});
  }catch(err){
    console.error("[CleanCore WhatsApp] send failed:",err);
    res.status(500).json({sent:false,error:String(err?.message||err)});
  }
});

app.get("/",(req,res)=>res.send("CleanCore WhatsApp Bridge is running."));
app.listen(PORT,"127.0.0.1",()=>status("Bridge listening at http://127.0.0.1:"+PORT));
init().catch(err=>{console.error("[CleanCore WhatsApp] startup failed:",err);process.exitCode=1;});
