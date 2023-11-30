const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const amqp = require('amqplib');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rabbitMQUrl = 'amqp://zenAdmin:pulsepasswrd_@localhost';

const queueNames = ['Pulse_Sensor', 'ADXL345', 'MLX90614', 'MAX30102', 'Pulse_irt'];
const wsClients = {};

async function setupWebSocket() {
  const connection = await amqp.connect(rabbitMQUrl);

  for (const queueName of queueNames) {
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    channel.consume(queueName, (msg) => {
      if (wsClients[queueName]) {
        wsClients[queueName].send(msg.content.toString());
      }
    }, { noAck: true });
  }
}

wss.on('connection', (ws, req) => {
  const queueKey = req.url.replace('/', ''); // Obtener la clave desde la URL
  wsClients[queueKey] = ws;

  ws.on('close', () => {
    delete wsClients[queueKey];
  });
});

setupWebSocket();

server.listen(3001, () => {
  console.log('Server listening on port 3001');
});
