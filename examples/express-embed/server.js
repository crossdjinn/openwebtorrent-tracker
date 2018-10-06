#!/usr/bin/env node

var DHT = require('bittorrent-dht')
var Server = require('../..').Server
var express = require('express')
var app = express()

var createTorrent = require('create-torrent')
var fs = require('fs')

var demo = fs.readFile('./test.mp4', 'utf8', function (err, data) {
  if (err) throw err
  return data
})

var announceListData = [
  'http://35.204.224.194:2988/announce',
  'http://35.204.224.194:2988',
  'udp://35.204.224.194:2988/announce',
  'udp://35.204.224.194:2988',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.internetwarriors.net:1337',
  'udp://tracker.leechers-paradise.org:6969',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://exodus.desync.com:6969',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.fastcast.nz'
]

var createTorrentOptions = {
  private: false,
  announceList: announceListData
}

createTorrent('./', createTorrentOptions, function (err) {
  if (!err) {
    // `torrent` is a Buffer with the contents of the new .torrent file
    fs.writeFile('sintel.torrent', demo)
  }
})

// https://wiki.theory.org/BitTorrentSpecification#peer_id

var server = new Server({
  http: true, // we do our own
  udp: true, // not interested
  ws: true, // not interested
  stats: true, // enable web-based statistics? [default=true]
  filter: function (infoHash, params, cb) {
    // Blacklist/whitelist function for allowing/disallowing torrents. If this option is
    // omitted, all torrents are allowed. It is possible to interface with a database or
    // external system before deciding to allow/deny, because this function is async.

    // It is possible to block by peer id (whitelisting torrent clients) or by secret
    // key (private trackers). Full access to the original HTTP/UDP request parameters
    // are available in `params`.

    // This example only allows one torrent.

    var allowed = true
    if (allowed) {
      // If the callback is passed `null`, the torrent will be allowed.
      cb(null)
    } else {
      // If the callback is passed an `Error` object, the torrent will be disallowed
      // and the error's `message` property will be given as the reason.
      cb(new Error('disallowed torrent'))
    }
  }
})

var onHttpRequest = server.onHttpRequest.bind(server)
app.get('/announce', onHttpRequest)
app.get('/scrape', onHttpRequest)

server.on('error', function (err) {
  // fatal server error!
  console.log(err.message)
})

server.on('warning', function (err) {
  // client sent bad data. probably not a problem, just a buggy client.
  console.log(err.message)
})

// start tracker server listening! Use 0 to listen on a random free port.
server.listen(29888, '0.0.0.0')

// listen for individual tracker messages from peers:
server.on('start', function (addr) {
  console.log('got start message from ' + addr)
})

server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})

app.listen(29888)

var dht = new DHT()

dht.listen(6881, function () {
  console.log('dht listen  0.0.0.0:6881')
})

dht.on('peer', function (peer, infoHash, from) {
  console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
})
