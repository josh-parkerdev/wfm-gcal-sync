'use strict'

class Calendar {
  constructor(google) {
    this.auth = google.auth
    const auth = google.auth
    this.calendar = google.api.calendar({version: 'v3', auth})
  }

  getAllEvents(id) {
    return new Promise((resolve, reject) => {
      this.calendar.events.list({
        calendarId: id
      })
      .then(result => resolve(result.data.items))
      .catch(error => reject(error))
    })
  }

  getEvents(id, start, end) {
    return new Promise((resolve, reject) => {
      this.calendar.events.list({
        calendarId: id,
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      })
      .then(result => resolve(result.data.items))
      .catch(error => reject(error))
    })
  }

  calendarList() {
    return new Promise((resolve, reject) => {
      this.calendar.calendarList.list()
      .then(result => resolve(result.data.items))
      .catch(error => reject(error))
    })
  }

  // Bug: What if there are multiple calendars with the same name?
  getCalendarByName(name) {
    return new Promise((resolve, reject) => {
      this.calendarList()
      .then(result => {
        const namedCal = result.find(e => e.summary === name)
        if (namedCal) return resolve(namedCal)
        reject(new Error(`Calendar not found with name '${name}'`))
      })
      .catch(err => reject(err))
    })
  }

  insertEvent(event, id) {
    return new Promise((resolve, reject) => {
      this.calendar.events.insert({
        auth: this.calendar.auth,
        calendarId: id,
        resource: event
      })
      .then(newEvent => resolve(newEvent))
      .catch(error => reject(error))
    })
  }

  removeEvent(id, calendarId) {
    return new Promise((resolve, reject) => {
      this.calendar.events.delete({
        calendarId: calendarId,
        eventId: id
      })
      .then(response => resolve(response))
      .catch(error => reject(error))
    })
  }

  patchEvent(resource, eventId, calendarId) {
    return new Promise((resolve, reject) => {
      this.calendar.events.patch({calendarId, eventId, resource})
      .then(updatedEvent => resolve(updatedEvent))
      .catch(error => reject(error))
    })
  }  
}

module.exports = Calendar