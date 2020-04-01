'use strict'

class ManagementUnit {
  constructor(location, agents) {
		this.location = location
		this.agents = agents
	}

	setAgents(agents) {
		this.agents = agents
	}

	getAgentByOid(oid) {
		return this.agents.find(e => e.oid === oid)
	}

	getAgentById(id) {
		return this.agents.find(e => e.id === id)
	}

	getAgentByName(name) {
		return this.agents.find(e => e.name === name)
	}
	
}

module.exports = ManagementUnit