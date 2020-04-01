const WebClient = require('./Webclient')
const cheerio = require('cheerio')
const Day = require('../nice/Day')
const Agent = require('../nice/Agent')

class IEXClient extends WebClient {

	getAlerts() {
		return new Promise((resolve, reject) =>
			this.sendRequest({
				url: 'https://wfm.clearlink.com/agent/desktopCallback.do',
				qs: { 'poll': 'true', 'fakeId1': ''}
			})
			.then(res => {

			})
			.catch(err => {

			})
		)
	}

	getAgents() {
		return new Promise((resolve, reject) =>
		this.sendRequest({
			url: 'https://wfm.clearlink.com/agent/scheduleViewerAction.do',
			qs: { 'svtgST': 'svast' }
		})
		.then(res => {
			const $ = cheerio.load(res.body)
			const rows = $("#swsScheduleViewerTableDiv > table > tbody > tr")
			const agents = []

			rows.each((i, e) => {
				const columns = $(e).children()

				// Convert the child nodes' text to an array
				const data = columns.map((i, e) => $(e).get(0).children[0].data.trim())
				const dataArr = data.toArray()

				try {
					// Extract the OID from the schedule popup javascript method
					const tag = columns.get(0).children[1]
					const onclick = tag ? tag.attribs.onclick : ''
					const agentOid = onclick.match(/agentOid=([0-9a-f]*)/)
					dataArr[0] = agentOid ? agentOid[1] : ''
				} catch (error) { console.warn(error) }

				const agent = new Agent(dataArr)
				agents.push(agent)
			})

			if (agents.length < 1) {
				// return callback(new Error('No agents found'))
				reject(new Error('No agents returned'))
			} else {
				resolve(agents)
			}
		})
		.catch(err => {
			reject(err)
		})
		)
	}

	getSchedule({agent, date, format: viewFormat}) {
		return new Promise((resolve, reject) => {
			if (!viewFormat || (viewFormat != 'daily' && viewFormat != 'weekly')) {
				return reject(new Error('viewFormat must be either "daily" or "weekly"'))
			}

		const val = e => e ? e.attribs.value : null
		
		date = new Date(date)
		let startDay = date.getYear() + ('0' + (date.getMonth()+1)).slice(-2) + ('0' + date.getDate()).slice(-2)
		
		const options = {
			url: 'https://wfm.clearlink.com/agent/launchAgentScheduleDetails.do',
			qs: { agentId: agent.id, agentOid: agent.oid, startDay, viewFormat }
		}

		this.sendRequest(options)
		.then(res => {

			let $ = cheerio.load(res.body)
			let rows = $("#scheduleDetailTableDiv > table > tbody > tr")
			
			let schedule = []
			let day

			rows.each((i, e) => {
				let dateStr, startTime, endTime, schedOid

				// Skip the header
				if (e.attribs.class == "schedTableHdr") return
				let tdElems = e.childNodes.filter(e => e.name == "td")
				let inputElems = e.childNodes.filter(e => e.name == "input")
				
				if (inputElems.length > 0) {
					dateStr = val(inputElems[0])
					startTime = val(inputElems[1])
					endTime = val(inputElems[2])
					schedOid = val(inputElems[5])

					day = new Day({dateStr, startTime, endTime, schedOid})
					schedule.push(day)
				}

				let note = undefined
				// if (tdElems[2] && tdElems[2].childNodes[2]) {
				// 	note = tdElems[2].childNodes[2].attribs.value
				// }
				let name =	tdElems[3] ? tdElems[3].childNodes[2].data.trim() : null
				let start =	tdElems[4] ? tdElems[4].firstChild.data.trim() : null
				let end	=		tdElems[5] ? tdElems[5].firstChild.data.trim() : null

				if (name) day.activities.push({name, start, end, note})
			})

			return resolve(schedule)
		})
		.catch(err => reject(err))
	})}
	
	async testActivities() {
		return new Promise((resolve, reject) => {
			const options = {
				url: 'http://localhost:3000/activities'
			}

			this.sendRequest(options, (err, res, body) => {
				if (err) return reject(err)

				resolve(body)
			})
		})
	}

	navigateHome(callback) {
		this.sendRequest({
			url: 'https://wfm.clearlink.com/agent/buildDesktopAction.do'
		}, callback)
	}
}

module.exports = IEXClient