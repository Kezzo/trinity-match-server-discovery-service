const http = require('http')
const request = require('request')

const options = {
  socketPath: '/var/run/docker.sock',
  path: '/events'
}

const callback = res => {
  console.log(`STATUS: ${res.statusCode}`)
  res.on('data', data => handleData(data))
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
    console.log('Container Details:', data.NetworkSettings)
    // send endpoint to web server
    request.post(
      process.env.WEBSERVER_ADDR + '/matchserver',
      { json: { addr: 'localhost:2448' } },
      function (err, response, body) {
        if (err) {
          console.log(err)
        }
        console.log(response, body)
      }
    )
  }
}

const clientRequest = http.request(options, callback)
clientRequest.end()