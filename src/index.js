const http = require('http')
const request = require('request')

const RedisAccess = require('./redisAccess')
const redisAcccess = new RedisAccess(process.env.REDIS_ENDPOINT)

const IsJsonString = str => {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

const options = {
  socketPath: '/var/run/docker.sock',
  path: '/events'
}

const callback = res => {
  let buffer = ''
  console.log(`STATUS: ${res.statusCode}`)
  res.on('data', async data => {
    buffer += data
    if (IsJsonString(buffer)) {
      await handleData(buffer)
      buffer = ''
    }
  })
  res.on('end', data => console.log('END', data))
  res.on('error', data => console.error('ERROR', data))
}
const getContainerDetails = (id) => {
  const options = {
    socketPath: '/var/run/docker.sock',
    path: '/containers/' + id + '/json'
  }
  const request = http.request(options, callback)
  request.end()
}

const handleData = async (data) => {
  data = JSON.parse(data)
  // console.log('EVENT', JSON.stringify(data.Config, null, 2))
  if (data.status === 'start') {
    console.log('Get Details for ID:', data.id)
    getContainerDetails(data.id)
  } else if (data.Id && data.Config.Cmd[0] === '/main') {
    console.log('Container details:', JSON.stringify(data.NetworkSettings, null, 2))
    const containerId = data.Id
    const port = (process.env.LOCAL ? '2448' : data.NetworkSettings['Ports']['2448/udp'][0].HostPort)
    const tcpPort = (process.env.LOCAL ? '8888' : data.NetworkSettings['Ports']['8888/tcp'][0].HostPort)
    const addr = await getHostIP()
    // send endpoint to redis
    console.log('matchserver added:', containerId)
    await redisAcccess.set(data.Id, true).catch(err =>
      console.log(err)
    )
    console.log(addr, port, containerId)
    await addMatch(addr, port, tcpPort, containerId).catch(err =>
      console.log(err)
    )
  } else if (data.status === 'die') {
    // remove server
    console.log(data)
    console.log('server died, delete matchserver:', data.id)
    await redisAcccess.del(data.id).catch(err =>
      console.log(err)
    )
  }
}

const getHostIP = () =>
  new Promise((resolve, reject) => {
    if (process.env.LOCAL === 'true') {
      return resolve('http://localhost')
    } else {
      request.get('http://169.254.169.254/latest/meta-data/public-ipv4', (err, resp) => {
        if (err) {
          console.log(err)
          return reject(err)
        }
        // console.log('GET Host meta', resp.body)
        return resolve(resp.body)
      })
    }
  })

const getPrivateIP = () =>
  new Promise((resolve, reject) => {
    if (process.env.LOCAL === 'true') {
      return resolve('http://localhost')
    } else {
      request.get('http://169.254.169.254/latest/meta-data/local-ipv4', (err, resp) => {
        if (err) {
          console.log(err)
          return reject(err)
        }
        // console.log('GET Host meta', resp.body)
        return resolve('http://' + resp.body)
      })
    }
  })
const matchServerPlayerCount = async (num, addr, port) => {
  return new Promise((resolve, reject) => {
    const url = addr + ':' + port + '/?playerCount=' + num
    const options = {
      method: 'GET',
      url
    }
    console.log('OPTS:', options)
    request(options, (err, resp) => {
      if (err) {
        console.log(err)
        reject(err)
      }
      // console.log('RESP', resp)
      resolve()
    })
  })
}

const addMatch = (addr, port, tcpPort, containerId) =>
  new Promise(async (resolve, reject) => {
    try {
      const availableServers = await Promise.all(
        [redisAcccess.getlistlength(1 + 'player'),
          redisAcccess.getlistlength(2 + 'player')])
      console.log('Found ', availableServers[0] + ' 1-player-servers and ',
        availableServers[1], ' 2-player-servers')
      const requiredPlayerCount = availableServers[0] < availableServers[1] ? 1 : 2
      const privateEndpoint = await getPrivateIP()
      matchServerPlayerCount(requiredPlayerCount, privateEndpoint, tcpPort)
      const listPushsToAwait = []
      for (let i = requiredPlayerCount; i > 0; i--) {
        console.log('PUSH', requiredPlayerCount + 'player', addr + ':' + port)
        listPushsToAwait.push(
          redisAcccess.listPush(requiredPlayerCount + 'player', addr + ':' + port + '@' + containerId)
        )
      }
      await Promise.all(listPushsToAwait)
      resolve()
    } catch (err) {
      reject(err)
    }
  })

const clientRequest = http.request(options, callback)
clientRequest.end()
