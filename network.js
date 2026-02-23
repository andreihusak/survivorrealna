// ══════════════════════════════════════════════════════
//  network.js — PeerJS multiplayer backend (FIXED)
//  Host:   simulates world, broadcasts state ~30hz
//  Client: sends inputs, receives and applies state
// ══════════════════════════════════════════════════════

export const PLAYER_COLORS = [
  '#4adeff','#ff6644','#44ff88','#ffdd44',
  '#cc88ff','#ff88cc','#88ffdd','#ff4488',
];

let peer       = null;
let isHost     = false;
let myId       = null;
let myName     = 'Player';
let myColor    = PLAYER_COLORS[0];
let colorIndex = 0;

// Host only
const connections = {};  // peerId → DataConnection

// Client only
let hostConn = null;

// Shared remote player lobby info
export let remotePlayers = {};   // peerId → { id, name, color }

// Callbacks set by game logic
let _onStartGame    = null;
let _onClientState  = null;
let _onClientInputs = null;
let _onPlayerLeft   = null;
let _onGameOver     = null;

export let pingMs  = 0;
let lastPingSent   = 0;

export function genCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export function getMyId()        { return myId; }
export function getMyName()      { return myName; }
export function getMyColor()     { return myColor; }
export function getIsHost()      { return isHost; }
export function getConnections() { return connections; }

export function setCallbacks({ onStartGame, onClientState, onClientInputs, onPlayerLeft, onGameOver }) {
  _onStartGame    = onStartGame;
  _onClientState  = onClientState;
  _onClientInputs = onClientInputs;
  _onPlayerLeft   = onPlayerLeft;
  _onGameOver     = onGameOver;
}

// ── HOST ──────────────────────────────────────────────
export function hostGame(name, onReady, onError) {
  myName  = name || 'Host';
  myColor = PLAYER_COLORS[colorIndex++ % PLAYER_COLORS.length];
  isHost  = true;

  const code = genCode();
  peer = new Peer(code, { debug: 0 });

  peer.on('open', id => {
    myId = id;
    if (onReady) onReady(id);
  });

  peer.on('connection', conn => {
    conn.on('open', () => {
      connections[conn.peer] = conn;

      // Assign this client a color
      const assignedColor = PLAYER_COLORS[colorIndex++ % PLAYER_COLORS.length];

      // Send welcome packet with assigned color and current lobby
      conn.send({
        type:    'lobby_info',
        players: getLobbyList(),
        color:   assignedColor,
      });

      conn.on('data',  data => _handleHostReceive(conn.peer, data));
      conn.on('close', () => {
        delete connections[conn.peer];
        delete remotePlayers[conn.peer];
        broadcastAll({ type: 'player_left', peerId: conn.peer });
        if (_onPlayerLeft) _onPlayerLeft(conn.peer);
        // Broadcast updated lobby to remaining players
        broadcastAll({ type: 'lobby_update', players: getLobbyList() });
      });

      // Notify everyone of the new arrival
      broadcastAll({ type: 'lobby_update', players: getLobbyList() });
    });
  });

  peer.on('error', e => {
    if (onError) onError(e.type);
  });
}

function _handleHostReceive(fromId, data) {
  switch (data.type) {
    case 'join_info':
      remotePlayers[fromId] = { id: fromId, name: data.name, color: data.color };
      // Broadcast updated lobby to everyone including the new player
      broadcastAll({ type: 'lobby_update', players: getLobbyList() });
      break;
    case 'inputs':
      if (_onClientInputs) _onClientInputs(fromId, data);
      break;
    case 'ping':
      connections[fromId]?.send({ type: 'pong', t: data.t });
      break;
  }
}

export function broadcastAll(data) {
  Object.values(connections).forEach(c => {
    try { c.send(data); } catch (e) {}
  });
}

export function broadcastState(snapshot) {
  broadcastAll({ type: 'state', ...snapshot });
}

export function sendStartSignal(playerColors) {
  broadcastAll({ type: 'start', playerColors });
}

export function sendGameOver() {
  broadcastAll({ type: 'gameover' });
}

// ── CLIENT ─────────────────────────────────────────────
export function joinGame(code, name, onConnected, onError) {
  myName = name || 'Player';
  isHost = false;
  peer   = new Peer(undefined, { debug: 0 });

  peer.on('open', id => {
    myId     = id;
    hostConn = peer.connect(code.toUpperCase(), { reliable: false });

    hostConn.on('open', () => {
      // Send our name first; color is assigned by host in lobby_info
      hostConn.send({ type: 'join_info', name: myName });
      if (onConnected) onConnected();
    });

    hostConn.on('data',  data => _handleClientReceive(data));
    hostConn.on('close', ()   => { if (_onGameOver) _onGameOver(); });
    hostConn.on('error', e    => { if (onError) onError(e); });
  });

  peer.on('error', e => {
    if (onError) onError(e.type);
  });
}

function _handleClientReceive(data) {
  switch (data.type) {
    case 'lobby_info':
      // Host assigns us our color
      myColor = data.color;
      updateLobbyFromList(data.players);
      // Now confirm back to host with our name + assigned color
      hostConn.send({ type: 'join_info', name: myName, color: myColor });
      break;

    case 'lobby_update':
      updateLobbyFromList(data.players);
      break;

    case 'start':
      // Use the color the host assigned us in playerColors map
      myColor = data.playerColors?.[myId] || myColor;
      if (_onStartGame) _onStartGame(data.playerColors);
      break;

    case 'state':
      if (_onClientState) _onClientState(data);
      break;

    case 'pong':
      pingMs = Date.now() - data.t;
      break;

    case 'player_left':
      delete remotePlayers[data.peerId];
      if (_onPlayerLeft) _onPlayerLeft(data.peerId);
      break;

    case 'gameover':
      if (_onGameOver) _onGameOver();
      break;
  }
}

export function sendInputsToHost(inputData) {
  if (!hostConn) return;
  try { hostConn.send({ type: 'inputs', ...inputData }); } catch (e) {}

  // Ping every 2 seconds to measure latency
  if (Date.now() - lastPingSent > 2000) {
    lastPingSent = Date.now();
    try { hostConn.send({ type: 'ping', t: Date.now() }); } catch (e) {}
  }
}

// ── Shared helpers ─────────────────────────────────────
function getLobbyList() {
  const list = [{ id: myId, name: myName, color: myColor }];
  Object.values(remotePlayers).forEach(p => list.push(p));
  return list;
}

function updateLobbyFromList(players) {
  (players || []).forEach(p => {
    if (p.id !== myId) remotePlayers[p.id] = p;
  });
}

export function getLobbyPlayers() { return getLobbyList(); }

export function destroyPeer() {
  try { peer?.destroy(); } catch (e) {}
  peer = null;
}