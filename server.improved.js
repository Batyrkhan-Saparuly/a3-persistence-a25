const http = require( "http" ),
      fs   = require( "fs" ),
      // IMPORTANT: you must run `npm install` in the directory for this assignment
      // to install the mime library if you"re testing this on your local machine.
      // However, Glitch will install it automatically by looking in your package.json
      // file.
      mime = require( "mime" ),
      dir  = "public/",
      port = 3000

const todos = [
  {
    id: "1",
    task: "Set up meetings",
    priority: "medium",
    createdAt: "2025-09-07T12:00:00.000Z",
    dueDate: "2025-09-10T12:00:00.000Z" // (Derived field, it will be computed on the server for new items)
  }
]

const server = http.createServer( function( request,response ) {
  if( request.method === "GET" ) {
    handleGet( request, response )    
  }else if( request.method === "POST" ){
    handlePost( request, response ) 
  }
})

const handleGet = function( request, response ) {
  const filename = dir + request.url.slice( 1 ) 

  if (request.url === "/todos") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
    response.end(JSON.stringify(todos))   
    return
  }
  if( request.url === "/" ) {
    sendFile( response, "public/index.html" )
  }else{
    sendFile( response, filename )
  }
}

const handlePost = function (request, response) {
  let dataString = "";

  request.on( "data", function( data ) {
      dataString += data 
  })

  request.on("end", () => {
  
    let bodyObj = {};
    try {
      bodyObj = JSON.parse(dataString || "{}");
    } catch {
      response.writeHeader(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    // Create
    if (request.url === "/todos") {
      const task = String(bodyObj.task ?? "").trim();
      const priority = String(bodyObj.priority ?? "low").toLowerCase();

      const id = Math.random().toString(36).slice(2);
      const createdAt = new Date().toISOString();

      // derived: dueDate from priority + createdAt
      const created = new Date(createdAt);
      const days = priority === "high" ? 1 : (priority === "medium" ? 3 : 7);
      created.setDate(created.getDate() + days);
      const dueDate = created.toISOString();

      todos.push({ id, task, priority, createdAt, dueDate });

      response.writeHeader(201, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(todos));
      return;
    }

    // update
    if (request.url === "/todos/update") {
      const id = String(bodyObj.id ?? "");
      if (!id) {
        response.writeHeader(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Missing id" }));
        return;
      }

      const item = todos.find(t => t.id === id);
      if (!item) {
        response.writeHeader(404, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      if (typeof bodyObj.task === "string") item.task = bodyObj.task.trim();

      if (typeof bodyObj.priority === "string") {
        const p = bodyObj.priority.toLowerCase();
        if (!["low","medium","high"].includes(p)) {
          response.writeHeader(400, { "Content-Type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ error: "Invalid priority" }));
          return;
        }
        item.priority = p;
      }

      // recompute derived field from item.priority + original createdAt
      const created = new Date(item.createdAt);
      const days = item.priority === "high" ? 1 : (item.priority === "medium" ? 3 : 7);
      created.setDate(created.getDate() + days);
      item.dueDate = created.toISOString();

      response.writeHeader(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(todos));
      return;
    }

    // delete
    if (request.url === "/todos/delete") {
      const id = String(bodyObj.id ?? "");
      if (!id) {
        response.writeHeader(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Missing id" }));
        return;
      }

      const idx = todos.findIndex(t => t.id === id);
      if (idx !== -1) todos.splice(idx, 1);

      response.writeHeader(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(todos));
      return;
    }

    // unknown POST route
    response.writeHeader(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  request.on("error", () => {
    response.writeHeader(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Request error" }));
  });
};

const sendFile = function( response, filename ) {
   const type = mime.getType( filename ) 

   fs.readFile( filename, function( err, content ) {

     // if the error = null, then we"ve loaded the file successfully
     if( err === null ) {

       // status code: https://httpstatuses.com
       response.writeHeader( 200, { "Content-Type": type })
       response.end( content )

     }else{

       // file not found, error code 404
       response.writeHeader( 404 )
       response.end( "404 Error: File Not Found" )

     }
   })
}

server.listen( process.env.PORT || port )
