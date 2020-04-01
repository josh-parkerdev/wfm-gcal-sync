'use strict'

class Agent {
  constructor(data) {
    this.oid = data[0]
    this.id = data[1]
    this.name = data[2]
    this.schedule = []
  }

  setSchedule(schedule) {
    this.schedule = schedule
    return schedule
  }
}

module.exports = Agent