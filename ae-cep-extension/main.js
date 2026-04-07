(function () {
  var fs = null;
  var os = null;
  var path = null;
  var cs = new CSInterface();
  var BRIDGE_DIR = "";
  var POLL_INTERVAL = 300;
  var processing = false;

  function initRuntime() {
    if (typeof require !== "function") {
      throw new Error("Node.js runtime 未启用，请在 manifest 的 CEFCommandLine 添加 --enable-nodejs 与 --mixed-context");
    }
    fs = require("fs");
    os = require("os");
    path = require("path");
    BRIDGE_DIR = path.join(os.homedir(), "Documents", "AE_Agent_Bridge");
  }

  function setConnection(text, ok) {
    var node = document.getElementById("connection");
    if (!node) return;
    node.textContent = text;
    node.className = "status" + (ok ? " ok" : "");
  }

  function setExecution(text) {
    var node = document.getElementById("execution");
    if (!node) return;
    node.textContent = text;
  }

  function setBridgePath() {
    var node = document.getElementById("bridgePath");
    if (!node) return;
    node.textContent = "Bridge: " + BRIDGE_DIR;
  }

  function ensureBridgeDir() {
    if (!fs.existsSync(BRIDGE_DIR)) {
      fs.mkdirSync(BRIDGE_DIR, { recursive: true });
    }
  }

  function getExtensionPath() {
    if (!window.__adobe_cep__ || typeof window.__adobe_cep__.getSystemPath !== "function") {
      return "";
    }
    var raw = window.__adobe_cep__.getSystemPath("extension");
    if (!raw) return "";
    if (raw.indexOf("file://") === 0) {
      raw = decodeURIComponent(raw.replace("file://", ""));
    }
    return raw;
  }

  function loadHostJsx() {
    var extPath = getExtensionPath();
    if (!extPath) return "";
    var jsxPath = path.join(extPath, "host.jsx").replace(/\\/g, "/");
    var evalExpr = '$.evalFile("' + jsxPath.replace(/"/g, '\\"') + '")';
    cs.evalScript(evalExpr);
    return jsxPath;
  }

  function listCommandFiles() {
    var names = fs.readdirSync(BRIDGE_DIR);
    var files = [];
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      if (name.indexOf("cmd_") !== 0) continue;
      if (name.slice(-5) !== ".json") continue;
      if (name.indexOf(".response") > -1) continue;
      if (name.indexOf(".processing") > -1) continue;
      files.push(name);
    }
    files.sort();
    return files;
  }

  function toJSONString(obj) {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return '{"id":"","status":"error","data":{},"error":{"message":"Serialize failed"}}';
    }
  }

  function writeResponse(originalPath, responseObj) {
    var responsePath = originalPath + ".response";
    fs.writeFileSync(responsePath, toJSONString(responseObj), "utf8");
  }

  function parseResponse(id, raw) {
    if (typeof raw !== "string" || raw === "") {
      return {
        id: id,
        status: "error",
        data: {},
        error: { message: "JSX 返回为空，可能是 host.jsx 未加载或执行表达式未返回值" }
      };
    }
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("invalid");
      if (!parsed.id) parsed.id = id;
      if (!parsed.status) parsed.status = "success";
      if (!parsed.data) parsed.data = {};
      return parsed;
    } catch (e) {
      return {
        id: id,
        status: "error",
        data: {},
        error: { message: "Invalid JSX response: " + String(raw || "") }
      };
    }
  }

  function buildErrorResponse(id, message) {
    return JSON.stringify({
      id: id,
      status: "error",
      data: {},
      error: { message: message }
    });
  }

  function callDispatch(id, action, payload, callback) {
    var payloadJson = JSON.stringify(payload || {});
    var jsxPath = loadHostJsx();
    if (!jsxPath) {
      callback(buildErrorResponse(id, "扩展路径为空，无法加载 host.jsx"));
      return;
    }
    var loadExpr = '$.evalFile("' + jsxPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '");"loaded"';
    cs.evalScript(loadExpr, function () {
      cs.evalScript('typeof AEAgentCore === "object" ? "ready" : "missing"', function (state) {
        if (state !== "ready") {
          callback(buildErrorResponse(id, "AEAgentCore 未就绪"));
          return;
        }
        var dispatchExpr = "AEAgentCore.dispatch(" + JSON.stringify(id) + "," + JSON.stringify(action) + "," + JSON.stringify(payloadJson) + ")";
        cs.evalScript(dispatchExpr, function (raw) {
          if (typeof raw !== "string" || raw === "") {
            callback(buildErrorResponse(id, "dispatch 返回为空"));
            return;
          }
          callback(raw);
        });
      });
    });
  }

  function callJSX(command, done) {
    var id = command.id || "";
    var action = command.action || "";
    var payload = command.payload || {};
    callDispatch(id, action, payload, function (raw) {
      done(parseResponse(id, raw));
    });
  }

  function processOne() {
    if (processing) return;
    processing = true;
    try {
      ensureBridgeDir();
      var files = listCommandFiles();
      if (!files.length) {
        processing = false;
        return;
      }
      var fileName = files[0];
      var fullPath = path.join(BRIDGE_DIR, fileName);
      var processingPath = fullPath + ".processing";
      fs.renameSync(fullPath, processingPath);
      setExecution("执行中: " + fileName);
      var raw = fs.readFileSync(processingPath, "utf8");
      var command = JSON.parse(raw);
      if (!command || typeof command !== "object") throw new Error("Invalid command JSON");
      callJSX(command, function (responseObj) {
        try {
          writeResponse(fullPath, responseObj);
          fs.unlinkSync(processingPath);
          setExecution("完成: " + fileName);
        } catch (e) {
          setExecution("写回失败: " + String(e && e.message ? e.message : e));
        } finally {
          processing = false;
        }
      });
    } catch (e) {
      setExecution("处理失败: " + String(e && e.message ? e.message : e));
      processing = false;
    }
  }

  function start() {
    try {
      initRuntime();
      ensureBridgeDir();
      loadHostJsx();
      setConnection("🟢 Agent Connected", true);
      setBridgePath();
      setInterval(processOne, POLL_INTERVAL);
    } catch (e) {
      setConnection("🔴 初始化失败", false);
      setExecution(String(e && e.message ? e.message : e));
    }
  }

  start();
})();
