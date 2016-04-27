const SpotifyAPI = require("spotify-web-api-node");
const debug = require("debug")("library:spotify");
const _ = require("lodash");

const Library = require("../library/Library");
const Playlist = require("../library/Playlist");
const Track = require("../library/Track");

const VENDOR_NAME = "Spotify";
const PAGE_SIZE = 100; // Playlist track page size

class SpotifyLibrary extends Library {
    constructor(api) {
        super();
        this.api = api;
    }

    getVendorName() {
        return VENDOR_NAME;
    }

    addPlaylist(playlist, options = { public: false }) {
        if(playlist instanceof SpotifyPlaylist)
            return super.addPlaylist(playlist);

        debug("Creating new playlist on Spotify: %s", playlist.name);
        return this.api.createPlaylist(this.api.user.id, playlist.name, options).then(data => {
            return super.addPlaylist(SpotifyPlaylist.fromAPI(data.body, this.api));
        });
    }

    static fromCredentials(credentials) {
        return SpotifyLibrary.fromAPI(new SpotifyAPI(credentials));
    }

    static fromAPI(api) {
        return api.refreshAccessToken().then(data => {
            // Ensure we have a fresh access token
            api.setAccessToken(data.body.access_token);

            return api.getMe();
        }).then(data => {
            // Set the user details on the API object
            api.user = data.body;

            return api.getUserPlaylists(api.user.id);
        }).then(data => {
            const library = new SpotifyLibrary(api);

            // Get all the playlists
            data.body.items.forEach(playlist => {
                library.addPlaylist(SpotifyPlaylist.fromAPI(playlist, api));
            });

            return library;
        })
    }
}

class SpotifyPlaylist extends Playlist {
    constructor(name, id, api) {
        super(name);
        this.id = id;
        this.api = api;
    }

    addTrack(track, force = false) {
        // If it's already a spotify track, don't bother
        // searching for the ID.
        if(track instanceof SpotifyTrack) {
            return super.addTrack(track)
        }

        // Find the track in spotify's database
        debug("Searching for track '%s' by %s.", track.name, track.artist);
        return this.api.searchTracks(`artist:${track.artist} track:${track.name}`).then(data => {
            const tracks = data.body.tracks.items;

            // Not match!
            if(!tracks.length)
                return Promise.reject(new Library.TrackNotFound(track, VENDOR_NAME));

            // Pick the first result as the track. Any reason for this? Let's hope
            // spotify has some common sense and returns the tracks in order or
            // relevance.
            const targetTrack = SpotifyTrack.fromAPI(tracks[0]);

            // Add the track if it's not already in the playlist (or if force is toggled)
            if(force || !this.hasTrack(targetTrack)) {
                // We have our spotify track, now add it the user's library
                // It's a real shame we have to have the username to create
                // a spotify playlist. Like, why?
                debug("Adding track '%s' to playlist %s (%s)", targetTrack.name, this.name, this.id);
                return this.api.addTracksToPlaylist(this.api.user.id, this.id, [targetTrack.uri]).then(() => {
                    // Add it to the playlist
                    super.addTrack(targetTrack);
                });
            } else {
                // Fail because track already exists
                return Promise.reject(new Playlist.TrackAlreadyExists(targetTrack, this));
            }
        });
    }

    getTracks() {
        debug("Getting tracks for %s playlist (%s).", this.name, this.id);
        // Get the tracks the first time and get the total
        return this.getTracksPaged().then(data => {
            const total = data.body.total;

            debug("Playlist %s has %d tracks (%d pages)", this.name, total, Math.ceil(total/PAGE_SIZE));

            // Merge the first tracks
            var tracks = data.body.items.map(item => SpotifyTrack.fromAPI(item.track));
            var cursor = data.body.items.length;

            return (function page() {
                if(cursor < total) {
                    return this.getTracksPaged(PAGE_SIZE, cursor).then(data => {
                        // Update the cursor
                        cursor += data.body.items.length;

                        // Push the SpotifyTracks
                        tracks = tracks.concat(data.body.items.map(item => SpotifyTrack.fromAPI(item.track)));
                    }).then(page.bind(this));
                } else {
                    debug("Got %d of %d tracks for %s playlist (%s).", cursor, total, this.name, this.id);

                    // Save the tracks
                    this.addTracks(tracks);

                    // Debug print some
                    tracks.slice(18).forEach(track => {
                        debug(" -> '%s' by %s (%s)", track.name, track.artist, track.id);
                    });

                    if(tracks.length > 18)
                        debug(" -> %d more..", tracks.length - 18);

                    // Resolve the tracks
                    return Promise.resolve(tracks);
                }
            }.bind(this))();
        });
    }

    getTracksPaged(limit = PAGE_SIZE, offset = 0) {
        debug("Getting tracks from %s playlist (%s) with limit = %d, offset = %d.", this.name, this.id, limit, offset);
        return this.api.getPlaylistTracks(this.api.user.id, this.id, { limit, offset });
    }

    hasTrack(track) {
        if(!(track instanceof SpotifyTrack))
            throw new Error("SpotifyPlaylist#hasTrack can only test if SpotifyTracks are in the playlist.");

        debug("Testing if %s playlist (%s) has track '%s' by %s (%s)", this.name, this.id, this.tracks.length, track.name, track.artist, track.id);
        return this.tracks.find(tr => {
            return track.id === tr.id
        });
    }

    static fromAPI(data, api) {
        // { collaborative: false,
        //        external_urls: [Object],
        //        href: 'https://api.spotify.com/v1/users/adriancooney/playlists/3svlOvf9y6dsHt3x6ijZ2q',
        //        id: '3svlOvf9y6dsHt3x6ijZ2q',
        //        images: [Object],
        //        name: 'Groovers',
        //        owner: [Object],
        //        public: true,
        //        snapshot_id: 'ukqRUSOZdf7jhhD7pT9i4Kv5jRWY03gw9JXvcJX0OVuXeryMddwOsQfwU6lbtyEz',
        //        tracks: [Object],
        //        type: 'playlist',
        //        uri: 'spotify:user:adriancooney:playlist:3svlOvf9y6dsHt3x6ijZ2q' }
    
        const playlist = new SpotifyPlaylist(data.name, data.id, api);      
        
        // Add the fields
        _.without(Object.keys(data), "tracks", "id", "name")
            .forEach(key => playlist[key] = data[key]);

        return playlist;
    }

    toString() {
        const flags = [this.id];

        if(this.public) flags.push("public");
        if(this.collaborative) flags.push("collaborative");

        return `${this.name} created by ${this.owner.id}. (${flags.join(", ")})`;
    }
}

class SpotifyTrack extends Track {
    static fromAPI(data) {
        const track = new SpotifyTrack();

        // Literally everything returned from the spotify API suits
        // the style:
        //    { album:
        //       { album_type: 'album',
        //         available_markets: [Object],
        //         external_urls: [Object],
        //         href: 'https://api.spotify.com/v1/albums/7ycBtnsMtyVbbwTfJwRjSP',
        //         id: '7ycBtnsMtyVbbwTfJwRjSP',
        //         images: [Object],
        //         name: 'To Pimp A Butterfly',
        //         type: 'album',
        //         uri: 'spotify:album:7ycBtnsMtyVbbwTfJwRjSP' },
        //      artists: 
        //       [ [ { external_urls: [Object],
        //          href: 'https://api.spotify.com/v1/artists/2YZyLoL8N0Wb9xBt1NhZWg',
        //          id: '2YZyLoL8N0Wb9xBt1NhZWg',
        //          name: 'Kendrick Lamar',
        //          type: 'artist',
        //          uri: 'spotify:artist:2YZyLoL8N0Wb9xBt1NhZWg' } ], ],
        //      available_markets: [ 'CA', 'MX', 'US' ],
        //      disc_number: 1,
        //      duration_ms: 219333,
        //      explicit: true,
        //      external_ids: { isrc: 'USUM71502498' },
        //      external_urls: { spotify: 'https://open.spotify.com/track/3iVcZ5G6tvkXZkZKlMpIUs' },
        //      href: 'https://api.spotify.com/v1/tracks/3iVcZ5G6tvkXZkZKlMpIUs',
        //      id: '3iVcZ5G6tvkXZkZKlMpIUs',
        //      name: 'Alright',
        //      popularity: 77,
        //      preview_url: 'https://p.scdn.co/mp3-preview/8e5d16461e73339eec796b5b7a2d72297154bafd',
        //      track_number: 7,
        //      type: 'track',
        //      uri: 'spotify:track:3iVcZ5G6tvkXZkZKlMpIUs' }

        Object.keys(data).forEach(key => track[key] = data[key]);

        return track;
    }

    get artist() {
        return this._artist || this.artists.map(artist => artist.name).join(" & ");
    }

    set artist(value) {
        this._artist = value;
    }
}

module.exports = SpotifyLibrary;