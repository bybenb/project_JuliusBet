import { usuariosGlobal as baseUsers } from './data.js';

// Carregar usuários persistidos do localStorage e mesclar com base
const LS_USERS_KEY = 'jb_users';
let usuariosGlobal = [];

function loadUsers() {
  const saved = JSON.parse(localStorage.getItem(LS_USERS_KEY) || 'null');
  if (Array.isArray(saved)) {
    usuariosGlobal = [...baseUsers, ...saved];
  } else {
    usuariosGlobal = [...baseUsers];
  }
}

function saveUsers() {
  // salvamos apenas os usuários criados pelo registro (exclui os da base)
  const newOnes = usuariosGlobal.filter(u => !baseUsers.find(b => b.usuario === u.usuario));
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(newOnes));
}

loadUsers();

export function autenticar(usuario, senha) {
  return usuariosGlobal.find(u => u.usuario === usuario && u.senha === senha) ? true : false;
}

export function getUsuarioLogado() {
  return localStorage.getItem('usuarioLogado');
}

export function setUsuarioLogado(usuario) {
  localStorage.setItem('usuarioLogado', usuario);
}

export function logout() {
  localStorage.removeItem('usuarioLogado');
  // reload para simplificar UI
  location.reload();
}

export function registerUser(usuario, senha) {
  // evitar duplicados
  if (usuariosGlobal.find(u => u.usuario === usuario)) return false;
  const obj = { usuario, senha };
  usuariosGlobal.push(obj);
  saveUsers();
  return true;
}
