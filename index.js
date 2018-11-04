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
  let buffer
  console.log(`STATUS: ${res.statusCode}`)
  res.on('data', data => {
    buffer += data
    if (IsJsonString(data)) {
      console.log(data + '')
      handleData(data)
      buffer = ''
    } else if (IsJsonString(buffer)) {
      console.log(buffer + '')
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
    const port = data.NetworkSettings['Ports']
    // TODO: Get infos from json
    console.log(port, Object.keys(port),
      Object.keys(data.NetworkSettings))
    // send endpoint to web server
    request.post(
      process.env.WEBSERVER_ADDR + '/matchserver',
      { json: { addr: 'localhost:2448' } },
      function (err, response, body) {
        if (err) {
          console.log(err)
        }
        console.log('POST REQ OK')
        // console.log(response, body)
      }
    )
  }
}

const clientRequest = http.request(options, callback)
clientRequest.end()
