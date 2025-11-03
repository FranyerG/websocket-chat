const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar WebSocket
wss.on('connection', (ws) => {
    console.log('Cliente conectado ✅');
    
    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Conectado al servidor WebSocket!',
        timestamp: new Date().toISOString()
    }));

    // Recibir mensajes del cliente
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Mensaje recibido:', data);
            
            // Broadcast a todos los clientes
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'message',
                        user: data.user,
                        text: data.text,
                        timestamp: new Date().toISOString()
                    }));
                }
            });
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    // Manejar desconexión
    ws.on('close', () => {
        console.log('Cliente desconectado ❌');
    });
});

// Ruta de salud para Render
app.get('/health', (req, res) => {
    res.json({ status: 'OK', clients: wss.clients.size });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor WebSocket ejecutando en puerto ${PORT}`);
});
