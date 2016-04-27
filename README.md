# Polytunes
Polytunes is a tool that allows you to liberate your music from third party services by enabling you to freely move your music from services.

### Support
The following services are support by polytunes.

| Service | Import From | Import To |
|---------|-------------|-----------|
| Apple Music | :white_check_mark: | |
| Spotify | :white_check_mark: | :white_check_mark: |

### Usage
Polytunes is a command line tool (and has an API available):

    $ npm install polytunes

To move from Apple Music to Spotify:

    $ polytunes --from apple --to spotify
    [*] Collecting libraries..
    [*] Importing from your Apple library to your Spotify library.
    [*] Importing Apple playlist: 'Music'
      -> Track 'Sometimes I Feel So Deserted' by The Chemical Brothers imported to Spotify Library.
      -> Track 'The Hills' by The Weeknd imported to Spotify Library.
      -> Track 'Dip' by Danny Brown imported to Spotify Library.
      -! No match for track on 'Drive Me Crazy (feat. Vic Mensa)' by KAYTRANADA from Apple Library playlist on Spotify.

The above command requires you to configure the *drivers* to talk to the services, see [Configuring Drivers](https://github.com/adriancooney/polytunes/wiki/Drivers).

