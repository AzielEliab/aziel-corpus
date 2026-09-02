# Public Mirror Deployment
## 1. Keep the master private
Run the normal launcher. The master is the only writable corpus.## 2. Publish a snapshot

From the master UI choose **Publish Mirror**, or run:

    python -m aziel_library.cli --vault /path/to/master publish-mirror /srv/aziel-mirror

Use `--copy-mode hardlink` only when master and mirror live on the same trusted filesystem. Normal `copy` mode is safer for moving the mirror to another server.
## 3. Start the public mirror

Windows:

    START_PUBLIC_MIRROR_WINDOWS.bat D:\path\to\aziel_public_mirror

macOS/Linux:

    ./START_PUBLIC_MIRROR_MAC_LINUX.sh /srv/aziel-mirror

Or directly:

    python -m aziel_library.webapp --mode mirror --vault /srv/aziel-mirror --host 0.0.0.0 --port 8765 --no-browser
## 4. Put the domain in front of it

Use a production reverse proxy/TLS terminator (for example Caddy, nginx, Apache, or your hosting platform) and proxy the domain to the local Aziel mirror port. Do not expose the master process.
## 5. Refresh

Publishing again to the same mirror directory is incremental for immutable payloads. New objects land first; the new SQLite snapshot is swapped in last. The running mirror opens a new read-only SQLite connection for each request, so subsequent requests see the refreshed snapshot without giving visitors write access.
## Security boundary
Mirror mode rejects all POST mutation endpoints and opens the primary/gazetteer/historical SQLite stores read-only. It is intended for public research browsing, search, maps, verification, published exports, and preserved-original downloads.
