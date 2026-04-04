import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

async function listWorkspaces() {
    const API_URL = process.env.BRIORIGHT_API_URL || 'http://localhost:3001/api'
    const API_KEY = process.env.BRIORIGHT_API_KEY

    try {
        const res = await axios.get(`${API_URL}/workspaces`, {
            headers: { 'X-API-Key': API_KEY }
        })
        console.log('Workspaces found on local server:')
        console.log(JSON.stringify(res.data.workspaces || res.data, null, 2))
    } catch (err) {
        console.error('Error fetching workspaces:', err.message)
    }
}

listWorkspaces()
