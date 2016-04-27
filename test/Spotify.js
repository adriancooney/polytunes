const SpotifyAPI = require("spotify-web-api-node");
const Track = require("../src/library/Track");
const Playlist = require("../src/library/Playlist");
const SpotifyLibrary = require("../src/drivers/Spotify");

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_ACCESS_TOKEN = process.env.SPOTIFY_ACCESS_TOKEN;
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

var library;
describe("Spotify", () => {
    before(() => {
        var api = new SpotifyAPI({
            clientId: SPOTIFY_CLIENT_ID, 
            clientSecret: SPOTIFY_CLIENT_SECRET, 
            refreshToken: SPOTIFY_REFRESH_TOKEN
        });

        return api.refreshAccessToken()
            .then(data => {
                api.setAccessToken(data.body.access_token);

                return SpotifyLibrary.fromAPI(api)
            }).then(lib => library = lib);
    });

    describe("Library", () => {
        describe("#addTrack", () => {
            it("should add a track to a playlist", () => {
                const track = new Track("Alright", "Kendrick Lamar");
                const playlist = library.playlists[Object.keys(library.playlists)[0]];

                return playlist.addTrack(track);
            });
        });

        describe("#createPlaylist", () => {
            it("should add a track to a playlist", () => {
                const playlist = new Playlist("Hello world!");

                return library.addPlaylist(playlist);
            });
        });
    });

    describe("Playlist", () => {
        describe("#getTracks", () => {
            it("should get tracks for a playlist", () => {
                const playlist = library.playlists[Object.keys(library.playlists)[0]];
                return playlist.getTracks();
            });
        });
    });
});