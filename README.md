# Ntfy Sender – Chataigne Module

A HTTP-based module for [Chataigne](https://github.com/benkuper/Chataigne) that sends **notifications and files** to an [ntfy](https://ntfy.sh/) server.

The module is designed to be **robust and compatible** with Chataigne’s HTTP API and works with both **ntfy.sh** and **self-hosted ntfy servers**.

---

## Features

- Send **text notifications** to any ntfy topic
- Send **local files** (images, PDFs, logs, etc.) to a topic
- Authentication via **Access Token** (`Authorization: Bearer <token>`)
- Supports most ntfy features via HTTP headers:
  - `Title`
  - `Priority`
  - `Tags`
  - `Click` (URL)
  - `Delay`
  - `Email`
  - Arbitrary **Custom Headers**
- Optional **Default Topic**
- Designed to work reliably with Chataigne’s HTTP module

---

## How file uploads work

Files are uploaded using **multipart/form-data** via Chataigne’s `local.uploadFile()` API.

This approach is:
- stable across Chataigne versions
- compatible with all file types
- safe for binary data

> The module intentionally uses multipart uploads instead of raw-body uploads
> to avoid corrupted files in Chataigne builds that do not fully support
> binary PUT requests.

---

## Image preview behavior (important)

Whether an uploaded image is shown as an **inline preview** depends on:

- the ntfy client (Web UI, mobile app, OS notification)
- ntfy server configuration
- the client’s handling of multipart uploads

Some ntfy clients display images uploaded via multipart **as attachments only**,
even if the file is a valid image (e.g. JPG or PNG).

This is expected behavior and **not a bug in this module**.

### Recommended workflow for captions & previews

If you want:
- a caption
- additional context
- or more consistent preview behavior

send a **Send Message** command immediately after **Send File**
to the same topic.

This mirrors ntfy’s recommended usage pattern and works reliably across clients.

---

## Installation

1. Clone or download this repository.
2. Copy the module folder (containing `module.json` and `ntfySender.js`) into Chataigne’s **modules folder**:
   - In Chataigne: `File → Open modules folder`
3. Reload the modules:
   - `File → Reload custom modules`  
     *(or restart Chataigne)*
4. Add the module:
   - Category: **Network**
   - Module: **Ntfy Sender**

---

## Module Parameters

- **Access Token**  
  ntfy access token used for authentication (`Authorization: Bearer <token>`).  
  Leave empty if your server or topic does not require authentication.

- **Default Topic**  
  Optional default topic name.
  - Used if a command’s `Topic` parameter is empty
  - If both are empty, the command is aborted and a warning is logged

- **sendXAccessToken** *(optional)*  
  Sends the token additionally as `X-Access-Token`  
  (useful for certain reverse proxies).

- **sendPreviewMessage** *(optional)*  
  If enabled, the module may send an additional message referencing the uploaded
  file (depending on implementation).

- **debug** *(optional)*  
  Enables verbose logging of requests and responses.

---

## Base Address

You can override the base address in the module settings.

- Default: `https://ntfy.sh/`


---

## Commands

### Send Message

Sends a text notification to a topic.

**Callback:** `sendMessage`

Parameters:
- `Topic` – topic name (or empty → uses Default Topic)
- `Message` – notification body text
- `Title` – optional title
- `Priority` – ntfy priority (1–5 or `min`, `low`, `default`, `high`, `max`)
- `Tags` – optional tags (comma-separated)
- `Click URL` – optional URL opened on click
- `Delay` – optional delay or schedule (e.g. `10m`)
- `Email` – optional email forwarding
- `Custom Headers` – additional raw headers (one per line)

---

### Send File

Uploads a local file to a topic.

**Callback:** `sendFile`

Parameters:
- `Topic` – topic name (or empty → uses Default Topic)
- `File Path` – local file path (file picker in Chataigne)
- `Title`, `Priority`, `Tags`, `Click URL`, `Delay`, `Email`, `Custom Headers`  
Same as **Send Message**

Files are uploaded using multipart/form-data for maximum compatibility.

---

## Debugging

All activity is logged using `script.log`:

- Command execution
- Request headers
- ntfy server responses

If something does not work as expected, check:

- Access Token
- Topic / Default Topic
- Base Address
- Network connectivity
- ntfy server permissions

Enable the `debug` parameter for more detailed logs.

---

## License

This module is a convenience wrapper around ntfy’s HTTP API for use with Chataigne.

It is not affiliated with or endorsed by the ntfy project.
