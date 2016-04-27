const path = require("path");

const Importer = require("../src/Importer");
const SpotifyLibrary = require("../src/drivers/Spotify");
const AppleLibrary = require("../src/drivers/Apple");

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const EXAMPLE_APPLE_LIBRARY = path.join(__dirname, "data/Library.xml");

describe("Importer", () => {
    describe("#import", function() {
        this.timeout(0);

        it("should import on library to another", () => {
            return Promise.all([
                AppleLibrary.importFromFile(EXAMPLE_APPLE_LIBRARY),
                SpotifyLibrary.fromCredentials({
                    clientId: SPOTIFY_CLIENT_ID, 
                    clientSecret: SPOTIFY_CLIENT_SECRET, 
                    refreshToken: SPOTIFY_REFRESH_TOKEN
                })
            ]).then(([apple, spotify]) => {
                const importer = new Importer(apple, spotify);

                return importer.importPlaylist(apple.getPlaylist("House"));
            })
        });
    });
});