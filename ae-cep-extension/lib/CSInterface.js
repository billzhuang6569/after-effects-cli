(function () {
  if (typeof window.CSInterface === "function") {
    return;
  }
  function CSInterface() {}
  CSInterface.prototype.evalScript = function (script, callback) {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.evalScript === "function") {
      window.__adobe_cep__.evalScript(script, callback);
      return;
    }
    if (typeof callback === "function") {
      callback('{"status":"error","error":{"message":"CEP runtime unavailable"}}');
    }
  };
  window.CSInterface = CSInterface;
})();
