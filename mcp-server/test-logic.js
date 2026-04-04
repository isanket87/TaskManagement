import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const API_URL = process.env.BRIORIGHT_API_URL || 'http://localhost:5000/api'
const API_KEY = process.env.BRIORIGHT_API_KEY
const WS_SLUG = process.env.BRIORIGHT_WORKSPACE_ID

if (!API_KEY || !WS_SLUG) {
    console.error('❌ BRIORIGHT_API_KEY and BRIORIGHT_WORKSPACE_ID must be set in .env')
    process.exit(1)
}

const client = axios.create({
    baseURL: API_URL,
    headers: { 'X-API-Key': API_KEY }
})

async function testTools() {
    console.log('🚀 Starting MCP Tool Verification...\n')

    try {
        // 1. Test Search Users
        console.log('🔍 Testing: search_users ("Sanket")...')
        const users = await client.get('/users/search?q=Sanket')
        console.log(`✅ Found ${users.data.users?.length || 0} users.\n`)

        // 2. Test Project Analytics
        console.log('📊 Testing: get_project_analytics...')
        const projects = await client.get(`/workspaces/${WS_SLUG}/projects`)
        const projectId = projects.data.projects?.[0]?.id
        if (projectId) {
            const analytics = await client.get(`/workspaces/${WS_SLUG}/projects/${projectId}/analytics`)
            console.log(`✅ Analytics fetched for project: ${projectId}\n`)
        } else {
            console.log('⚠️ No projects found to test analytics.\n')
        }

        // 3. Test Notifications
        console.log('🔔 Testing: get_notifications...')
        const notifications = await client.get('/notifications')
        console.log(`✅ Fetched ${notifications.data.notifications?.length || 0} notifications.\n`)

        // 4. Test Active Timers
        console.log('⏱️ Testing: get_active_timers...')
        const timers = await client.get(`/workspaces/${WS_SLUG}/time-entries/active`)
        console.log(`✅ Fetched active timers.\n`)

        console.log('🎉 All core endpoints for new tools verified!')
    } catch (error) {
        console.error('❌ Test failed:')
        if (error.response) {
            console.error(`   Status: ${error.response.status}`)
            console.error(`   Data: ${JSON.stringify(error.response.data)}`)
        } else {
            console.error(`   Message: ${error.message}`)
        }
    }
}

testTools()
