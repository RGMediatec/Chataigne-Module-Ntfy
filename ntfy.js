// *******************
// Universal Getter
// *******************
function readParamValue(p)
{
  if (!p) return null;

  if (typeof p.get === "function") return p.get();
  if (typeof p.getValue === "function") return p.getValue();
  if (typeof p.getString === "function") return p.getString();
  if (typeof p.getBool === "function") return p.getBool();
  if (typeof p.getInt === "function") return p.getInt();
  if (typeof p.getFloat === "function") return p.getFloat();

  if (p.value !== undefined && p.value !== null)
  {
    if (typeof p.value.get === "function") return p.value.get();
    return p.value;
  }

  return null;
}

// *******************
// Logging helpers
// *******************
function logInfo(msg) { script.log("[Ntfy Sender] " + msg); }

function isDebugEnabled()
{
  var p = local.parameters.getChild("debug");
  var v = readParamValue(p);
  return !!v;
}

function logDebug(msg)
{
  if (isDebugEnabled()) logInfo(msg);
}

function startsWith(s, prefix)
{
  s = toStr(s);
  prefix = toStr(prefix);
  if (prefix.length > s.length) return false;
  for (var i = 0; i < prefix.length; i++)
  {
    if (s[i] !== prefix[i]) return false;
  }
  return true;
}

function redactAuth(headers)
{
  if (!headers) return "";
  var lines = ("" + headers).split("\n");
  for (var i = 0; i < lines.length; i++)
  {
    if (startsWith(lines[i], "Authorization:")) lines[i] = "Authorization: [redacted]";
    if (startsWith(lines[i], "X-Access-Token:")) lines[i] = "X-Access-Token: [redacted]";
  }
  return lines.join("\n");
}

// *******************
// String helpers
// *******************
function toStr(v)
{
  if (v === null || v === undefined) return "";
  return "" + v;
}

function trimBasic(s)
{
  s = toStr(s);
  while (s.length > 0)
  {
    var c0 = s[0];
    if (c0 === " " || c0 === "\t" || c0 === "\n" || c0 === "\r") s = s.substring(1);
    else break;
  }
  while (s.length > 0)
  {
    var c1 = s[s.length - 1];
    if (c1 === " " || c1 === "\t" || c1 === "\n" || c1 === "\r") s = s.substring(0, s.length - 1);
    else break;
  }
  return s;
}

function getBoolParam(name, fallback)
{
  var p = local.parameters.getChild(name);
  if (!p) return !!fallback;
  return !!readParamValue(p);
}

function lastIndexChar(s, ch)
{
  s = toStr(s);
  for (var i = s.length - 1; i >= 0; i--)
  {
    if (s[i] === ch) return i;
  }
  return -1;
}

function lowerASCII(s)
{
  s = toStr(s);
  var out = "";
  for (var i = 0; i < s.length; i++)
  {
    var c = s.charCodeAt(i);
    if (c >= 65 && c <= 90) out += String.fromCharCode(c + 32);
    else out += s[i];
  }
  return out;
}

function basename(path)
{
  path = toStr(path);
  if (!path) return "file";

  var parts = path.split("\\").join("/").split("/");
  if (parts.length === 0) return path;
  return parts[parts.length - 1];
}

function extensionLower(filePath)
{
  var name = basename(filePath);
  var parts = name.split(".");
  if (parts.length < 2) return "";

  var ext = parts[parts.length - 1];
  return lowerASCII(ext);
}

function guessMimeType(filePath)
{
  var ext = extensionLower(filePath);

  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "bmp") return "image/bmp";
  if (ext === "svg") return "image/svg+xml";

  return "application/octet-stream";
}


// *******************
// Init + events
// *******************
function init()
{
  logInfo("module loaded");

  logDebug("sendPUT exists: " + (typeof local.sendPUT));
}

function moduleParameterChanged(param)
{
  var v = readParamValue(param);
  logDebug("(" + local.name + ") " + param.name + " changed, new value len: " + toStr(v).length);
}

// *******************
// Config + topic helpers
// *******************
function getConfig()
{
  var pToken = local.parameters.getChild("accessToken");
  var pTopic = local.parameters.getChild("defaultTopic");

  if (!pToken) { logInfo("Parameter not found: accessToken"); return null; }
  if (!pTopic) { logInfo("Parameter not found: defaultTopic"); return null; }

  var accessToken = trimBasic(readParamValue(pToken));
  var defaultTopic = trimBasic(readParamValue(pTopic));
  var sendXAccessToken = getBoolParam("sendXAccessToken", true);

  return {
    accessToken: accessToken,
    defaultTopic: defaultTopic,
    sendXAccessToken: sendXAccessToken
  };
}

function normalizeTopicPath(t)
{
  t = trimBasic(t);
  if (!t) return "";
  if (t[0] !== "/") t = "/" + t;
  return t;
}

function resolveTopic(topic, cfg)
{
  var t = trimBasic(topic);
  if (!t) t = cfg.defaultTopic;

  if (!t)
  {
    logInfo("Topic not set (neither command nor defaultTopic)!");
    return null;
  }
  return normalizeTopicPath(t);
}

// *******************
// Header builder (ntfy-compatible)
// *******************
function buildHeadersForPublish(opts)
{
  var headers = [];

  var token = trimBasic(opts.accessToken);

  if (token.length > 0)
  {
    headers.push("Authorization: Bearer " + token);
    if (opts.sendXAccessToken) headers.push("X-Access-Token: " + token);
  }

  if (opts.title) headers.push("Title: " + opts.title);
  if (opts.priority) headers.push("Priority: " + opts.priority);
  if (opts.tags) headers.push("Tags: " + opts.tags);
  if (opts.clickUrl) headers.push("Click: " + opts.clickUrl);
  if (opts.delay) headers.push("Delay: " + opts.delay);
  if (opts.email) headers.push("Email: " + opts.email);

  if (opts.filename) headers.push("X-Filename: " + opts.filename);

  if (opts.contentType) headers.push("Content-Type: " + opts.contentType);

  if (opts.customHeaders) headers.push(opts.customHeaders);

  return headers.join("\n");
}

// *******************
// Commands
// *******************

function sendMessage(topic, message, title, priority, tags, clickUrl, delay, email, customHeaders)
{
  logInfo("sendMessage() called");

  message = toStr(message);
  if (!message) { logInfo("Message is empty, aborting."); return; }

  var cfg = getConfig();
  if (!cfg) return;

  var t = resolveTopic(topic, cfg);
  if (!t) return;

  title = trimBasic(title);
  priority = trimBasic(priority);
  tags = trimBasic(tags);
  clickUrl = trimBasic(clickUrl);
  delay = trimBasic(delay);
  email = trimBasic(email);
  customHeaders = toStr(customHeaders);

  var hdrs = buildHeadersForPublish({
    title: title,
    priority: priority,
    tags: tags,
    clickUrl: clickUrl,
    delay: delay,
    email: email,
    customHeaders: customHeaders,
    accessToken: cfg.accessToken,
    sendXAccessToken: cfg.sendXAccessToken,
    contentType: "text/plain; charset=utf-8",
    filename: ""
  });

  logDebug("Headers (redacted):\n" + redactAuth(hdrs));

  var params = {};
  params.dataType = "text";
  params.extraHeaders = hdrs;
  params.payload = message;

  local.sendPOST(t, params);
}

function sendFile(topic, filePath, title, priority, tags, clickUrl, delay, email, customHeaders)
{
  logInfo("sendFile() called");

  filePath = trimBasic(filePath);

if (filePath.length > 0 && filePath[0] !== "/" && startsWith(filePath, "Users/"))
{
  filePath = "/" + filePath;
}


  filePath = toStr(filePath);
  if (!filePath) { logInfo("File Path is empty, aborting."); return; }

  if (typeof local.sendPUT !== "function")
  {
    logInfo("sendPUT() not available in this Chataigne build. Cannot send raw-body file upload.");
    return;
  }

  var cfg = getConfig();
  if (!cfg) return;

  var t = resolveTopic(topic, cfg);
  if (!t) return;

  title = trimBasic(title);
  priority = trimBasic(priority);
  tags = trimBasic(tags);
  clickUrl = trimBasic(clickUrl);
  delay = trimBasic(delay);
  email = trimBasic(email);
  customHeaders = toStr(customHeaders);

  var fname = basename(filePath);
  var mime = guessMimeType(filePath);

  var hdrs = buildHeadersForPublish({
    title: title,
    priority: priority,
    tags: tags,
    clickUrl: clickUrl,
    delay: delay,
    email: email,
    customHeaders: customHeaders,
    accessToken: cfg.accessToken,
    sendXAccessToken: cfg.sendXAccessToken,
    contentType: mime,
    filename: fname
  });

  logDebug("Uploading file '" + fname + "' contentType='" + mime + "'");
  logDebug("Headers (redacted):\n" + redactAuth(hdrs));
  logInfo("Upload headers:\n" + redactAuth(hdrs));

  var params = {};
  params.dataType = "raw";          
  params.extraHeaders = hdrs;
  
  params.payload = "file";          
  params.file = filePath;
  
  local.sendPUT(t, params);
  
}

// *******************
// Response logging
// *******************
function dataEvent(data, requestURL)
{
  if (isDebugEnabled())
  {
    script.log("[Ntfy Sender] Received response from: " + requestURL + "\n" + data);
  }
  else
  {
    var d = toStr(data);
    if (d.length > 200) d = d.substring(0, 200) + "...";
    script.log("[Ntfy Sender] Response from: " + requestURL + " | " + d);
  }
}
