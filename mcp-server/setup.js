#!/usr/bin/env node

import readline from 'readline'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function runSetup() {
    console.log('\n🌟 Welcome to the Brioright MCP Setup!\n')
    console.log('This will configure your local IDE to connect to your Brioright workspace.')

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    const ask = (query) => new Promise(resolve => rl.question(query, resolve))

    // 1. Gather credentials
    const apiKey = await ask('Enter your Brioright API Key: ')
    if (!apiKey.trim()) {
        console.log('❌ API Key is required. Exiting.')
        rl.close()
        process.exit(1)
    }

    const workspaceId = await ask('Enter your Workspace ID (slug): ')
    if (!workspaceId.trim()) {
        console.log('❌ Workspace ID is required. Exiting.')
        rl.close()
        process.exit(1)
    }

    rl.close()

    // 2. The config block to inject
    const newConfig = {
        "command": "npx",
        "args": ["-y", "brioright-mcp"],
        "env": {
            "BRIORIGHT_API_URL": "https://brioright.online/api",
            "BRIORIGHT_API_KEY": apiKey.trim(),
            "BRIORIGHT_WORKSPACE_ID": workspaceId.trim()
        }
    }

    // 3. Search for known IDE configs
    const home = os.homedir()

    // Antigravity
    const antigravityPath = path.join(home, '.gemini', 'antigravity', 'mcp_config.json')
    // VS Code / Cursor generic
    const vscodeMcpPath = path.join(home, '.vscode', 'mcp.json')
    // Cline / Roo Code (Windows)
    const clineWindowsPath = path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json')
    // Cline / Roo Code (Mac)
    const clineMacPath = path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json')

    const possiblePaths = [
        { name: 'Antigravity IDE', path: antigravityPath },
        { name: 'VS Code (Roo/Cline) Windows', path: clineWindowsPath },
        { name: 'VS Code (Roo/Cline) Mac', path: clineMacPath },
        { name: 'Generic VS Code', path: vscodeMcpPath }
    ]

    let injected = false

    for (const ide of possiblePaths) {
        if (fs.existsSync(ide.path)) {
            try {
                const content = fs.readFileSync(ide.path, 'utf8')
                const json = JSON.parse(content || '{}')

                if (!json.mcpServers) json.mcpServers = {}

                json.mcpServers['brioright-remote'] = newConfig

                fs.writeFileSync(ide.path, JSON.stringify(json, null, 2))
                console.log(`\n✅ Successfully added Brioright to: ${ide.name}`)
                console.log(`   📝 File: ${ide.path}`)
                injected = true
            } catch (err) {
                console.log(`\n⚠️ Found config for ${ide.name} but failed to update it: ${err.message}`)
            }
        }
    }

    if (injected) {
        console.log('\n🎉 Setup complete! Please completely close and RESTART YOUR IDE for the new tools to load.')
        return
    }

    // 4. Fallback if no IDE config found
    console.log('\n⚠️ We could not find a supported IDE configuration file automatically.')
    console.log('To set up Brioright, please copy the following JSON block into your MCP Settings file (e.g. mcp_settings.json):\n')

    const fallbackBlock = {
        "mcpServers": {
            "brioright-remote": newConfig
        }
    }

    console.log(JSON.stringify(fallbackBlock, null, 2))
    console.log('\n(Once saved, restart your IDE.)\n')
}
