const debug = require("debug")("library:playlist");

class Playlist {
    constructor(name) {
        this.name = name;
        this.tracks = [];
    }

    addTrack(track) {
        this.tracks.push(track);
    }

    addTracks(tracks) {
        tracks.forEach(this.addTrack.bind(this));
    }

    getTracks() {
        return this.tracks;
    }
}

class TrackAlreadyExists extends Error {
    constructor(track, playlist) {
        super(`Track '${track.name}' by ${track.artist} already exists in playlist ${playlist.name}.`);
        this.track = track;
        this.playlist = playlist;
    }
}

module.exports = Playlist;
module.exports.TrackAlreadyExists = TrackAlreadyExists;