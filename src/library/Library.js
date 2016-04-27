class Library {
    constructor() {
        this.playlists = {};
    }

    addPlaylist(playlist) {
        return this.playlists[playlist.name] = playlist;
    }

    getPlaylist(name) {
        return this.playlists[name];
    }

    getPlaylists() {
        return Object.keys(this.playlists).map(key => this.playlists[key]);
    }
}

class TrackNotFound extends Error {
    constructor(track, vendor) {
        super(`Track '${track.name}' by '${track.artist}' could not be found on ${vendor}.`);
        this.track = track;
    }
}

module.exports = Library;
module.exports.TrackNotFound = TrackNotFound;