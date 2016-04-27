const debug = require("debug")("library:importer")
const Library = require("./library/Library");

const THROTTLE = 250;

class Importer {
    constructor(from, target) {
        this.from = from;
        this.target = target;

        this.stats = {
            imported: 0,
            unmatched: []
        };
    }

    import(playlists) {
        debug("Import %s library to %s.", this.from.getVendorName(), this.target.getVendorName());
        return playlists.reduce((acc, playlist) => {
            return acc.then(this.importPlaylist.bind(this, playlist));
        }, Promise.resolve());
    }

    importPlaylist(playlist) {
        debug("Importing playlist '%s' to %s library (%d tracks).", playlist.name, this.target.getVendorName(), playlist.tracks.length);

        let targetPlaylist = this.target.getPlaylist(playlist);

        if(!targetPlaylist) {
            targetPlaylist = this.target.addPlaylist(playlist);
        } else {
            targetPlaylist = Promise.resolve(targetPlaylist);
        }

        return targetPlaylist.then(targetPlaylist => {
            const tracks = playlist.getTracks();

            // Loop over each track in the playlist
            return tracks.reduce((acc, track) => {
                return acc
                    .then(() => new Promise(resolve => setTimeout(resolve, THROTTLE))) // Throttle a little
                    .then(this.importTrack.bind(this, targetPlaylist, track));
            }, Promise.resolve());
        });
    }

    importTrack(targetPlaylist, track) {
        debug("Importing track '%s' to %s playlist '%s'.", track.name, this.target.getVendorName(), targetPlaylist.name);
        return targetPlaylist.addTrack(track).then(() => {
            this.stats.imported++;
        }).catch(error => {
            if(error instanceof Library.TrackNotFound) {
                debug("No match! Track '%s' by %s not found on import, skipping.", track.name, track.artist);
                this.stats.unmatched.push(track);
            } else return Promise.reject(error);
        })
    }
}

module.exports = Importer;