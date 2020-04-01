const request = require('request');
const request_debug = require('request-debug');
const cookieStore = require('tough-cookie-file-store');

const DEBUG = false;

const wait = ms => new Promise((r, j)=>setTimeout(r, ms))

let authAttempts = 0;

class WebClient {
  constructor(credentials = {user: '', pass: ''}) {
    this.credentials = credentials

    if (DEBUG) {
      request_debug(request, (type, data) => {
        console.log(data)
      })
    }

    const j = request.jar(new cookieStore('./session.json'))
    this.request = request.defaults({
      jar: j,
      followAllRedirects: true
    })
  }

  authenticate() {
    return new Promise((resolve, reject) =>
    this.sendRequest({
      url: 'https://wfm.clearlink.com/agent/signin.do',
      method: 'post',
      form: {
        'realmId': 'customer1',
        'userName': this.credentials.user,
        'password': this.credentials.pass,
        'logonSubmit': 'Login'
      }
    })
    .then(res => {
      return resolve(res)
    })
    .catch(err => {
      if (err.code == 'authFailure') {
        console.error('Authentication failure')

        if (authAttempts++ >= 3) {
          let error = new Error('Log in attempts exceeded')
          error.code = 'authLimitExceeded'
          return reject(error)
        }

        console.warn('Retrying in 60 seconds...')
        wait(60000)
        .then(() => this.authenticate())
        
      } else {
        return reject(err)
      }
    })
    )
  }

  sendRequest(options) {
    Object.assign(options, {
      secureProtocol: 'TLSv1_method'
    })
    return new Promise((resolve, reject) =>
    this.request(options, (err, res) => {
      if (err) {
        //console.error('System error:', err.code)
        reject(err)

      } else if (res == null) {
        let error = new Error('No response from server')
        error.code = 'nullResponse'
        reject(error)

      } else if (res.statusCode >= 404 && res.statusCode < 500) {
        let error = new Error('4xx Client Error')
        error.code = 'clientError'
        reject(error, res)
        
      } else if (res.body == null) {
        let error = new Error('Empty body returned from server')
        error.code = 'nullBody'
        reject(error, res)

      } else if (res.body.includes('Unknown cause of TV service exception')) {
        let error = new Error('Authentication failure')
        error.code = 'authFailure'
        reject(error, res)

      } else if (res.body.includes('error.invalidUser')) {
        let error = new Error('Invalid user')
        error.code = 'invalidUser'
        console.warn(error)

        this.authenticate()
        .then(res => {
          console.log('Authenticated')

          // Try the request again with session token in cookie jar
          this.sendRequest(options)
          .then(res => resolve(res))
          .catch(err => reject(err))
          
        })
        .catch(err => {
          // Authentication attempts exceeeded. Terminating
          console.error('Fatal error: Log in attempts exceeded')
        })

      } else {
        resolve(res)
      }
    }))
  }
}

module.exports = WebClient