const http=require("http")
const fs=require("fs")
const path=require("path")
const PORT=8080
const MIME={
 ".html":"text/html; charset=utf-8",
 ".css":"text/css; charset=utf-8",
 ".js":"application/javascript; charset=utf-8",
 ".json":"application/json; charset=utf-8",
 ".svg":"image/svg+xml",
 ".png":"image/png",
 ".jpg":"image/jpeg",
 ".ico":"image/x-icon"
}
function serveFile(res,filePath){
 try{
  const ext=path.extname(filePath).toLowerCase()
  const type=MIME[ext]||"application/octet-stream"
  const buf=fs.readFileSync(filePath)
  res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-cache"})
  res.end(buf)
 }catch(e){
  res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"})
  res.end("Not Found")
 }
}
const server=http.createServer((req,res)=>{
 let url=req.url.split("?")[0]
 if(url==="/") url="/index.html"
 const filePath=path.join(path.resolve(__dirname,".."),url)
 if(fs.existsSync(filePath)&&fs.statSync(filePath).isFile()){
  serveFile(res,filePath)
 }else{
  serveFile(res,path.join(path.resolve(__dirname,".."),"index.html"))
 }
})
server.listen(PORT,()=>{})
