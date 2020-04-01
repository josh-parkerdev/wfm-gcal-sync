'use strict'

class Day {
  constructor({dateStr, startTime, endTime, schedOid, activities = []}) {
    this.dateStr = dateStr
    this.startTime = startTime
    this.endTime = endTime
    this.schedOid = schedOid
    this.activities = activities
  }
}

module.exports = Day