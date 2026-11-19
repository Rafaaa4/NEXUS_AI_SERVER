import React, { useState, useEffect } from 'react';
import { 
  Database, CheckCircle2, HardDrive, ShieldCheck, Activity, Clock, 
  RefreshCw, Plus, Play, Square, RotateCcw, Trash2, Copy, Check,
  Server, Key, Terminal, ExternalLink, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  servers: any[];
}

export const DatabasesView: React.FC<Props> = ({ servers }) => {
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [activeConfigDb, setActiveConfigDb] = useState<any | null>(null);

  // Deploy Modal Form State
  const [formServerId, setFormServerId] = useState<string>(servers[0]?.id || '');
  const [formDbType, setFormDbType] = useState<string>('MySQL');
  const [formDbName, setFormDbName] = useState<string>('app_production');
  const [formUsername, setFormUsername] = useState<string>('db_admin');
  const [formPassword, setFormPassword] = useState<string>('SecretPass2026!');
  const [formPort, setFormPort] = useState<number>(3306);
  const [deploying, setDeploying] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const serverFilter = selectedServerId === 'all' ? undefined : selectedServerId;
      const res = await api.listDatabases(serverFilter);
      setDatabases(res);
    } catch (err: any) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, [selectedServerId]);

  useEffect(() => {
    if (servers.length > 0 && !formServerId) {
      setFormServerId(servers[0].id);
    }
  }, [servers]);

  const handleDbTypeChange = (type: string) => {
    setFormDbType(type);
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'mariadb':
        setFormPort(3306);
        break;
      case 'postgresql':
        setFormPort(5432);
        break;
      case 'mongodb':
        setFormPort(27017);
        break;
      case 'redis':
        setFormPort(6379);
        break;
    }
  };

  const handleDeployDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formServerId) return;

    try {
      setDeploying(true);
      await api.createDatabase({
        serverId: formServerId,
        name: formDbName,
        dbType: formDbType,
        port: formPort,
        username: formUsername,
        password: formPassword,
      });

      setShowDeployModal(false);
      setNotice({ type: 'success', text: `Database '${formDbName}' provisioned successfully on server!` });
      setTimeout(() => setNotice(null), 5000);
      fetchDatabases();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to deploy database.' });
    } finally {
      setDeploying(false);
    }
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'backup') => {
    try {
      setActionLoading(id + '-' + action);
      await api.databaseAction(id, action);
      setNotice({ type: 'success', text: `Database action '${action}' triggered on server.` });
      setTimeout(() => setNotice(null), 4000);
      fetchDatabases();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete database '${name}'? This will stop and remove the container.`)) {
      return;
    }
    try {
      setActionLoading(id + '-delete');
      await api.deleteDatabase(id);
      setNotice({ type: 'success', text: `Database '${name}' removed.` });
      setTimeout(() => setNotice(null), 4000);
      fetchDatabases();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to delete database.' });
    } finally {
      setActionLoading(null);
    }
  };

  const copyUri = (db: any) => {
    const s = servers.find((srv) => srv.id === db.serverId);
    const host = s?.hostname || window.location.hostname;
    let proto = db.dbType.toLowerCase();
    if (proto === 'postgresql') proto = 'postgres';
    const uri = `${proto}://${db.username}:${db.password || '******'}@${host}:${db.port}/${db.name}`;
    navigator.clipboard.writeText(uri);
    setCopiedId(db.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDbEngineIconColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mysql': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'postgresql': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'mongodb': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'redis': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <Database className="h-4 w-4" />
            <span>Database Orchestration & Fleet Control</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Multi-Server Managed Databases</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deploy, provision, and configure isolated database containers (MySQL, PostgreSQL, Redis, MongoDB) per server with 1-click.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDatabases()}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/60 transition"
            title="Refresh database list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Deploy Database</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Server Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800/80">
        <button
          onClick={() => setSelectedServerId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
            selectedServerId === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>All Servers ({databases.length})</span>
        </button>

        {servers.map((s) => {
          const isOnline = s.status === 'online';
          const serverDbs = databases.filter((d) => d.serverId === s.id);
          return (
            <button
              key={s.id}
              onClick={() => setSelectedServerId(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                selectedServerId === s.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <Server className="h-3.5 w-3.5" />
              <span>{s.name} ({s.hostname || 'VPS'})</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-md text-slate-300">{serverDbs.length}</span>
            </button>
          );
        })}
      </div>

      {/* Databases Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400" />
          <p className="text-xs">Loading database clusters and health metrics...</p>
        </div>
      ) : databases.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Database className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">No databases provisioned on this server</h3>
            <p className="text-xs text-slate-400 mt-1">
              Deploy MySQL, PostgreSQL, MongoDB, or Redis directly into an isolated Docker container on your server with a single click.
            </p>
          </div>
          <button
            onClick={() => setShowDeployModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition"
          >
            + Deploy First Database
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {databases.map((db) => {
            const server = servers.find((s) => s.id === db.serverId);
            const isRunning = db.status === 'running';

            return (
              <div
                key={db.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700/80 transition relative group"
              >
                {/* Top Title & Status */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${getDbEngineIconColor(db.dbType)}`}>
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-white">{db.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300">
                          {db.dbType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                        <span>Port {db.port}</span>
                        <span>•</span>
                        <span>{db.version}</span>
                        <span>•</span>
                        <span className="text-blue-400 font-semibold">{server?.name || 'Local Host'} ({server?.hostname || '127.0.0.1'})</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border flex items-center space-x-1 ${
                      isRunning
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span>{db.status.toUpperCase()}</span>
                  </span>
                </div>

                {/* Vitals Stats Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Container</div>
                    <div className="text-xs font-mono font-bold text-slate-200 mt-1 truncate" title={db.containerName}>
                      {db.containerName || `nexus-${db.name}`}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Storage Used</div>
                    <div className="text-xs font-mono font-bold text-white mt-1">{db.storageUsed || '14 MB'}</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Security Mode</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-1 flex items-center justify-center space-x-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Encrypted</span>
                    </div>
                  </div>
                </div>

                {/* Connection URI snippet */}
                <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono">
                  <div className="truncate text-slate-400 select-all">
                    <span className="text-blue-400">{db.dbType.toLowerCase()}://</span>
                    <span>{db.username}:••••••@{server?.hostname || '127.0.0.1'}:{db.port}/{db.name}</span>
                  </div>

                  <button
                    onClick={() => copyUri(db)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shrink-0 transition flex items-center space-x-1"
                    title="Copy full connection string"
                  >
                    {copiedId === db.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400">URI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action Controls Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <button
                    onClick={() => setActiveConfigDb(db)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>View Credentials & Config</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {isRunning ? (
                      <button
                        onClick={() => handleAction(db.id, 'stop')}
                        disabled={actionLoading === db.id + '-stop'}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                        title="Stop Container"
                      >
                        <Square className="h-3 w-3" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(db.id, 'start')}
                        disabled={actionLoading === db.id + '-start'}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                        title="Start Container"
                      >
                        <Play className="h-3 w-3" />
                        <span>Start</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleAction(db.id, 'restart')}
                      disabled={actionLoading === db.id + '-restart'}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                      title="Restart Container"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restart</span>
                    </button>

                    <button
                      onClick={() => handleAction(db.id, 'backup')}
                      disabled={actionLoading === db.id + '-backup'}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                      title="Backup Database Snapshot"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Backup</span>
                    </button>

                    <button
                      onClick={() => handleDelete(db.id, db.name)}
                      disabled={actionLoading === db.id + '-delete'}
                      className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                      title="Delete Database"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy Database Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Deploy Database to Server</h3>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeployDb} className="space-y-4">
              {/* Server Target Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Server VPS
                </label>
                <select
                  value={formServerId}
                  onChange={(e) => setFormServerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.hostname || 'VPS'}) • {s.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* DB Type Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Database Engine
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleDbTypeChange(type)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                        formDbType === type
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Database Name & Port */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Database Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formDbName}
                    onChange={(e) => setFormDbName(e.target.value)}
                    placeholder="my_database"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={formPort}
                    onChange={(e) => setFormPort(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin User
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-blue-400 shrink-0" />
                <span>
                  The remote agent will execute <code className="text-white">docker run</code> with persistent volumes and restart policies.
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deploying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center space-x-1.5"
                >
                  {deploying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Deploy Container</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Credentials & Config Modal */}
      {activeConfigDb && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">{activeConfigDb.name} Credentials & Config</h3>
              </div>
              <button
                onClick={() => setActiveConfigDb(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Database Type</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">{activeConfigDb.dbType} ({activeConfigDb.version})</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Port</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">{activeConfigDb.port}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Username: </span>
                  <code className="text-emerald-400 select-all font-mono font-bold">{activeConfigDb.username}</code>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Password: </span>
                  <code className="text-white select-all font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{activeConfigDb.password}</code>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Container Name: </span>
                  <code className="text-blue-400 select-all font-mono">{activeConfigDb.containerName}</code>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Full Connection URI
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 break-all select-all flex items-center justify-between gap-2">
                  <span>
                    {activeConfigDb.dbType.toLowerCase()}://{activeConfigDb.username}:{activeConfigDb.password}@{servers.find(s => s.id === activeConfigDb.serverId)?.hostname || '127.0.0.1'}:{activeConfigDb.port}/{activeConfigDb.name}
                  </span>
                  <button
                    onClick={() => copyUri(activeConfigDb)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0 transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setActiveConfigDb(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
