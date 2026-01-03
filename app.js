const stateKey="cms_state_v1"
const defaults={
 classes:[{id:"c1",name:"高一(1)班"},{id:"c2",name:"高一(2)班"}],
 students:[{id:"s1",name:"张三",classId:"c1"},{id:"s2",name:"李四",classId:"c1"},{id:"s3",name:"王五",classId:"c2"}],
 timetable:{
  c1:[
   {id:"t1",day:"星期一",time:"08:00-08:45",course:"语文",room:"A201"},
   {id:"t2",day:"星期一",time:"09:00-09:45",course:"数学",room:"A203"},
   {id:"t3",day:"星期二",time:"10:00-10:45",course:"英语",room:"A105"}
  ],
  c2:[
   {id:"t4",day:"星期一",time:"08:00-08:45",course:"物理",room:"B301"},
   {id:"t5",day:"星期二",time:"09:00-09:45",course:"化学",room:"B303"},
   {id:"t6",day:"星期三",time:"10:00-10:45",course:"生物",room:"B105"}
  ]
 },
 notifications:[],
 attendance:[]
}
function loadState(){const raw=localStorage.getItem(stateKey);if(!raw)return JSON.parse(JSON.stringify(defaults));try{const s=JSON.parse(raw);return s}catch(e){return JSON.parse(JSON.stringify(defaults))}}
function saveState(){localStorage.setItem(stateKey,JSON.stringify(state))}
let state=loadState()
let apiEnabled=false
const API_BASE="http://localhost:3000/api"
const apiStatus=document.getElementById("apiStatus")
const themeSelect=document.getElementById("themeSelect")
const themeKey="cms_theme"
const loginUser=document.getElementById("loginUser")
const loginPass=document.getElementById("loginPass")
const btnLogin=document.getElementById("btnLogin")
const btnLogout=document.getElementById("btnLogout")
const userInfo=document.getElementById("userInfo")
const tokenKey="cms_token"
const userKey="cms_user"
const landingView=document.getElementById("landingView")
const authModal=document.getElementById("authModal")
const btnAdminCard=document.getElementById("btnAdminCard")
const btnTeacherCard=document.getElementById("btnTeacherCard")
const btnStudentCard=document.getElementById("btnStudentCard")
const authRoleLabel=document.getElementById("authRoleLabel")
const tabLogin=document.getElementById("tabLogin")
const tabRegister=document.getElementById("tabRegister")
const loginForm=document.getElementById("loginForm")
const registerForm=document.getElementById("registerForm")
const authLoginUsername=document.getElementById("authLoginUsername")
const authLoginPassword=document.getElementById("authLoginPassword")
const authRegisterUsername=document.getElementById("authRegisterUsername")
const authRegisterPassword=document.getElementById("authRegisterPassword")
const authRegisterName=document.getElementById("authRegisterName")
const authRegisterClass=document.getElementById("authRegisterClass")
const btnAuthLogin=document.getElementById("btnAuthLogin")
const btnAuthRegister=document.getElementById("btnAuthRegister")
const btnAuthClose=document.getElementById("btnAuthClose")
let authRole=null
function getToken(){return localStorage.getItem(tokenKey)||null}
function setToken(t){if(t)localStorage.setItem(tokenKey,t);else localStorage.removeItem(tokenKey)}
function getUser(){const raw=localStorage.getItem(userKey);if(!raw)return null;try{return JSON.parse(raw)}catch(e){return null}}
function setUser(u){if(u)localStorage.setItem(userKey,JSON.stringify(u));else localStorage.removeItem(userKey)}
function withAuth(opts){const token=getToken();const headers=Object.assign({},opts&&opts.headers||{});if(token)headers["Authorization"]="Bearer "+token;return Object.assign({},opts,{headers})}
async function fetchJSON(url,opts){const r=await fetch(url,withAuth(opts||{}));if(!r.ok)throw new Error("net");return await r.json()}
async function detectBackend(){try{const r=await fetchJSON(API_BASE+"/ping");apiEnabled=!!r.ok}catch(e){apiEnabled=false}}
let es=null
function connectStream(){if(!apiEnabled)return;if(es){es.close();es=null}const url=API_BASE.replace("/api","")+"/api/stream";es=new EventSource(url);es.addEventListener("notification",async ()=>{await renderStudentNotifications()});es.addEventListener("attendance",async ()=>{await renderAttendanceSummary();await renderTeacherAttendance()});es.addEventListener("homework",async ()=>{await renderStudentHomework();await renderTeacherHomework()});es.addEventListener("homework_submit",async ()=>{await renderTeacherHomework()});es.onerror=()=>{}}
function applyTheme(t){document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");if(themeSelect)themeSelect.value=t}
function setTheme(t){localStorage.setItem(themeKey,t);applyTheme(t)}
function initTheme(){const t=localStorage.getItem(themeKey)||"dark";applyTheme(t)}
function setLoading(el,count){el.innerHTML="";for(let i=0;i<count;i++){const s=document.createElement("div");s.className="skeleton";el.appendChild(s)}}
const roleSelect=document.getElementById("roleSelect")
const studentView=document.getElementById("studentView")
const teacherView=document.getElementById("teacherView")
const adminView=document.getElementById("adminView")
const studentSelect=document.getElementById("studentSelect")
const timetableList=document.getElementById("timetableList")
const btnSyncTimetable=document.getElementById("btnSyncTimetable")
const studentNotifications=document.getElementById("studentNotifications")
const studentHomework=document.getElementById("studentHomework")
const btnCheckIn=document.getElementById("btnCheckIn")
const checkinStatus=document.getElementById("checkinStatus")
const attendanceSummary=document.getElementById("attendanceSummary")
const teacherClassSelect=document.getElementById("teacherClassSelect")
const teacherClassSelectNotice=document.getElementById("teacherClassSelectNotice")
const homeworkTitle=document.getElementById("homeworkTitle")
const homeworkContent=document.getElementById("homeworkContent")
const btnSendHomework=document.getElementById("btnSendHomework")
const classNoticeTitle=document.getElementById("classNoticeTitle")
const classNoticeContent=document.getElementById("classNoticeContent")
const btnSendClassNotice=document.getElementById("btnSendClassNotice")
const teacherAttendanceDashboard=document.getElementById("teacherAttendanceDashboard")
const btnExportCSV=document.getElementById("btnExportCSV")
const startDateInput=document.getElementById("startDate")
const endDateInput=document.getElementById("endDate")
const btnApplyRange=document.getElementById("btnApplyRange")
const adminClasses=document.getElementById("adminClasses")
const newClassName=document.getElementById("newClassName")
const btnAddClass=document.getElementById("btnAddClass")
const adminStudents=document.getElementById("adminStudents")
const newStudentName=document.getElementById("newStudentName")
const newStudentClass=document.getElementById("newStudentClass")
const btnAddStudent=document.getElementById("btnAddStudent")
function showRole(role){studentView.classList.toggle("hidden",role!=="student");teacherView.classList.toggle("hidden",role!=="teacher");adminView.classList.toggle("hidden",role!=="admin")}
async function renderStudentSelect(){if(apiEnabled){const [classes,students]=await Promise.all([fetchJSON(API_BASE+"/classes"),fetchJSON(API_BASE+"/students")]);state.classes=classes;state.students=students}studentSelect.innerHTML="";state.students.forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.name+"（"+getClassName(s.classId)+"）";studentSelect.appendChild(o)});connectStream()}
function getClassName(classId){const c=state.classes.find(x=>x.id===classId);return c?c.name:""}
function getCurrentStudent(){const id=studentSelect.value||state.students[0]?.id;return state.students.find(s=>s.id===id)}
async function renderTimetable(){const stu=getCurrentStudent();let list=state.timetable[stu.classId]||[];if(apiEnabled){setLoading(timetableList,3);list=await fetchJSON(API_BASE+"/timetable?classId="+encodeURIComponent(stu.classId))}timetableList.innerHTML="";if(!list.length){const div=document.createElement("div");div.className="empty";div.textContent="暂无课表";timetableList.appendChild(div);return}list.forEach(item=>{const div=document.createElement("div");div.className="item";const left=document.createElement("div");left.innerHTML=`<div>${item.day} ${item.time}</div><div class="muted">${item.course} · ${item.room}</div>`;const right=document.createElement("div");right.innerHTML=`<span class="badge">课程</span>`;div.appendChild(left);div.appendChild(right);timetableList.appendChild(div)})}
async function renderStudentNotifications(){const stu=getCurrentStudent();const classId=stu.classId;let list=state.notifications.filter(n=>n.classId===classId);if(apiEnabled){setLoading(studentNotifications,3);list=await fetchJSON(API_BASE+"/notifications?classId="+encodeURIComponent(classId)+"&studentId="+encodeURIComponent(stu.id))}studentNotifications.innerHTML="";if(!list.length){const div=document.createElement("div");div.className="empty";div.textContent="暂无通知";studentNotifications.appendChild(div);return}list.slice().reverse().forEach(n=>{const div=document.createElement("div");div.className="item";const left=document.createElement("div");left.innerHTML=`<div>${n.title}</div><div class="muted">${n.type==="homework"?"作业":"班级通知"} · ${new Date(n.createdAt).toLocaleString()}</div>`;const right=document.createElement("div");const badge=document.createElement("span");badge.className="badge"+(n.read?" badge-read":"");badge.textContent=getClassName(n.classId);right.appendChild(badge);if(apiEnabled){const btn=document.createElement("button");btn.textContent=n.read?"已读":"标记已读";btn.disabled=n.read||!(getUser()&&getUser().role==="student");btn.onclick=async ()=>{try{await fetchJSON(API_BASE+"/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({notificationId:n.id})});await renderStudentNotifications()}catch(e){} };right.appendChild(btn)}div.appendChild(left);div.appendChild(right);studentNotifications.appendChild(div)})}
async function renderStudentHomework(){const stu=getCurrentStudent();let list=[];if(apiEnabled){setLoading(studentHomework,3);list=await fetchJSON(API_BASE+"/homework?classId="+encodeURIComponent(stu.classId))}studentHomework.innerHTML="";if(!list.length){const div=document.createElement("div");div.className="empty";div.textContent="暂无作业";studentHomework.appendChild(div);return}for(const hw of list.slice().reverse()){const div=document.createElement("div");div.className="item";const left=document.createElement("div");left.innerHTML=`<div>${hw.title}</div><div class="muted">${new Date(hw.createdAt).toLocaleString()}${hw.dueDate?(" · 截止 "+new Date(hw.dueDate).toLocaleDateString()):""}</div>`;const right=document.createElement("div");const btn=document.createElement("button");btn.textContent="提交";btn.disabled=!apiEnabled||!(getUser()&&getUser().role==="student");btn.onclick=async ()=>{try{await fetchJSON(API_BASE+"/homework/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({homeworkId:hw.id})})}catch(e){} };right.appendChild(btn);div.appendChild(left);div.appendChild(right);studentHomework.appendChild(div)}}
async function renderAttendanceSummary(){const stu=getCurrentStudent();let list=state.attendance.filter(a=>a.studentId===stu.id);if(apiEnabled){setLoading(attendanceSummary,2);list=await fetchJSON(API_BASE+"/attendance?studentId="+encodeURIComponent(stu.id))}const byDate=new Map();list.forEach(a=>{const d=a.date.split("T")[0];byDate.set(d,(byDate.get(d)||0)+1)});attendanceSummary.innerHTML="";if(!byDate.size){const div=document.createElement("div");div.className="empty";div.textContent="暂无打卡记录";attendanceSummary.appendChild(div);return}byDate.forEach((count,date)=>{const div=document.createElement("div");div.className="item";div.innerHTML=`<div>${date}</div><div class="stat"><strong>${count}</strong><span class="muted">次打卡</span></div>`;attendanceSummary.appendChild(div)})}
async function renderTeacherClassSelects(){if(apiEnabled){state.classes=await fetchJSON(API_BASE+"/classes")}teacherClassSelect.innerHTML="";teacherClassSelectNotice.innerHTML="";state.classes.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;teacherClassSelect.appendChild(o)});state.classes.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;teacherClassSelectNotice.appendChild(o)})}
function getDateRange(){const s=startDateInput?.value||"";const e=endDateInput?.value||"";if(!s&&!e)return null;const start=s?new Date(s+"T00:00:00Z").toISOString():null;const end=e?new Date(e+"T23:59:59Z").toISOString():null;return {start,end}}
async function renderTeacherAttendance(){teacherAttendanceDashboard.innerHTML="";if(apiEnabled)setLoading(teacherAttendanceDashboard,3);const range=getDateRange();for(const c of state.classes){const stuList=state.students.filter(s=>s.classId===c.id);const total=stuList.length;const today=new Date().toISOString().split("T")[0];let list=state.attendance;if(apiEnabled){let url=API_BASE+"/attendance?classId="+encodeURIComponent(c.id);if(range){if(range.start)url+="&start="+encodeURIComponent(range.start);if(range.end)url+="&end="+encodeURIComponent(range.end)}list=await fetchJSON(url)}const present=new Set((!range?list.filter(a=>a.date.startsWith(today)):list).filter(a=>stuList.some(s=>s.id===a.studentId)).map(a=>a.studentId));const pct=total?Math.round(present.size/total*100):0;const div=document.createElement("div");div.className="item";const left=document.createElement("div");left.textContent=c.name;const right=document.createElement("div");right.className="stat";right.innerHTML=`<strong class="success">${present.size}</strong><span class="muted">${range?"区间签到":"今日签到"}</span><strong class="danger">${total-present.size}</strong><span class="muted">未到</span>`;const bar=document.createElement("div");bar.className="progress";const barIn=document.createElement("div");barIn.className="progress-bar";barIn.style.width=pct+"%";bar.appendChild(barIn);div.appendChild(left);div.appendChild(right);div.appendChild(bar);teacherAttendanceDashboard.appendChild(div)}}
const teacherHomeworkDashboard=document.getElementById("teacherHomeworkDashboard")
async function renderTeacherHomework(){teacherHomeworkDashboard.innerHTML="";if(!state.classes.length){const e=document.createElement("div");e.className="empty";e.textContent="暂无班级";teacherHomeworkDashboard.appendChild(e);return}for(const c of state.classes){let list=[];if(apiEnabled){list=await fetchJSON(API_BASE+"/homework?classId="+encodeURIComponent(c.id))}if(!list.length){const emp=document.createElement("div");emp.className="item";emp.innerHTML=`<div>${c.name}</div><div class="muted">暂无作业</div>`;teacherHomeworkDashboard.appendChild(emp);continue}for(const hw of list.slice().reverse()){const total=state.students.filter(s=>s.classId===c.id).length;let submitted=0;if(apiEnabled){const subs=await fetchJSON(API_BASE+"/homework/submissions?homeworkId="+encodeURIComponent(hw.id));submitted=subs.length}const div=document.createElement("div");div.className="item";const left=document.createElement("div");left.innerHTML=`<div>${c.name} · ${hw.title}</div><div class="muted">${new Date(hw.createdAt).toLocaleString()}</div>`;const right=document.createElement("div");right.className="stat";right.innerHTML=`<span class="muted">已提交 ${submitted} / ${total}</span>`;const bar=document.createElement("div");bar.className="progress";const barIn=document.createElement("div");barIn.className="progress-bar";barIn.style.width=(total?Math.round(submitted/total*100):0)+"%";bar.appendChild(barIn);div.appendChild(left);div.appendChild(right);div.appendChild(bar);teacherHomeworkDashboard.appendChild(div)}} 
async function renderAdmin(){if(apiEnabled){const [classes,students]=await Promise.all([fetchJSON(API_BASE+"/classes"),fetchJSON(API_BASE+"/students")]);state.classes=classes;state.students=students}adminClasses.innerHTML="";if(!state.classes.length){const e=document.createElement("div");e.className="empty";e.textContent="暂无班级";adminClasses.appendChild(e)}state.classes.forEach(c=>{const div=document.createElement("div");div.className="item";const count=state.students.filter(s=>s.classId===c.id).length;div.innerHTML=`<div>${c.name}</div><div class="muted">${count} 名学生</div>`;adminClasses.appendChild(div)});newStudentClass.innerHTML="";state.classes.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;newStudentClass.appendChild(o)});adminStudents.innerHTML="";if(!state.students.length){const e=document.createElement("div");e.className="empty";e.textContent="暂无学生";adminStudents.appendChild(e)}state.students.forEach(s=>{const div=document.createElement("div");div.className="item";div.innerHTML=`<div>${s.name}</div><div class="muted">${getClassName(s.classId)}</div>`;adminStudents.appendChild(div)})}
async function syncTimetable(){if(apiEnabled){const stu=getCurrentStudent();const list=await fetchJSON(API_BASE+"/timetable?classId="+encodeURIComponent(stu.classId));state.timetable[stu.classId]=list}else{state.timetable=JSON.parse(JSON.stringify(defaults.timetable));saveState()}await renderTimetable()}
async function sendNotification(type,classId,title,content){if(!title||!content)return;if(apiEnabled){try{await fetchJSON(API_BASE+"/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,classId,title,content})})}catch(e){return}}else{state.notifications.push({id:Date.now().toString(),type,classId,title,content,createdAt:new Date().toISOString()});saveState()}await renderStudentNotifications()}
function postAttendance(rec){if(apiEnabled){return fetchJSON(API_BASE+"/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(rec)})}state.attendance.push(rec);saveState();return Promise.resolve({})}
function checkIn(){const stu=getCurrentStudent();if(!stu){checkinStatus.textContent="请选择学生";return}checkinStatus.textContent="定位中";const submit=async (lat,lng)=>{const rec={id:Date.now().toString(),studentId:stu.id,classId:stu.classId,lat:lat??null,lng:lng??null,date:new Date().toISOString()};try{await postAttendance(rec);checkinStatus.textContent="已打卡"}catch(e){checkinStatus.textContent="未登录或权限不足"}await renderAttendanceSummary();await renderTeacherAttendance()};if(!navigator.geolocation){submit(null,null);return}navigator.geolocation.getCurrentPosition(pos=>{submit(pos.coords.latitude,pos.coords.longitude)},err=>{submit(null,null)},{enableHighAccuracy:true,timeout:5000,maximumAge:0})}
function exportCSV(){if(apiEnabled){const a=document.createElement("a");a.href=API_BASE+"/export/csv";a.download="attendance.csv";document.body.appendChild(a);a.click();a.remove();return}const rows=[["studentId","studentName","classId","className","lat","lng","date"]];state.attendance.forEach(a=>{const s=state.students.find(x=>x.id===a.studentId);const c=state.classes.find(x=>x.id===a.classId);rows.push([a.studentId,s?s.name:"",a.classId,c?c.name:"",a.lat??"",a.lng??"",a.date])});const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="attendance.csv";document.body.appendChild(a);a.click();URL.revokeObjectURL(url);a.remove()}
roleSelect.addEventListener("change",e=>{showRole(e.target.value);connectStream()})
studentSelect.addEventListener("change",()=>{renderTimetable();renderStudentNotifications();renderStudentHomework();renderAttendanceSummary();connectStream()})
themeSelect.addEventListener("change",e=>{setTheme(e.target.value)})
btnSyncTimetable.addEventListener("click",syncTimetable)
btnCheckIn.addEventListener("click",checkIn)
btnSendHomework.addEventListener("click",()=>{const classId=teacherClassSelect.value;sendNotification("homework",classId,homeworkTitle.value.trim(),homeworkContent.value.trim());homeworkTitle.value="";homeworkContent.value=""})
btnSendClassNotice.addEventListener("click",()=>{const classId=teacherClassSelectNotice.value;sendNotification("class",classId,classNoticeTitle.value.trim(),classNoticeContent.value.trim());classNoticeTitle.value="";classNoticeContent.value=""})
btnExportCSV.addEventListener("click",exportCSV)
btnApplyRange.addEventListener("click",()=>{renderTeacherAttendance()})
btnAddClass.addEventListener("click",async ()=>{const name=newClassName.value.trim();if(!name)return;if(apiEnabled){await fetchJSON(API_BASE+"/classes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})})}else{const id="c"+(Date.now());state.classes.push({id,name});saveState()}newClassName.value="";await renderTeacherClassSelects();await renderAdmin()})
btnAddStudent.addEventListener("click",async ()=>{const name=newStudentName.value.trim();const classId=newStudentClass.value;if(!name||!classId)return;if(apiEnabled){await fetchJSON(API_BASE+"/students",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,classId})})}else{const id="s"+(Date.now());state.students.push({id,name,classId});saveState()}newStudentName.value="";await renderStudentSelect();await renderAdmin()})
btnLogin.addEventListener("click",async ()=>{if(!apiEnabled)return;const username=loginUser.value.trim();const password=loginPass.value.trim();if(!username||!password)return;try{const r=await fetchJSON(API_BASE+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});setToken(r.token);setUser(r.user);userInfo.style.display="inline-flex";userInfo.textContent=r.user.username+" · "+r.user.role;btnLogin.style.display="none";btnLogout.style.display="inline-block";loginUser.style.display="none";loginPass.style.display="none";roleSelect.value=r.user.role;roleSelect.disabled=true;applyPermissions()}catch(e){} })
btnLogout.addEventListener("click",()=>{setToken(null);setUser(null);userInfo.style.display="none";btnLogin.style.display="inline-block";btnLogout.style.display="none";loginUser.style.display="inline-block";loginPass.style.display="inline-block";roleSelect.disabled=false;applyPermissions()})
function applyPermissions(){const user=getUser();const isAdmin=apiEnabled&&user&&user.role==="admin";const isTeacher=apiEnabled&&user&&user.role==="teacher";const isStudent=apiEnabled&&user&&user.role==="student";btnAddClass.disabled=!isAdmin;btnAddStudent.disabled=!isAdmin;btnSendHomework.disabled=!isTeacher;btnSendClassNotice.disabled=!isTeacher;btnCheckIn.disabled=apiEnabled&&!isStudent}
function openAuth(role){authRole=role;authRoleLabel.textContent=role==="admin"?"管理员登录":role==="teacher"?"老师登录/注册":"学生登录/注册";authModal.classList.remove("hidden");tabRegister.classList.toggle("hidden",role==="admin");authRegisterClass.style.display=role==="student"?"block":"none"}
function closeAuth(){authModal.classList.add("hidden")}
function selectTab(isLogin){tabLogin.classList.toggle("active",isLogin);tabRegister.classList.toggle("active",!isLogin);loginForm.classList.toggle("hidden",!isLogin);registerForm.classList.toggle("hidden",isLogin)}
btnAdminCard.addEventListener("click",()=>{openAuth("admin");selectTab(true)})
btnTeacherCard.addEventListener("click",()=>{openAuth("teacher");selectTab(true)})
btnStudentCard.addEventListener("click",()=>{openAuth("student");selectTab(true)})
tabLogin.addEventListener("click",()=>selectTab(true))
tabRegister.addEventListener("click",async ()=>{selectTab(false);if(apiEnabled&&authRole==="student"){const classes=await fetchJSON(API_BASE+"/classes");authRegisterClass.innerHTML="";classes.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;authRegisterClass.appendChild(o)})}})
btnAuthClose.addEventListener("click",()=>closeAuth())
btnAuthLogin.addEventListener("click",async ()=>{if(!apiEnabled)return;const username=authLoginUsername.value.trim();const password=authLoginPassword.value.trim();if(!username||!password)return;try{const r=await fetchJSON(API_BASE+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});setToken(r.token);setUser(r.user);closeAuth();landingView.classList.add("hidden");roleSelect.value=r.user.role;roleSelect.disabled=true;showRole(r.user.role);applyPermissions();await renderStudentSelect();await renderTimetable();await renderStudentNotifications();await renderStudentHomework();await renderAttendanceSummary();await renderTeacherClassSelects();await renderTeacherAttendance();await renderTeacherHomework();await renderAdmin()}catch(e){} })
btnAuthRegister.addEventListener("click",async ()=>{if(!apiEnabled)return;const username=authRegisterUsername.value.trim();const password=authRegisterPassword.value.trim();const name=authRegisterName.value.trim();const classId=authRegisterClass.value;if(!username||!password)return;try{const r=await fetchJSON(API_BASE+"/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password,role:authRole,name,classId})});const l=await fetchJSON(API_BASE+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});setToken(l.token);setUser(l.user);closeAuth();landingView.classList.add("hidden");roleSelect.value=l.user.role;roleSelect.disabled=true;showRole(l.user.role);applyPermissions();await renderStudentSelect();await renderTimetable();await renderStudentNotifications();await renderStudentHomework();await renderAttendanceSummary();await renderTeacherClassSelects();await renderTeacherAttendance();await renderTeacherHomework();await renderAdmin()}catch(e){} })
async function init(){initTheme();await detectBackend();if(apiStatus){apiStatus.textContent=apiEnabled?"在线":"离线";apiStatus.classList.toggle("status-online",apiEnabled);apiStatus.classList.toggle("status-offline",!apiEnabled)}showRole(roleSelect.value);await renderStudentSelect();await renderTimetable();await renderStudentNotifications();await renderStudentHomework();await renderAttendanceSummary();await renderTeacherClassSelects();await renderTeacherAttendance();await renderTeacherHomework();await renderAdmin();connectStream()}
applyPermissions()
const existingUser=getUser();if(existingUser){userInfo.style.display="inline-flex";userInfo.textContent=existingUser.username+" · "+existingUser.role;btnLogin.style.display="none";btnLogout.style.display="inline-block";loginUser.style.display="none";loginPass.style.display="none";roleSelect.value=existingUser.role;roleSelect.disabled=true}
if(!getUser()){landingView.classList.remove("hidden");studentView.classList.add("hidden");teacherView.classList.add("hidden");adminView.classList.add("hidden")}else{landingView.classList.add("hidden")}
init()

