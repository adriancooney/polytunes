const fs = require("fs");
const PlistParser = require("plist-parser").PlistParser;
const debug = require("debug")("library:apple");

const Library = require("../library/Library");
const Playlist = require("../library/Playlist");
const Track = require("../library/Track");

class AppleLibrary extends Library {
    getVendorName() {
        return "Apple";
    }

    static importFromFile(path) {
        const library = new AppleLibrary();

        // TODO: Stream!
        return AppleLibrary.parsePlist(path).then(contents => {
            const { Tracks, Playlists } = contents;

            // Grab the tracks and add to the root playlist
            const trackIndex = Object.keys(Tracks).reduce((index, track) => {
                index[track] = AppleTrack.fromItunes(Tracks[track]);
                return index;
            }, {});

            // Grab the playlists
            Playlists.map(playlist => {
                const items = playlist["Playlist Items"];

                if(!items || items.length === 0)
                    return debug("Ignoring playlist: %s (empty)", playlist.Name);

                const applePlaylist = ApplePlaylist.fromItunes(playlist);
                debug("Creating playlist: %s", playlist.Name);

                // Find the track.
                items.forEach(track => {
                    const trackId = track["Track ID"];
                    const selectedTrack = trackIndex[trackId];

                    if(selectedTrack) {
                        debug("Adding track %d to playlist %s", trackId, playlist.Name);
                        // Add the tracks
                        applePlaylist.addTrack(selectedTrack);
                    } else {
                        debug("Unable to locate track from playlist '%s' with ID: %s", playlist.Name, trackId);
                    }
                });

                // Save the playlist
                library.addPlaylist(applePlaylist);
            });

            // Voila, our apple library
            return library;
        });
    }

    static parsePlist(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, "utf8", (err, data) => {
                if(err) return reject(err);

                const parser = new PlistParser(data);

                // Huh, tried like 5 plist parsers and this one worked the best.
                resolve(parser.parse());
            })
        });
    }
}


class ApplePlaylist extends Playlist {
    static fromItunes(data) {
        const playlist = new ApplePlaylist(data.Name);

        if(data.Description)
            playlist.description = data.Description;

        return playlist;
    }
}

class AppleTrack extends Track {
    static fromItunes(data) {
        // Trim all the values
        data = Object.keys(data).reduce((trimmed, key) => {
            const value = data[key];
            trimmed[key] = typeof value === "string" ? value.trim() : value;
            return trimmed;
        }, {});

        return new Track(data.Name, data.Artist, data.Album);
    }
}

module.exports = AppleLibrary;