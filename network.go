package main

import (
	"log"
	"net"
)

// RcvPkt is received by ListenUDP
type RcvPkt struct {
	connection *net.UDPConn
	addr       net.Addr
	buffer     []byte
}

// OutPkt ...
type OutPkt struct {
	connection net.PacketConn
	addr       net.Addr
	buffer     []byte
}

// Network ...
type Network struct {
	recvCh     chan *RcvPkt
	sendCh     chan *OutPkt
	Port       string
	connection *net.UDPConn
}

func newNetwork(port string) *Network {
	return &Network{
		recvCh: make(chan *RcvPkt),
		sendCh: make(chan *OutPkt),
		Port:   port,
	}
}

func (n *Network) sendByteResponse() {
	for v := range n.sendCh {
		if _, err := v.connection.WriteTo(v.buffer, v.addr); err != nil {
			log.Fatalln("err sending data for msgID :", v.buffer[0], err)
		}
	}
}

func (n *Network) listenUDP() {
	udpAddr, err := net.ResolveUDPAddr("udp", n.Port)
	if err != nil {
		panic(err)
	}
	network := "udp"
	pc, err := net.ListenUDP(network, udpAddr)
	// temp solution
	n.connection = pc
	if err != nil {
		panic(err)
	}
	log.Printf("listening on (%s)%s\n", network, pc.LocalAddr())

	n.Port = pc.LocalAddr().String()
	defer pc.Close()
	buf := make([]byte, 1024)
	for {

		num, addr, err := pc.ReadFrom(buf)
		// log.Println("Received buffer ", buf[:num], " from ", addr)
		if err != nil {
			log.Print("Error: ", err)
			continue
		}

		if num > 0 {
			n.recvCh <- &RcvPkt{pc, addr, buf[:num]}
			buf = make([]byte, 1024)
		}
	}
}
