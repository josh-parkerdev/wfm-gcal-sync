const IEXClient = require('./modules/web/IEXclient');
const ManagementUnit = require('./modules/nice/Management');
const CalendarAPI = require('./modules/google/CalendarAPI');
const Calendar = require('./modules/Calendar');
const Activity = require('./modules/nice/Activity');

const jsonfile = require('jsonfile');
const { backOff } = require('exponential-backoff');
// const isToday = require('date-fns/isToday')

// Credentials stored in cleartext for testing purposes
const iex = new IEXClient({user: 'USER', pass: 'PASS'});
const gapi = new CalendarAPI();

/* Global Vars */
const QUERY_DATE = new Date()

let iteration = 0;

/* Global Functions */
const debug = str => console.debug(`[${new Date().toTimeString().slice(0, 8)}] ${str}`);

/* Main */
(async () => {
  console.log('Starting')

  let gcal, calendar
  let agent

  let templateModels, googleCalendar, calendarEvents  

  try {
    templateModels = await jsonfile.readFile('./events.json');
    debug('loaded events')

    googleCalendar = await gapi.auth().then(auth => new Calendar(auth))
    
    calendar = await googleCalendar.getCalendarByName('Clearlink')
    debug('got calendar')
    
    calendarEvents = await googleCalendar.getAllEvents(calendar.id)
    .then(events => new Map(events.map(e => [e.id, e])))
    debug('got event ids')

    removedEvents = new Map()

    let site = await iex.getAgents()
    .then(agents => new ManagementUnit('Orem', agents))

    agent = site.getAgentByName('Parker, Joshua')

    let date = QUERY_DATE
    let format = 'weekly'

    async function sync() {
      const activities = new Map()
  
      try {
        await iex.getSchedule({date, format, agent})
        .then(schedule => agent.setSchedule(schedule))
        .catch(err => {
          throw err
        })
  
        // Read from file
        // await jsonfile.readFile('./agent.json')
        // .then(data => agent.setSchedule(data.schedule))

      const days = agent.schedule

      for (let i = 0; i < days.length; i++) {
        const day = days[i];

        // Sync events from google calendar for this day

        

        console.log("")
        console.log("Checking for added events")

        await Promise.all(day.activities.map(activity => {
          const activityName = activity.name

          const eventTemplate = templateModels[activityName] || { summary: activityName.replace(/_/g, ' ') }
          const newActivity = new Activity(eventTemplate, day, activity)
          activities.set(newActivity.id, newActivity)
  
          // Skip synced events
          if (calendarEvents.has(newActivity.id)) return

          // Add back removed items
          if (removedEvents.has(newActivity.id)) {

            log_restoreEvent({
              activityId: newActivity.id,
              calendarId: calendar.id,
            })

            // restoreEvent({
            //   activityId: newActivity.id,
            //   calendarId: calendar.id,
            // })
          } else {

            log_insertEvent({
              activity: newActivity,
              calendarId: calendar.id
            })
            
            // insertEvent({
            //   activity: newActivity,
            //   calendarId: calendar.id
            // })
          }
        }))

        // console.log("")
        // console.log("Checking for removed events")

        // await Promise.all([...calendarEvents.entries()].map(async (entry) => {
        //   let syncedId = entry[0]
        //   let syncedEvent = entry[1]
        //   if (activities.has(syncedId)) return
        //   if (removedEvents.has(syncedId)) return

        //   log_removeEvent({
        //     activityId: syncedId,
        //     event: syncedEvent,
        //     calendarId: calendar.id,
        //   })
        //   // removeEvent({
        //   //   activityId: syncedId,
        //   //   event: syncedEvent,
        //   //   calendarId: calendar.id,
        //   // })
        // }));
      }

      console.log('days done')

      function wait(x) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(x)
          }, 500)
        })
      }
  
        // await Promise.all(agent.schedule.map(async day => {
  
        //   await Promise.all(day.activities.map(async activity => {
        //     const activityName = activity.name
    
        //     const eventTemplate = eventTemplates[activityName] || { summary: activityName.replace(/_/g, ' ') }
        //     const newActivity = new Activity(eventTemplate, day, activity)
        //     activities.set(newActivity.id, newActivity)
    
        //     // Skip synced events
        //     if (syncedEvents.has(newActivity.id)) return

        //     // Add back removed items
        //     if (removedEvents.has(newActivity.id)) {

        //       log_restoreEvent({
        //         activityId: newActivity.id,
        //         calendarId: calendar.id,
        //       })

        //       // restoreEvent({
        //       //   activityId: newActivity.id,
        //       //   calendarId: calendar.id,
        //       // })
        //     } else {

        //       log_insertEvent({
        //         activity: newActivity,
        //         calendarId: calendar.id
        //       })
              
        //       // insertEvent({
        //       //   activity: newActivity,
        //       //   calendarId: calendar.id
        //       // })
        //     }
        //   }))

        //   await Promise.all([...syncedEvents.entries()].map(async (entry) => {
        //     let syncedId = entry[0]
        //     let syncedEvent = entry[1]
        //     if (activities.has(syncedId)) return
        //     if (removedEvents.has(syncedId)) return
  
        //     log_removeEvent({
        //       activityId: syncedId,
        //       event: syncedEvent,
        //       calendarId: calendar.id,
        //     })
        //     // removeEvent({
        //     //   activityId: syncedId,
        //     //   event: syncedEvent,
        //     //   calendarId: calendar.id,
        //     // })
            
        //   }))
          
        // }))
        


        
      } catch(err) { console.error(err) }
  
      debug(`Iteration: ${iteration++}`)
      setTimeout(sync, 60 * 1000)
    }

    sync()

    function log_insertEvent({activity, calendarId}) {
      console.log('insert event', activity.id)
    }

    function log_removeEvent({activityId, event, calendarId}) {
      console.log('remove event', activityId)
    }

    function log_restoreEvent({activityId, calendarId}) {
      console.log('restore event', activityId)
    }

    async function insertEvent({activity, calendarId}) {
      await backOff(() => gcal.insertEvent(activity, calendarId)
        .then(createdEvent => {
          const event = createdEvent.data
          const id = event.id
          debug(`added: ${id}`)
          syncedEvents.set(id, event)
        })
        .catch(err => {
          if (err.code == 409) {
            const event = JSON.parse(err.config.body)
            const id = event.id
            restoreEvent({
              activityId: id,
              calendarId: calendar.id
            })
          } else {
            console.error(err)
          }
        })
      )
    }

    async function removeEvent({activityId, event, calendarId}) {
      await backOff(() => gcal.removeEvent(activityId, calendarId)
        .then(() => {
          debug(`removed: ${activityId}`)
          syncedEvents.delete(activityId)
          removedEvents.set(activityId, event)
        })
        .catch(err => {
          if (err.code == 410) {
            removedEvents.set(activityId, event)
          }
          console.error(err)
        })
      )
    }

    async function restoreEvent({activityId, calendarId}) {
      let resource = {
        status: 'confirmed'
      }
      await backOff(() => gcal.patchEvent(resource, activityId, calendarId)
        .then(restoredEvent => {
          const event = restoredEvent.data
          const id = event.id
          debug(`restored: ${id}`)
          syncedEvents.set(id, event)
          removedEvents.delete(id)
        })
      )
    }

  } catch(err) { console.error(err) }

})()
