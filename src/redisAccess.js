const redis = require('redis')

module.exports = class RedisAccess {
  constructor (endpoint) {
    this.client = redis.createClient({
      host: endpoint,
      port: 6379
    })
  }
  async init () {
    this.client.on('connect', () => {
      console.log('connected to redis')
    })
    this.client.on('error', (err) => {
      console.log('Something went wrong ', err)
      throw err
    })
  }
  async get (key) {
    return new Promise((resolve, reject) => {
      this.client.GET(key, (err, data) => {
        if (err) {
          return reject(err)
        }
        return resolve(data)
      })
    })
  }
  async set (key, value, timeToLife) {
    return new Promise((resolve, reject) => {
      this.client.SET(key, value, (err, success) => {
        if (err) {
          return reject(err)
        }
        return resolve(success)
      })
    })
  }
  async del (key) {
    return new Promise((resolve, reject) => {
      this.client.DEL(key, (err, success) => {
        if (err) {
          return reject(err)
        }
        return resolve(success)
      })
    })
  }
  async listPush (list, value) {
    return new Promise((resolve, reject) => {
      this.client.LPUSH(list, value, (err, success) => {
        if (err) {
          return reject(err)
        }
        resolve(success)
      })
    })
  }
  async listPop (list) {
    return new Promise((resolve, reject) => {
      this.client.LPOP(list, (err, ele) => {
        if (err) {
          return reject(err)
        }
        resolve(ele)
      })
    })
  }
  async getlist (list) {
    return new Promise((resolve, reject) => {
      this.client.LRANGE(list, 0, -1, (err, ele) => {
        if (err) {
          return reject(err)
        }
        resolve(ele)
      })
    })
  }
  async getlistlength (list) {
    return new Promise((resolve, reject) => {
      this.client.LLEN(list, (err, length) => {
        if (err) {
          return reject(err)
        }
        resolve(length)
      })
    })
  }
}
