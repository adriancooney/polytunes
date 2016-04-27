const debug = require("debug")("library:importer")
const EventEmitter = require("events").EventEmitter;
const Library = require("./library/Library");
const Playlist = require("./library/Playlist");

const THROTTLE = 250;

class Importer extends EventEmitter {
    constructor(from, target) {
        super();
        this.from = from;
        this.target = target;
    }

    import() {
        debug("Import %s library to %s.", this.from.getVendorName(), this.target.getVendorName());
        return this.from.getPlaylists().then(this.importPlaylists.bind(this));
    }

    importPlaylists(playlists) {
        const playlistStats = [];

        return playlists.reduce((acc, playlist) => {
            return acc.then(this.importPlaylist.bind(this, playlist))
                .then(stat => playlistStats.push(stat));
        }, Promise.resolve()).then(() => {
            const stats = playlistStats.reduce((total, stat) => {
                total.totalImportedTracks += stat.importedTracks;
                total.totalDuplicates += stat.duplicates;
                total.totalTracks += stat.totalTracks;
                total.totalUnmatched += stat.unmatchedTracks.length;

                return total;
            } , { totalImportedTracks: 0, totalDuplicates: 0, totalTracks: 0, totalUnmatched: 0 });

            stats.playlists = playlistStats;
            stats.playlistCount = playlists.length;
            stats.to = this.target;
            stats.from = this.from;

            debug("Imported %d of %d songs to %d playlists.", stats.totalImportedTracks, stats.totalTracks, stats.playlistCount);

            stats.playlists.forEach(({ playlist, importedTracks, unmatchedTracks }) => {
                debug("    %s playlist (%s) has %d unmatched tracks:", playlist.name, playlist.id, unmatchedTracks.length);

                unmatchedTracks.forEach(track => {
                    debug("    -> %s by %s", track.name, track.artist);
                });
            });

            return stats;
        });
    }

    importPlaylist(playlist) {
        debug("Importing playlist '%s' to %s library (%d tracks).", playlist.name, this.target.getVendorName(), playlist.tracks.length);
        this.emit("playlist:importing", playlist);
        
        let targetPlaylist = this.target.getPlaylist(playlist.name);

        if(!targetPlaylist) {
            targetPlaylist = this.target.addPlaylist(playlist);
        } else {
            targetPlaylist = Promise.resolve(targetPlaylist);
        }

        return targetPlaylist.then(targetPlaylist => {
            // Get all the tracks for this playlist so we don't add duplicated
            return Promise.all([targetPlaylist, targetPlaylist.getTracks()]);
        }).then(([targetPlaylist]) => {
            const tracks = playlist.getTracks();
            const stats = {
                playlist: targetPlaylist,
                importedTracks: 0,
                totalTracks: tracks.length,
                duplicates: 0,
                unmatchedTracks: []
            };

            // Loop over each track in the playlist
            return tracks.reduce((acc, track) => {
                return acc
                    .then(() => new Promise(resolve => setTimeout(resolve, THROTTLE))) // Throttle a little
                    .then(this.importTrack.bind(this, targetPlaylist, track))
                    .then(() => {
                        // Update the matched count
                        stats.importedTracks++;
                    }).catch(error => {
                        // Push an unmatched track
                        if(error instanceof Library.TrackNotFound) {
                            debug("No match! Track '%s' by %s not found on import, skipping.", track.name, track.artist);
                            this.emit("playlist:nomatch", targetPlaylist, track);
                            stats.unmatchedTracks.push(track);
                        } else if(error instanceof Playlist.TrackAlreadyExists) {
                            debug("Track '%s' by %s already exists in playlist %s, ignoring.", track.name, track.artist, playlist.name);
                            this.emit("playlist:duplicate", targetPlaylist, track);
                            stats.duplicates++;
                        } else {
                            return Promise.reject(error);
                        }
                    });
            }, Promise.resolve()).then(() => {
                this.emit("playlist:imported", targetPlaylist, stats);

                return stats;
            });
        });
    }

    importTrack(targetPlaylist, track) {
        debug("Importing track '%s' to %s playlist '%s'.", track.name, this.target.getVendorName(), targetPlaylist.name);
        return targetPlaylist.addTrack(track).then(this.emit.bind(this, "track:imported", targetPlaylist, track));
    }
}

module.exports = Importer;