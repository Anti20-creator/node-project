const app               = require('./app/app')
const cors              = require('cors')
const port              = process.env.PORT || 4001
const https             = require('https')
const express           = require('express')
const fs                = require('fs')
const cron              = require('node-cron')
const { events }        = require('./socket/events')
const { Server }        = require('socket.io')
const cluster           = require('cluster');
const numCPUs           = require('os').cpus().length;
const prcs              = require('process');
const redisAdapter      = require('socket.io-redis');
const InvoiceController = require('./controller/invoiceController')

cluster.schedulingPolicy = cluster.SCHED_RR

if (cluster.isMaster) {
  console.log(`Primary ${prcs.pid} is running`);
  
  cron.schedule('* 0 0 2 * *', () => {
    InvoiceController.sendReports()
  });

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
	  cluster.fork()
  })

} else {
  const corsConfig = {
    origin: true,
    credentials: true
  }
  app.use(cors(corsConfig))
  app.options('*', cors(corsConfig))
  
  const privateKey = fs.readFileSync('./keys/key.pem', 'utf-8')
  const certificate = fs.readFileSync('./keys/server.crt', 'utf-8')
  
  const server = https.createServer({
    key: privateKey,
    cert: certificate
  }, app)

  
  const io = new Server(server, {
    cors: {
        origin: ["*"],
        credentials: true
    },
    allowEIO3: true
  })

  events(io)
  app.set('socketio', io)
  app.use('/backgrounds', express.static(__dirname + '/public/backgrounds'));

  io.adapter(redisAdapter({ host: '192.168.31.214', port: 6379 }));

  server.listen(port, () => {
      console.log('Server started ' + port)
  })

  console.log(`Worker ${prcs.pid} started`);
}
