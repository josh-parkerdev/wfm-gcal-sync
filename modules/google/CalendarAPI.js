const fs = require('fs');
const jsonfile = require('jsonfile')
const readline = require('readline');
const {google} = require('googleapis');

const Calendar = require('../Calendar')

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

class CalendarAPI {

  constructor() {
    this.api = google
  }

  insertEvent(event, id) {
    this.calendar.events.insert({
      auth: this.auth,
      calendarId: id || 'primary',
      resource: event,
    }, (err, event) => {
      if (err) return console.error('There was an error contacting the Calendar service: ' + err);
      
      // Alert that a new event has been added
    });
  }

  getEvents(timeMin, timeMax) {
    if (!timeMin) return console.error("Function getEvents is missing perameter 'timeMin'")
    if (!timeMax) timeMax = timeMin
    return new Promise((resolve, reject) => {
      this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        maxResults: 25,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) reject('The API returned an error:', err);
        resolve(res.data.items)
      })
    })
  }

  getCalendarList() {
    return new Promise((resolve, reject) => {
      this.calendar.calendarList.list()
      .then(result => resolve(result.data.items))
      .catch(error => reject(error))
    })
  }
  
  async auth() {
    return new Promise((resolve, reject) => {
      // Load client secrets from a local file.
      jsonfile.readFile('credentials.json')
      .then(credentials => authorize(credentials, (auth) => {
        this.auth = auth;
        //this.calendar = google.calendar({version: 'v3', auth})
        resolve(this)
      }))
      .catch(err => reject(err))
    })
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 * @returns {function} callback
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

module.exports = CalendarAPI