const debug = require("debug")("library:importer")
const Library = require("./library/Library");
const Playlist = require("./library/Playlist");

const THROTTLE = 250;

class Importer {
    constructor(from, target) {
        this.from = from;
        this.target = target;
    }

    import(library) {
        debug("Import %s library to %s.", this.from.getVendorName(), this.target.getVendorName());
        return this.importPlaylists(library.getPlaylists());
    }

    importPlaylists(playlists) {
        const stats = [];

        return playlists.reduce((acc, playlist) => {
            return acc.then(this.importPlaylist.bind(this, playlist))
                .then(stat => stats.push(stat));
        }, Promise.resolve()).then(() => {
            const totalImportedTracks = stats.reduce((total, stat) => total + stat.importedTracks, 0);
            const totalTracks = stats.reduce((total, stat) => total + stat.totalTracks, 0);
            const playlistCount = playlists.length;

            debug("Imported %d of %d songs to %d playlists.", totalImportedTracks, totalTracks, playlistCount);

            stats.forEach(({ playlist, importedTracks, unmatchedTracks }) => {
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
                            stats.unmatchedTracks.push(track);
                        } else if(error instanceof Playlist.TrackAlreadyExists) {
                            debug("Track '%s' by %s already exists in playlist %s, ignoring.", track.name, track.artist, playlist.name);
                            stats.duplicates++;
                        } else {
                            return Promise.reject(error);
                        }
                    });
            }, Promise.resolve()).then(() => stats);
        });
    }

    importTrack(targetPlaylist, track) {
        debug("Importing track '%s' to %s playlist '%s'.", track.name, this.target.getVendorName(), targetPlaylist.name);
        return targetPlaylist.addTrack(track);
    }
}

module.exports = Importer;