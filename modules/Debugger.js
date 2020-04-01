module.exports = class Debugger {

static logger(str) {
  console.debug(`[${new Date().toTimeString().slice(0, 8)}] ${str}`);
}

}