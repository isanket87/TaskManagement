import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, Terminal, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ApiKeysSection = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newKey, setNewKey] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchKeys = async () => {
        try {
            const res = await api.get('/api-keys');
            setKeys(res.data.data.apiKeys);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await api.post('/api-keys', { name: newName });
            const createdKey = res.data.data.apiKey;
            setNewKey(createdKey.key);
            setNewName('');
            await fetchKeys();
            toast.success('API key generated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create API key');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('Are you sure you want to revoke this API key? Any applications using it will immediately lose access.')) {
            return;
        }
        try {
            await api.delete(`/api-keys/${id}`);
            setKeys(keys.filter(k => k.id !== id));
            toast.success('API key revoked');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to revoke API key');
        }
    };

    const handleCopy = () => {
        if (newKey) {
            navigator.clipboard.writeText(newKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Copied to clipboard');
        }
    };

    return (
        <div className="card p-6 border-indigo-200 dark:border-indigo-900/50">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Developer API Settings</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage API keys to connect AI assistants like Claude Desktop or Cursor.</p>
                </div>
            </div>

            {newKey && (
                <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Save your new API key</h3>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 mb-3">
                                Please copy this key and save it securely. For your security, <strong>it will not be shown again!</strong>
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-700 rounded text-sm text-gray-800 dark:text-gray-200 font-mono break-all">
                                    {newKey}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                            <button
                                onClick={() => setNewKey('')}
                                className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                            >
                                I have saved my key securely
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!newKey && (
                <form onSubmit={handleCreate} className="mb-8 flex items-end gap-3">
                    <div className="flex-1">
                        <Input
                            label="Create New API Key"
                            placeholder="e.g., Claude Desktop, Cursor AI"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={!newName.trim() || creating} className="mb-[2px]">
                        {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Generate Key
                    </Button>
                </form>
            )}

            <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Active API Keys</h3>
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
                        <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">You don't have any API keys yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {keys.map(key => (
                            <div key={key.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{key.name}</span>
                                        <code className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                            {key.prefix}...
                                        </code>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Created: {new Date(key.createdAt).toLocaleDateString()}
                                        {' • '}
                                        Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevoke(key.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Revoke Key"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Connecting Claude Desktop</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Add the following configuration to your <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">claude_desktop_config.json</code> file to connect your workspace directly to Claude:
                </p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                    {`{
  "mcpServers": {
    "brioright": {
      "command": "npx",
      "args": ["-y", "@brioright/mcp-server"],
      "env": {
        "BRIORIGHT_API_URL": "${window.location.origin}/api",
        "BRIORIGHT_API_KEY": "YOUR_GENERATED_API_KEY",
        "BRIORIGHT_WORKSPACE_ID": "copy_your_workspace_url_slug_here"
      }
    }
  }
}`}
                </pre>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Connecting Mobile / Remote AI (Gemini, ChatGPT)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    For AI assistant apps that support connecting to a Remote MCP Server (SSE), use the following details to link your workspace over the internet:
                </p>
                <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p><strong>URL / Endpoint:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">https://brioright.online/mcp/sse</code></p>
                    <p><strong>Auth / Server Secret:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">brioright_mcp_secret_2026</code></p>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">✨ Important:</span> Because this server is public, you must ask the AI to run its commands using <strong>your generated API Key above</strong>. (e.g., <em>"Please list my tasks and use my api key: br-..."</em>).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeysSection;
