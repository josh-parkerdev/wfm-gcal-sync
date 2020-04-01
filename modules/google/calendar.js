const {getAuthToken} = require('./gapi')

class Calendar {
  constructor() {
    this._token = undefined;
  }

  insertEvent(event, id) {
    
  }
}

function auth(callback) {
  getAuthToken((err, token) => {
      if (err) return console.error(err)
      this._token = token

      callback(null, token)
    })
}

module.exports = Calendar
