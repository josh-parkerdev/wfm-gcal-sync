'use strict'

const md5 = require('md5')

class Activity {
  constructor(data, day, activity) {
    this.summary = ""
    this.location = ""
    this.description = ""
    this.start = {
      dateTime: null,
      timeZone: "America/Denver"
    }
    this.end = {
      dateTime: null,
      timeZone: "America/Denver"
    }
    this.reminders = {
      useDefault: true
    }
    Object.assign(this, data)

    if (!day) throw new Error("Class instantiation error - Event: day cannot be null")

    const start = activity ? activity.start : day.start
    const end = activity ? activity.end : day.end

    const dateString = day.dateStr.substr(0, 15)
    this.start.dateTime = new Date(`${dateString} ${start}`).toISOString()
    this.end.dateTime = new Date(`${dateString} ${end}`).toISOString()
    if (!this.start.dateTime || !this.end.dateTime) throw new Error("Class instantiation error - Event: Expected start and end date string")
    
    // Create our own ID we can use for the database
    this.id = md5(this.summary + this.start.dateTime + this.end.dateTime)
  }

  static toHash(summary, start, end) {
    return md5(summary + start + end)
  }
}

module.exports = Activity