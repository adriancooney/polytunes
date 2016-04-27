class Playlist {
    constructor(name) {
        this.name = name;
        this.tracks = [];
    }

    addTrack(track) {
        this.tracks.push(track);
    }

    addTracks(tracks) {
        tracks.forEach(track => this.addTrack.bind(this, track));
    }

    getTracks() {
        return this.tracks;
    }
}

module.exports = Playlist;