package main

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"time"
)

var containerMap = map[string]string{}

func main() {
	var port = os.Getenv("PORT")

	var network = *newNetwork(port)

	listenDockerEvents()
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

func listenDockerEvents() {
	cmd := exec.Command("docker", "events", "--filter", "event=start", "--format",
		"'{{json .}}'")
	bytesStream := &bytes.Buffer{}
	cmd.Stdout = bytesStream
	err := cmd.Start()
	if err != nil {
		os.Stderr.WriteString(err.Error())
	}
	ticker := time.NewTicker(time.Second)
	go func(ticker *time.Ticker) {
		for range ticker.C {
			streamString := bytesStream.String()
			var raw map[string]interface{}
			if streamString != "" {
				cleanString := streamString[1 : len(streamString)-2]
				err = json.Unmarshal([]byte(cleanString), &raw)
				if err != nil {
					log.Panic(err)
				}
				containerID, ok := raw["id"].(string)
				if ok == false {
					log.Panic("Different type expected")
				}
				if containerMap[containerID] == "" {
					containerMap[containerID] = getContainerPort(containerID)
					// Send req to web server
				}
				cmd.Stdout.Write([]byte{})
			}
		}
	}(ticker)
	cmd.Wait()
}

func getContainerPort(id string) string {
	log.Println("ID is: ", id)
	cmd := exec.Command("docker", "inspect",
		"--format='{{(index (index .NetworkSettings.Ports \"2448/udp\") 0).HostPort}}'", id)
	out, err := cmd.Output()
	if err != nil {
		log.Panic(err)
	}
	log.Println("PORT IS", string(out))
	return string(out)
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
