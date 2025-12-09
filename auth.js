import { usuariosGlobal } from './data.js';

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
  usuariosGlobal.push({ usuario, senha });
}
