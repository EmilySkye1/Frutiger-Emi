/*
 * mediaplayer.js
 *
 * The Media Player window's content (both playlist embeds + their
 * "Open in Spotify" links) is static markup in index.html since Spotify's
 * embed iframe handles all the actual playback UI. This file is kept as
 * the hook for the window in case you want to add more later (a queue,
 * a custom "now playing" strip, swapping in a third playlist, etc.) --
 * OS.registerFirstOpen('mediaplayer-window', fn) is where that would go.
 */
