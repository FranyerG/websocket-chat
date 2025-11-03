const WebSocket = require('ws');

class ChatServer {
    constructor() {
        this.clients = new Map();
        this.users = new Map();
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

    handleMessage(ws, message) {
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
                    console.log(`👤 Usuario registrado: ${data.username}`);
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
                        
                        // Broadcast a todos los clientes
                        this.broadcast(messageData);
                    }
                    break;

                case 'private_message':
                    const fromUser = this.users.get(clientInfo.resourceId);
                    if (fromUser) {
                        const messageData = {
                            type: 'private_message',
                            from_user_id: fromUser.user_id,
                            from_username: fromUser.username,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        };
                        
                        // Enviar mensaje privado
                        this.sendPrivateMessage(data.to_user_id, messageData);
                    }
                    break;
            }
        } catch (error) {
            console.log('Error procesando mensaje:', error);
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
        
        for (let [resourceId, user] of this.users) {
            if (user.user_id === targetUserId && user.conn.readyState === WebSocket.OPEN) {
                user.conn.send(message);
                break;
            }
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
