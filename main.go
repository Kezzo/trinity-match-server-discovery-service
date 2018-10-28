package main

import (
	"bytes"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

func main() {
	var port = os.Getenv("PORT")

	var network = *newNetwork(port)

	go network.listenUDP()
	go network.sendByteResponse()
	go processMessages(&network)

	// run forever
	ticker := time.NewTicker(time.Millisecond * 100)
	defer ticker.Stop()
	for {
		<-ticker.C
	}
}

func processMessages(network *Network) {
	var webserverAddr = os.Getenv("WEBSERVER_ADDR")
	hc := http.Client{}

	for v := range network.recvCh {
		if v.buffer[0] == 254 {
			var address = v.addr.String()
			buf := make([]byte, 2)
			buf[0] = 255

			log.Println("Received matchserver registration message from: ", address)

			data := url.Values{}
			data.Add("addr", address)

			var jsonStr = []byte(`{"addr":"` + address + `"}`)
			req, err := http.NewRequest("POST", webserverAddr+"/matchserver", bytes.NewBuffer(jsonStr))
			req.Header.Set("Content-Type", "application/json")

			if err != nil {
				log.Println("Error creating request: ", err)
			}

			resp, err := hc.Do(req)

			if err != nil {
				log.Println("Received error response from: ", webserverAddr)
			}

			defer resp.Body.Close()
			body, err := ioutil.ReadAll(resp.Body)

			buf[1] = body[0]
			network.sendCh <- &OutPkt{network.connection,
				v.addr, buf}
		}
	}
}
