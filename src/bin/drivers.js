const _ = require("lodash");
const drivers = require("../vendor");

const SPOTIFY_ENV = {
    clientId: "SPOTIFY_CLIENT_ID",
    clientSecret: "SPOTIFY_CLIENT_SECRET",
    refreshToken: "SPOTIFY_REFRESH_TOKEN"
};

function addCommandOptions(program) {
    program
        .option("--apple-library <path>", "The path to your apple library (override APPLE_LIBRARY env variable).")
        .option("--spotify-client-id <clientId>", "Specify the Spotify client ID (override SPOTIFY_CLIENT_ID).")
        .option("--spotify-client-secret <clientSecret>", "Specify the Spotify client secret (override SPOTIFY_CLIENT_SECRET).")
        .option("--spotify-refresh-token <refreshToken>", "Specify the Spotify client refresh token (override SPOTIFY_REFRESH_TOKEN).");
}

function getLibrary(type, configuration) {
    switch(type) {
        case "spotify":
            return drivers.Spotify.fromCredentials(getSpotifyConfig(configuration));

        case "apple":
            if(!configuration.appleLibrary)
                return Promise.reject(new Error(
                    `Please specify path iTunes library export (xml) with the --apple-library <path> flag.\n` +
                    `To Export your iTunes library, go File > Library > Export Library (as XML).`
                ));

            return drivers.Apple.importFromFile(configuration.appleLibrary);

        default:
            return Promise.reject(new Error(`Unknown driver ${type}.`));
    }
}

function getSpotifyConfig(overrides) {
    return _.merge(pickFromEnv(SPOTIFY_ENV), overrides);
}

function pickFromEnv(vars) {
    return Object.keys(vars).reduce((env, key) => {
        env[key] = process.env[vars[key]];
        return env;
    }, {});
}

module.exports = {
    getLibrary,
    addCommandOptions
};