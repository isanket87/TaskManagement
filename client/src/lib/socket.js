import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
let socket = null

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        })
        socket.on('connect', () => console.log('✅ Socket connected'))
        socket.on('connect_error', (e) => console.error('Socket error:', e.message))
    }
    return socket
}

export const connectSocket = (token) => {
    const s = getSocket()
    s.auth = { token }
    if (!s.connected) s.connect()
    return s
}

export const disconnectSocket = () => {
    if (socket) { socket.disconnect(); socket = null }
}

export default getSocket
