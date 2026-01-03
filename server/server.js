const http=require("http")
const fs=require("fs")
const path=require("path")
const crypto=require("crypto")
const PORT=3000
const DB_PATH=path.join(__dirname,"data.json")
const clients=[]
function broadcast(event,data){const payload=`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;clients.forEach(c=>{if(c.res.writableEnded)return;if(event==="notification"){if(c.classId&&c.classId!==data.classId)return}if(event==="attendance"){if(c.classId&&c.classId!==data.classId)return;if(c.studentId&&c.studentId!==data.studentId)return}c.res.write(payload)})}
function readDb(){try{const s=fs.readFileSync(DB_PATH,"utf8");return JSON.parse(s)}catch(e){return {classes:[],students:[],timetable:{},notifications:[],attendance:[]}}}
function writeDb(d){fs.writeFileSync(DB_PATH,JSON.stringify(d,null,2))}
function send(res,status,data,headers){res.writeHead(status,Object.assign({"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"},headers||{}));res.end(typeof data==="string"?data:JSON.stringify(data))}
function parseBody(req){return new Promise(r=>{let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{try{r(body?JSON.parse(body):{})}catch(e){r({})}})})}
function toCSV(rows){return rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n")}
function getChineseWeekday(iso){const d=new Date(iso);const idx=d.getDay();return ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"][idx]}
function parseStartTime(str){const m=/^(\d{2}):(\d{2})/.exec(str||"");if(!m)return null;return {h:parseInt(m[1],10),min:parseInt(m[2],10)}}
function classifyAttendance(db,rec){const day=getChineseWeekday(rec.date);const items=(db.timetable[rec.classId]||[]).filter(x=>x.day===day);let earliest=null;items.forEach(it=>{const st=parseStartTime(it.time);if(st){const minutes=st.h*60+st.min;if(earliest==null||minutes<earliest)earliest=minutes}});if(earliest==null)return "on_time";const dt=new Date(rec.date);const m=dt.getHours()*60+dt.getMinutes();return m<=earliest+5?"on_time":"late"}
function b64url(input){return Buffer.from(input).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}
function b64urlDecode(input){input=input.replace(/-/g,"+").replace(/_/g,"/");while(input.length%4)input+="=";return Buffer.from(input,"base64").toString()}
const JWT_SECRET=process.env.JWT_SECRET||"dev-secret"
function signToken(payload){const header=b64url(JSON.stringify({alg:"HS256",typ:"JWT"}));const body=b64url(JSON.stringify(payload));const sig=crypto.createHmac("sha256",JWT_SECRET).update(header+"."+body).digest("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");return `${header}.${body}.${sig}`}
function verifyToken(token){try{const [h,b,s]=token.split(".");const expSig=crypto.createHmac("sha256",JWT_SECRET).update(h+"."+b).digest("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");if(s!==expSig)return null;const payload=JSON.parse(b64urlDecode(b));if(payload.exp&&Date.now()>payload.exp)return null;return payload}catch(e){return null}}
function hashPassword(pwd,salt){return crypto.createHash("sha256").update(pwd+salt).digest("hex")}
const server=http.createServer(async (req,res)=>{
 const u=new URL(req.url,`http://${req.headers.host}`)
 if(req.method==="OPTIONS"){return send(res,200,{})}
 if(u.pathname==="/"){return send(res,200,"班级管理系统API已启动",{ "Content-Type":"text/plain" })}
 if(u.pathname==="/api/ping"){return send(res,200,{ok:true})}
 if(u.pathname==="/api/stream"&&req.method==="GET"){
  res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","Access-Control-Allow-Origin":"*"})
  const client={res,classId:u.searchParams.get("classId")||null,studentId:u.searchParams.get("studentId")||null}
  clients.push(client)
  res.write("event: hello\ndata: ok\n\n")
  const iv=setInterval(()=>{if(!res.writableEnded)res.write("event: ping\ndata: 1\n\n")},25000)
  req.on("close",()=>{const i=clients.indexOf(client);if(i>=0)clients.splice(i,1);clearInterval(iv)})
  return
 }
 let db=readDb()
 if(!db.users||!Array.isArray(db.users)){db.users=[];writeDb(db);db=readDb()}
 if(u.pathname==="/api/auth/login"&&req.method==="POST"){const body=await parseBody(req);const user=db.users.find(x=>x.username===body.username);if(!user)return send(res,401,{error:"invalid"});if(!user.salt||!user.passwordHash){user.salt=crypto.randomBytes(8).toString("hex");user.passwordHash=hashPassword("123456",user.salt);writeDb(db)}const ok=hashPassword(body.password||"",user.salt)===user.passwordHash;if(!ok)return send(res,401,{error:"invalid"});const payload={uid:user.id,role:user.role,studentId:user.studentId||null,exp:Date.now()+7*24*3600*1000};const token=signToken(payload);return send(res,200,{token,user:{id:user.id,username:user.username,role:user.role,studentId:user.studentId||null}})}
 if(u.pathname==="/api/auth/me"&&req.method==="GET"){const auth=req.headers["authorization"]||"";const token=auth.startsWith("Bearer ")?auth.slice(7):null;const payload=token?verifyToken(token):null;return send(res,200,{ok:!!payload,user:payload||null})}
 if(u.pathname==="/api/auth/register"&&req.method==="POST"){const body=await parseBody(req);const {username,password,role,name,classId}=body;if(!username||!password||!role)return send(res,400,{error:"fields"});if(!["teacher","student"].includes(role))return send(res,400,{error:"role"});if(db.users.find(x=>x.username===username))return send(res,409,{error:"exists"});const salt=crypto.randomBytes(8).toString("hex");const passwordHash=hashPassword(password,salt);const id="u_"+Date.now();let studentId=null;let createdStudent=null;if(role==="student"){const sid="s"+Date.now();const nm=name||username;const cls=classId||db.classes[0]?.id||null;if(!cls)return send(res,400,{error:"classId"});db.students.push({id:sid,name:nm,classId:cls});studentId=sid;createdStudent={id:sid,name:nm,classId:cls}}db.users.push({id,username,role,salt,passwordHash,studentId});writeDb(db);return send(res,200,{ok:true,user:{id,username,role,studentId},createdStudent})}
 const auth=req.headers["authorization"]||"";const token=auth.startsWith("Bearer ")?auth.slice(7):null;const me=token?verifyToken(token):null
 if(u.pathname==="/api/classes"&&req.method==="GET"){return send(res,200,db.classes)}
 if(u.pathname==="/api/classes"&&req.method==="POST"){if(!me||me.role!=="admin")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.name)return send(res,400,{error:"name"});const id="c"+Date.now();db.classes.push({id,name:body.name});writeDb(db);return send(res,200,{id})}
 if(u.pathname==="/api/students"&&req.method==="GET"){return send(res,200,db.students)}
 if(u.pathname==="/api/students"&&req.method==="POST"){if(!me||me.role!=="admin")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.name||!body.classId)return send(res,400,{error:"name|classId"});const id="s"+Date.now();db.students.push({id,name:body.name,classId:body.classId});writeDb(db);return send(res,200,{id})}
 if(u.pathname==="/api/timetable"&&req.method==="GET"){const classId=u.searchParams.get("classId");const list=db.timetable[classId]||[];return send(res,200,list)}
 if(u.pathname==="/api/notifications"&&req.method==="GET"){const classId=u.searchParams.get("classId");const studentId=u.searchParams.get("studentId")||null;let list=classId?db.notifications.filter(n=>n.classId===classId):db.notifications;if(studentId){list=list.map(n=>Object.assign({},n,{read:!!db.notificationReads.find(x=>x.notificationId===n.id&&x.studentId===studentId)}))}return send(res,200,list)}
 if(u.pathname==="/api/notifications"&&req.method==="POST"){if(!me||me.role!=="teacher")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.type||!body.classId||!body.title||!body.content)return send(res,400,{error:"fields"});const id=Date.now().toString();const item={id,type:body.type,classId:body.classId,title:body.title,content:body.content,createdAt:new Date().toISOString()};db.notifications.push(item);writeDb(db);broadcast("notification",item);return send(res,200,{id})}
 if(u.pathname==="/api/notifications/read"&&req.method==="POST"){if(!me||me.role!=="student")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.notificationId)return send(res,400,{error:"notificationId"});const exists=db.notificationReads.find(x=>x.notificationId===body.notificationId&&x.studentId===me.studentId);if(!exists){db.notificationReads.push({notificationId:body.notificationId,studentId:me.studentId,seenAt:new Date().toISOString()});writeDb(db)}return send(res,200,{ok:true})}
 if(u.pathname==="/api/attendance"&&req.method==="GET"){const classId=u.searchParams.get("classId");const studentId=u.searchParams.get("studentId");const start=u.searchParams.get("start");const end=u.searchParams.get("end");let list=db.attendance;if(classId)list=list.filter(a=>a.classId===classId);if(studentId)list=list.filter(a=>a.studentId===studentId);if(start)list=list.filter(a=>a.date>=start);if(end)list=list.filter(a=>a.date<=end);return send(res,200,list)}
 if(u.pathname==="/api/attendance"&&req.method==="POST"){if(!me)return send(res,401,{error:"unauth"});const body=await parseBody(req);if(!body.studentId||!body.classId||!body.date)return send(res,400,{error:"fields"});if(me.role==="student"&&me.studentId&&me.studentId!==body.studentId)return send(res,403,{error:"forbidden"});const id=Date.now().toString();const item={id,studentId:body.studentId,classId:body.classId,lat:body.lat??null,lng:body.lng??null,date:body.date,status:classifyAttendance(db,{classId:body.classId,date:body.date})};db.attendance.push(item);writeDb(db);broadcast("attendance",item);return send(res,200,{id})}
 if(u.pathname==="/api/homework"&&req.method==="GET"){const classId=u.searchParams.get("classId");const list=(db.homework||[]).filter(h=>!classId||h.classId===classId);return send(res,200,list)}
 if(u.pathname==="/api/homework"&&req.method==="POST"){if(!me||me.role!=="teacher")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.classId||!body.title||!body.content)return send(res,400,{error:"fields"});const id="h"+Date.now();const item={id,classId:body.classId,title:body.title,content:body.content,createdAt:new Date().toISOString(),dueDate:body.dueDate||null};db.homework.push(item);writeDb(db);broadcast("homework",item);return send(res,200,{id})}
 if(u.pathname==="/api/homework/submit"&&req.method==="POST"){if(!me||me.role!=="student")return send(res,403,{error:"forbidden"});const body=await parseBody(req);if(!body.homeworkId)return send(res,400,{error:"homeworkId"});const hw=db.homework.find(h=>h.id===body.homeworkId);if(!hw)return send(res,404,{error:"not_found"});const exists=db.homeworkSubmissions.find(s=>s.homeworkId===body.homeworkId&&s.studentId===me.studentId);if(!exists){db.homeworkSubmissions.push({id:"hs"+Date.now(),homeworkId:body.homeworkId,studentId:me.studentId,status:"submitted",submittedAt:new Date().toISOString()});writeDb(db);broadcast("homework_submit",{homeworkId:body.homeworkId,studentId:me.studentId})}return send(res,200,{ok:true})}
 if(u.pathname==="/api/homework/submissions"&&req.method==="GET"){const homeworkId=u.searchParams.get("homeworkId");let list=db.homeworkSubmissions||[];if(homeworkId)list=list.filter(s=>s.homeworkId===homeworkId);return send(res,200,list)}
 if(u.pathname==="/api/export/csv"&&req.method==="GET"){const rows=[["studentId","studentName","classId","className","lat","lng","date"]];db.attendance.forEach(a=>{const s=db.students.find(x=>x.id===a.studentId);const c=db.classes.find(x=>x.id===a.classId);rows.push([a.studentId,s?s.name:"",a.classId,c?c.name:"",a.lat??"",a.lng??"",a.date])});res.writeHead(200,{"Content-Type":"text/csv;charset=utf-8","Content-Disposition":"attachment; filename=\"attendance.csv\"","Access-Control-Allow-Origin":"*"});res.end(toCSV(rows));return}
 return send(res,404,{error:"not_found"})
})
server.listen(PORT,()=>{})

