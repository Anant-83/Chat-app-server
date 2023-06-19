const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const cors = require("cors");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const interestsRouter = require("../routes/interestsRoutes");
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: "http://localhost:3000" }));
const server = http.createServer(app);
const io = socketio(server);
// require("../app");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(interestsRouter);
const {
  addUser,
  getUser,
  removeUser,
  getUsersInRoom,
  availableRooms,
} = require("../utils/user");
const { genratemessage } = require("../utils/message");
const { useScrollTrigger } = require("@mui/material");
const { emit } = require("process");
const ADMIN_ID = "I_AM_ADMIN";
const mp = new Map();
const pairs = new Map();
const groupmsg = new Map();
const {usersInRoom,users} = require('../utils/user');
const us_rm = new Map();

const block = new Map();
app.post('/Msg', (req, res) => {
  // const userId = req.body; // Retrieve the 'id' parameter from the query string
  // console.log("-> " + req.body.userId);
  // console.log(mp);
  console.log("namee " + req.body.romm);
  res.send(groupmsg.get(req.body.romm));
});
app.post('/GroupMsg', (req, res) => {
  res.send(groupmsg.get(req.body.roomname));
});  

app.post('/Get_List', (req,res) => {
  console.log("Req...");
  console.log(req.body.userId);
  console.log(us_rm);
  const us = users.get(req.body.userId);
  res.send(us_rm.get(us.room));
})

app.post('/blockUser',(req,res) => {
  const blockid = req.body.blockid;
  const who = req.body.userId;
  let st = new Set();
  if(!block.has(who))
  block.set(who,st);
  st = block.get(who);
  console.log("block");
  console.log(who);
  console.log(blockid);
  console.log(st);
  st.add(blockid);
  console.log(st);
  block.set(who,st);
  console.log(block);
  res.send("blocked..");
});
app.post('/unblockUser',(req,res) => {
  const blockid = req.body.blockid;
  const who = req.body.userId;
  let st = block.get(who);
  st.delete(blockid);
  block.set(who,st);
  console.log("Unblock");
  console.log(block);
  res.send("Unblocked..");
  
});
app.post('/getBlock', (req,res) => {
  console.log(req.body.reqid);
  const st = block.get(req.body.reqid);
  const arr = [];
  for (const value of st) {
    arr.push(value);
  }
  res.send(arr)
})
app.post('/Findroom', (req, res) => {
  // const userId = req.body; // Retrieve the 'id' parameter from the query string
  const {user1,user2,curroom} = req.body;
  console.log("===>>>");
  console.log(pairs);
  const arr = pairs.get(req.body.user1);
  if(arr)
  {
   for(let i = 0; i < arr.length; i++)
   {
     if(arr[i].name == req.body.user2)
     {
      console.log("Hii whats up");
       res.send(arr[i].roomname);
       return;
     }
   }
 }

  
  if(!pairs.has(req.body.user1))
  pairs.set(req.body.user1,[]);
  if(!pairs.has(req.body.user2))
  pairs.set(req.body.user2,[]);
 
  const det1 = {
    name : req.body.user2,
    roomname : req.body.curroom
  }
  const det2 = {
    name : req.body.user1,
    roomname : req.body.curroom
  }
  pairs.get(req.body.user1).push(det1);
  pairs.get(req.body.user2).push(det2);
  res.send("Not Found");
});

app.post("/Isthere",(req,res) => {
  const roomname = req.body.roomname;
  const arr = us_rm.get(roomname);
  if(!arr)
  res.send("0");
  for(let i = 0; i < arr.length; i++)
  {
    if(arr[i] == req.body.usname)
    {
      res.send("1");
    }
  }
  res.send("0");
})

io.on("connection", (socket) => {




  // socket.emit("mp_map", { mp: Array.from(mp.entries()) });
  // socket.on('give', () => {
  //   console.log("Hii give");
  //   console.log(mp);
  //   socket.emit({mp});
  // })
  // When someone join the room
  socket.on("join", (data, callback) => {
    const { error, user } = addUser({
      id: socket.id,
      ...data,
    });
    availableRooms();
    console.log(usersInRoom);
    console.log(users);
    if (error) {
      return callback(error);
    }

    const room_name = user.room;
    if(!us_rm.has(room_name))
    us_rm.set(room_name,[]);

    us_rm.get(room_name).push(user);
    console.log(us_rm);
    // Creates vertual connection between users in the same room
    socket.join(user.room);
   
    // This will send massage to currunt user
    socket.emit(
      "recive_message",
      genratemessage({
        name: "Admin",
        message: `Welcome, ${user.name}.`,
        id: ADMIN_ID,
      })
    );
    

    // This will send massage to all users expect currunt user
    socket.broadcast.to(user.room).emit(
      "recive_message",
      genratemessage({
        name: "Admin",
        message: `${user.name} has joined.`,
        id: ADMIN_ID,
      })
    );

    

    io.to(user.room).emit("room", {
      room: user.room,
      usersInRoom: getUsersInRoom(user.room),
    });
    // to notify client
    callback();
  });

  // Message sent
  socket.on("send_message", (message, callback) => {
    const user = getUser(socket.id);
    if(!groupmsg.has(user.room))
    groupmsg.set(user.room,[]);

    groupmsg.get(user.room).push(genratemessage({ name: user.name, message, id: user.id }));
    //this will send massage to all users in a room
    io.to(user.room).emit(
      "recive_message",
      genratemessage({ name: user.name, message, id: user.id })
    );
    callback();
  });

  socket.on("private_room", (data, callback) => {
    const roomName = data.roomName;
    let user = getUser(data.me.id);
    const users = getUsersInRoom(user.room);
    users.map((user) => {
      if (user.id === data.me.id || data.user.id) {
        user.privateRoom = roomName;
      }
    });
    io.sockets.sockets.get(data.me.id).join(roomName);
    io.sockets.sockets.get(data.user.id).join(roomName);
    io.to(roomName).emit(
      "recive_private_message",
      genratemessage({
        name: data.me.name,
        message: `hii i am ${data.me.name}.`,
        id: data.me.id,
      })
    );
    callback();
  });

  socket.on("private_msg" , async ({message,pvt}, callback) => {
    const user = getUser(socket.id);
    console.log("private msg here : - ");
    // console.log(user.privateRoom);
    // console.log(message);
    console.log(user);
    console.log(pvt);
    let to_id = pvt.id;
    const ms = {
      from : user.id,
      to : pvt.id,
      message : message
    }
    if(!groupmsg.has(pvt.privateRoom))
    groupmsg.set(pvt.privateRoom,[]);

    socket.to(pvt.privateRoom).emit("rcv_pvt",genratemessage({ name: user.name, message, id: user.id }))
    
    groupmsg.get(pvt.privateRoom).push(genratemessage({ name: user.name, message, id: user.id }));
  

    // const det1 = {
    //   name : pvt.name,
    //   roomname : user.privateRoom
    // }
    // const det2 = {
    //   name : user.name,
    //   roomname : user.privateRoom
    // }
    // await pairs.get(user.name).push(det1);
    // await pairs.get(pvt.name).push(det2);

    // // console.log(pairs);
    // await mp.get(user.id).push(obj);
    // await mp.get(pvt.id).push(obj);

    // console.log(mp);
    // console.log("pushed");
    await callback();
  });
  socket.on("send_Files", (files, callback) => {
    const user = getUser(socket.id);
    const fileDetails = [];
    files.forEach((file) => {
      const filedata = {
        file: Buffer.from(file.file).toString("base64"),
        type: file.type,
        name: file.name,
        width: file.width,
        height: file.height,
      };
      fileDetails.push(filedata);
    });
    io.to(user.room).emit(
      "recive_message",
      genratemessage({ name: user.name, files: fileDetails, id: user.id })
    );
    callback();
  });

  socket.on('file-upload', (data) => {
    const file = data.file;
    io.emit('file-received', { file: file});
  });
  // Leave room or refreash the page
  socket.on("disconnect", () => {
    console.log("Leaving");
    const dta = getUser(socket.id);
    const arr = us_rm.get(dta.room);
    for(let i = 0; i<arr.length; i++)
    {
      if(arr[i].id == socket.id)
      {
        arr.splice(i,1);
        break;
      }
    }
    us_rm.set(dta.room,arr);
    console.log(arr);
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "recive_message",
        genratemessage({
          name: "Admin",
          message: `${user.name} has left.`,
          id: ADMIN_ID,
        })
      );
      io.to(user.room).emit("room", {
        room: user.room,
        usersInRoom: getUsersInRoom(user.room),
      });
    }
    else
    {
      mp = new Map();
      pairs = new Map();
      groupmsg = new Map();
      us_rm = new Map();
    }
  });
});

const port = process.env.port || 8000;
server.listen(port, () => {
  console.log(`SERVER RUNNING ON PORT ${port}...`);
});
