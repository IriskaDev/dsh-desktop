/* global require, document */

// Preload for the frameless desktop window. Runs with `contextIsolation: false`
// so it can touch the page DOM; it injects a top drag strip and a custom close
// button (the native title bar is removed via `frame: false`).

const { ipcRenderer } = require('electron');

const CLOSE_CHANNEL = 'dsh-desktop:close';
const TITLEBAR_ID = 'dsh-desktop-titlebar';
const CLOSE_ID = 'dsh-desktop-close';

// The DSH web header reserves a 12px empty top padding above its title row
// (where the Session log button lives). Keep the drag strip inside that dead
// zone so it does not cover the Session log button, and keep the close button
// in the header's 28px right padding so it sits beside the button instead of
// on top of it.
const TITLEBAR_HEIGHT = 12;
const CLOSE_WIDTH = 28;
const CLOSE_HEIGHT = 32;

const STYLE = [
  `#${TITLEBAR_ID}{`,
  'position:fixed;top:0;left:0;right:0;',
  `height:${TITLEBAR_HEIGHT}px;z-index:2147483647;`,
  '-webkit-app-region:drag;display:flex;align-items:stretch;justify-content:flex-end;',
  '}',
  `#${CLOSE_ID}{`,
  'position:absolute;top:0;right:0;',
  `width:${CLOSE_WIDTH}px;height:${CLOSE_HEIGHT}px;`,
  '-webkit-app-region:no-drag;border:0;padding:0;',
  'background:transparent;color:#9aa0a6;font-size:15px;line-height:1;',
  'cursor:pointer;appearance:none;-webkit-appearance:none;',
  '}',
  `#${CLOSE_ID}:hover{background:#e81123;color:#fff;}`
].join('');

function inject() {
  if (document.getElementById(TITLEBAR_ID)) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = TITLEBAR_ID;

  const close = document.createElement('button');
  close.id = CLOSE_ID;
  close.type = 'button';
  close.title = 'Close';
  close.setAttribute('aria-label', 'Close window');
  close.textContent = '\u2715';
  close.addEventListener('click', () => ipcRenderer.send(CLOSE_CHANNEL));

  bar.appendChild(close);
  document.body.appendChild(bar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject, { once: true });
} else {
  inject();
}
