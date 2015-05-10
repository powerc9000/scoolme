var express = require("express"),
app = express(),
MemoryStore = express.session.MemoryStore,
sessionStore = new MemoryStore(),
server = require("http").createServer(app),
io = require("socket.io"),
io = io.listen(server),
connect = require("connect"),
cookie = require("cookie"),
db = require("./database"),
crypto = require('crypto'),
im = require("imagemagick"),
sockets = require("./io"),
knox = require("knox"),
s3i = require('s3'),
fs = require("fs"),
router = require("./router").router,
RedisStore = require('connect-redis')(express),
sessionSecret = "something",
client = knox.createClient({
  "key":"",
  "secret":"",
  "bucket":""
}),
s3 = s3i.fromKnox(client);
RedisStore = new RedisStore;
app.configure(function(){
	app.use(express.bodyParser());
	app.set("views", __dirname + "/views");
	app.use(express.static(__dirname + '/public'));
	app.set("view options", {layout: false});
	app.engine('html', require('ejs').renderFile);
	app.set('view engine', 'html');
	app.use(express.cookieParser());
	app.use(express.session({store: RedisStore, secret: sessionSecret }));
})
//What is that?
//what is that?
sockets = sockets(io, sessionSecret, RedisStore, db, connect, cookie);

router.call(app, sockets, db, crypto, im, client, fs, s3);

server.listen(3000);


console.log("listening on port 3000")

