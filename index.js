const http = require('http')
const request = require('request')

function IsJsonString (str) {
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
  res.on('data', data => {
    buffer += data
    if (IsJsonString(buffer)) {
      handleData(buffer)
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

const handleData = (data) => {
  data = JSON.parse(data)

  if (data.status === 'start') {
    console.log('Get Details for ID:', data.id)
    getContainerDetails(data.id)
  } else if (data.Id) {
    console.log('Container details:', data)
    const port = data.NetworkSettings['Ports']['2448/udp'][0].HostPort
    // send endpoint to web server
    request.post(
      process.env.WEBSERVER_ADDR + '/matchserver',
      { json: { port, playerCount: 2 } },
      function (err, response, body) {
        if (err) {
          console.log(err)
        }
        console.log('POST REQ OK')
      }
    )
  }
}

const clientRequest = http.request(options, callback)
clientRequest.end()
