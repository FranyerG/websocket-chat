const WebSocket = require('ws');

class ChatServer {
    constructor() {
        this.clients = new Map();
        this.users = new Map();
        // NO inicializar MySQL - Render no puede conectar a tu MySQL local
    }

    start(port) {
        this.wss = new WebSocket.Server({ 
            port: port,
            host: '0.0.0.0'
        });

        this.wss.on('connection', (ws) => {
            console.log('✅ Nueva conexión');
            this.clients.set(ws, { resourceId: Date.now() + Math.random() });

            ws.on('message', (message) => {
                this.handleMessage(ws, message);
            });

            ws.on('close', () => {
                this.handleDisconnect(ws);
            });

            ws.on('error', (error) => {
                console.log('❌ Error:', error);
            });
        });

        console.log(`🚀 Servidor WebSocket ejecutándose en puerto ${port}`);
    }

    async handleMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            const clientInfo = this.clients.get(ws);

            switch(data.type) {
                case 'register':
                    this.users.set(clientInfo.resourceId, {
                        conn: ws,
                        user_id: data.user_id,
                        username: data.username
                    });
                    console.log(`👤 Usuario registrado: ${data.username} (ID: ${data.user_id})`);
                    break;

                case 'private_message':
                    const fromUser = this.users.get(clientInfo.resourceId);
                    if (fromUser) {
                        console.log(`📨 Mensaje privado de ${fromUser.username} para usuario ${data.to_user_id}: ${data.message}`);
                        
                        // SOLO ENVIAR POR WEBSOCKET - NO GUARDAR EN BD
                        const messageData = {
                            type: 'private_message',
                            from_user_id: fromUser.user_id,
                            from_username: fromUser.username,
                            to_user_id: data.to_user_id,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        };
                        
                        this.sendPrivateMessage(data.to_user_id, messageData);
                        
                        // CONFIRMAR AL REMITENTE
                        ws.send(JSON.stringify({
                            type: 'message_sent',
                            timestamp: messageData.timestamp,
                            debug: 'Mensaje enviado (sin guardar en BD)'
                        }));
                    }
                    break;

                case 'message':
                    const user = this.users.get(clientInfo.resourceId);
                    if (user) {
                        const messageData = {
                            type: 'message',
                            from_user_id: user.user_id,
                            from_username: user.username,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        };
                        
                        this.broadcast(messageData);
                    }
                    break;
            }
        } catch (error) {
            console.log('❌ Error procesando mensaje:', error);
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    sendPrivateMessage(targetUserId, data) {
        const message = JSON.stringify(data);
        let sent = false;
        
        for (let [resourceId, user] of this.users) {
            if (user.user_id === targetUserId && user.conn.readyState === WebSocket.OPEN) {
                user.conn.send(message);
                console.log(`📤 Mensaje enviado a usuario ${targetUserId}`);
                sent = true;
                break;
            }
        }
        
        if (!sent) {
            console.log(`⚠️ Usuario ${targetUserId} no está conectado`);
        }
    }

    handleDisconnect(ws) {
        const clientInfo = this.clients.get(ws);
        if (clientInfo) {
            this.users.delete(clientInfo.resourceId);
            this.clients.delete(ws);
            console.log(`❌ Cliente ${clientInfo.resourceId} desconectado`);
        }
    }
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const chatServer = new ChatServer();
chatServer.start(PORT);
